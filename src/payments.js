// Payment links for orders: Stripe Checkout (with a verified webhook that
// marks orders paid) and Paymob Unified Checkout (Egypt and the Gulf).
import crypto from 'node:crypto';

const STRIPE = () => process.env.STRIPE_API_URL || 'https://api.stripe.com';
const PAYMOB = () => process.env.PAYMOB_API_URL || 'https://accept.paymob.com';

// Currencies without minor units in Stripe's list (subset that matters here).
const ZERO_DECIMAL = new Set(['jpy', 'krw', 'vnd', 'clp', 'xof', 'xaf', 'ugx', 'rwf']);

export function paymentsReady(cfg) {
  if (cfg.provider === 'stripe') return Boolean(cfg.stripeSecretKey && cfg.currency);
  if (cfg.provider === 'paymob') return Boolean(cfg.paymobSecretKey && cfg.paymobPublicKey && cfg.paymobIntegrationIds && cfg.currency);
  return false;
}

const minor = (amount, currency) => Math.round(Number(amount) * (ZERO_DECIMAL.has(currency.toLowerCase()) ? 1 : 100));

export async function createPaymentLink(cfg, request, { businessName, publicUrl }) {
  if (!(Number(request.total) > 0)) {
    const err = new Error('This order has no total yet');
    err.code = 'no_total';
    throw err;
  }
  const currency = cfg.currency.toLowerCase();
  const name = `${businessName || 'Order'} · ${request.id}`;

  if (cfg.provider === 'stripe') {
    const form = new URLSearchParams({
      mode: 'payment',
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': currency,
      'line_items[0][price_data][unit_amount]': String(minor(request.total, currency)),
      'line_items[0][price_data][product_data][name]': name,
      'metadata[reference]': request.id,
      client_reference_id: request.id,
      success_url: `${publicUrl || 'https://example.com'}/paid.html?ref=${request.id}`,
    });
    const res = await fetch(`${STRIPE()}/v1/checkout/sessions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${cfg.stripeSecretKey}`, 'content-type': 'application/x-www-form-urlencoded' },
      body: form,
      signal: AbortSignal.timeout(20_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error?.message || `Stripe answered HTTP ${res.status}`);
    return { provider: 'stripe', id: data.id, url: data.url, status: 'pending', createdAt: new Date().toISOString() };
  }

  if (cfg.provider === 'paymob') {
    const [first, ...rest] = String(request.customerName || 'Customer').split(' ');
    const amount = minor(request.total, currency);
    const res = await fetch(`${PAYMOB()}/v1/intention/`, {
      method: 'POST',
      headers: { authorization: `Token ${cfg.paymobSecretKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        amount,
        currency: cfg.currency.toUpperCase(),
        payment_methods: String(cfg.paymobIntegrationIds).split(',').map((x) => Number(x.trim())).filter(Boolean),
        items: [{ name, amount, quantity: 1 }],
        billing_data: { first_name: first || 'Customer', last_name: rest.join(' ') || 'NA', phone_number: request.phone || 'NA', email: 'NA' },
        special_reference: `${request.id}-${Date.now()}`,
        ...(publicUrl ? { redirection_url: `${publicUrl}/paid.html?ref=${request.id}` } : {}),
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.client_secret) throw new Error(data.detail || data.message || `Paymob answered HTTP ${res.status}`);
    const url = `${PAYMOB()}/unifiedcheckout/?publicKey=${encodeURIComponent(cfg.paymobPublicKey)}&clientSecret=${encodeURIComponent(data.client_secret)}`;
    return { provider: 'paymob', id: String(data.id || ''), url, status: 'pending', createdAt: new Date().toISOString() };
  }
  throw new Error('Online payments are not set up');
}

/** Verifies a Stripe webhook (Stripe-Signature: t=...,v1=...). Returns the event or null. */
export function verifyStripeEvent(rawBody, header, secret, toleranceSec = 300) {
  if (!secret || !header) return null;
  const parts = Object.fromEntries(String(header).split(',').map((kv) => kv.split('=')).filter((p) => p.length === 2).map(([k, v]) => [k.trim(), v.trim()]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > toleranceSec) return null;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  const sigs = String(header).split(',').filter((p) => p.trim().startsWith('v1=')).map((p) => p.trim().slice(3));
  const ok = sigs.some((s) => s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
  if (!ok) return null;
  try {
    return JSON.parse(rawBody.toString('utf8'));
  } catch {
    return null;
  }
}
