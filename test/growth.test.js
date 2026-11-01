import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createApp } from '../src/app.js';
import { parseRating } from '../src/agent.js';

function fake(route) {
  const calls = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString();
    let body = raw;
    try { body = JSON.parse(raw); } catch { /* form or empty */ }
    const call = { method: req.method, url: req.url, headers: req.headers, body, raw };
    calls.push(call);
    const out = (await route(call)) || { status: 404, body: {} };
    res.writeHead(out.status || 200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(out.body));
  });
  return new Promise((r) => server.listen(0, () => r({ server, calls, url: `http://127.0.0.1:${server.address().port}` })));
}

let llm, stripe, paymob, hook, app, base, owner, dataDir;

before(async () => {
  llm = await fake(({ body }) => {
    const sys = body.messages[0].content;
    if (sys.includes('## Task')) return { body: { choices: [{ message: { role: 'assistant', content: 'FOLLOWUP: still thinking about the cake?' } }] } };
    return { body: { choices: [{ message: { role: 'assistant', content: 'AI REPLY' } }] } };
  });
  stripe = await fake(({ url, raw }) => (url === '/v1/checkout/sessions' ? { body: { id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1', raw } } : null));
  paymob = await fake(({ url }) => (url === '/v1/intention/' ? { body: { id: 9, client_secret: 'egy_csk_1' } } : null));
  hook = await fake(() => ({ body: { ok: true } }));
  process.env.STRIPE_API_URL = stripe.url;
  process.env.PAYMOB_API_URL = paymob.url;
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wakeel-g-'));
  app = createApp({ dataDir, env: {} });
  base = `http://127.0.0.1:${await app.start(0)}`;
  const r = await call('/api/setup', { method: 'POST', body: { password: 'owner-pass-1', businessName: 'Sweet Cakes' } });
  owner = r.headers.get('set-cookie').split(';')[0];
  Object.assign(app.store.data.settings.ai, { provider: 'openai', model: 'm', baseUrl: llm.url });
  app.store.data.settings.notify.webhookUrl = hook.url + '/hook';
});

after(async () => {
  await app.stop();
  for (const f of [llm, stripe, paymob, hook]) f.server.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

async function call(p, { method = 'GET', body, headers = {}, jar = owner } = {}) {
  const res = await fetch(base + p, {
    method,
    headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(jar ? { cookie: jar } : {}), ...headers },
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json, headers: res.headers };
}
const waitFor = async (fn, ms = 2000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { const v = fn(); if (v) return v; await new Promise((r) => setTimeout(r, 20)); }
  return fn();
};

test('questions without answers are collected and turned into FAQ entries', async () => {
  const conv = app.store.getOrCreateConversation('web', 'visitor-gap-1', '');
  await app.agent.executeTool(conv, 'report_missing_info', { question: 'Do you have sugar-free cakes?' });
  await app.agent.executeTool(conv, 'report_missing_info', { question: 'do you have sugar free cakes' });
  let r = await call('/api/gaps');
  assert.equal(r.body.gaps.length, 1);
  assert.equal(r.body.gaps[0].count, 2);
  r = await call('/api/gaps/' + r.body.gaps[0].id, { method: 'POST', body: { answer: 'Yes, on order, 2 days ahead.' } });
  assert.equal(r.status, 200);
  const faq = app.store.data.knowledge.find((k) => k.faq);
  assert.match(faq.text, /Q: Do you have sugar-free cakes\?\nA: Yes, on order/);
  r = await call('/api/gaps');
  assert.equal(r.body.gaps.length, 0);
});

test('rating replies are understood in Arabic and English', () => {
  assert.equal(parseRating('5'), 5);
  assert.equal(parseRating('٤'), 4);
  assert.equal(parseRating('⭐⭐⭐'), 3);
  assert.equal(parseRating('3/5'), 3);
  assert.equal(parseRating('5 cakes please'), null);
  assert.equal(parseRating('7'), null);
});

test('after an order is done the customer is asked to rate it', async () => {
  const conv = app.store.getOrCreateConversation('web', 'visitor-rate-1', 'Lina');
  app.store.addMessage(conv, 'customer', 'one chocolate cake');
  const res = await app.agent.executeTool(conv, 'create_order', { items: [{ name: 'Chocolate cake', quantity: 1 }] });
  let r = await call('/api/requests/' + res.reference, { method: 'PATCH', body: { status: 'done' } });
  assert.equal(r.status, 200);
  assert.ok(conv.awaitingRating);
  assert.match(conv.messages.at(-1).text, /1 to 5/);
  const before = llm.calls.length;
  r = await call('/api/widget/messages', { method: 'POST', jar: '', body: { visitor: 'visitor-rate-1', text: '2' } });
  assert.match(r.body.reply, /honest/);
  assert.equal(llm.calls.length, before, 'ratings do not go to the model');
  assert.deepEqual(app.store.data.ratings.map((x) => x.score), [2]);
  const alert = await waitFor(() => hook.calls.find((c) => c.body?.event === 'lowRating'));
  assert.ok(alert, 'owner alerted about a low rating');
  r = await call('/api/overview');
  assert.deepEqual(r.body.rating, { avg: 2, count: 1 });
});

test('follow-ups are sent once, and skipped when the customer already replied', async () => {
  const conv = app.store.getOrCreateConversation('web', 'visitor-fu-1', 'Omar');
  app.store.addMessage(conv, 'customer', 'how much is the wedding cake? I will think about it');
  await app.agent.executeTool(conv, 'schedule_followup', { after_hours: 2, note: 'wedding cake price' });
  const conv2 = app.store.getOrCreateConversation('web', 'visitor-fu-2', 'Mai');
  app.store.addMessage(conv2, 'customer', 'maybe later');
  await app.agent.executeTool(conv2, 'schedule_followup', { after_hours: 2, note: 'x' });
  // Mai writes again, which cancels her follow-up
  await app.agent.handleIncoming({ channel: 'web', externalId: 'visitor-fu-2', text: 'ok I want it' });

  await app.root.runScheduled(Date.now() + 60_000);
  assert.ok(!conv.messages.some((m) => m.followup), 'not due yet');
  await app.root.runScheduled(Date.now() + 2.1 * 3600e3);
  const sent = conv.messages.filter((m) => m.followup);
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /FOLLOWUP/);
  assert.ok(!conv2.messages.some((m) => m.followup));
  await app.root.runScheduled(Date.now() + 5 * 3600e3);
  assert.equal(conv.messages.filter((m) => m.followup).length, 1, 'only once');
});

test('WhatsApp follow-ups respect the 24-hour window', async () => {
  const d = app.store.data;
  const conv = app.store.getOrCreateConversation('whatsapp', '2010', 'Ali');
  const m = app.store.addMessage(conv, 'customer', 'price?');
  m.at = new Date(Date.now() - 22 * 3600e3).toISOString();
  d.followups.push({ id: 'f1', conversationId: conv.id, dueAt: new Date().toISOString(), note: 'x', status: 'scheduled', createdAt: new Date(Date.now() - 23 * 3600e3).toISOString() });
  await app.root.runScheduled(Date.now() + 2 * 3600e3);
  assert.equal(d.followups.find((f) => f.id === 'f1').status, 'skipped');
});

test('daily summary goes out once at the chosen hour', async () => {
  const d = app.store.data;
  d.settings.calendar.timezone = 'UTC';
  const now = Date.now();
  d.settings.summary.hour = new Date(now).getUTCHours();
  d.settings.summary.lastSentDate = '';
  hook.calls.length = 0;
  await app.root.runScheduled(now);
  await app.root.runScheduled(now + 1000);
  const sums = hook.calls.filter((c) => c.body?.event === 'summary');
  assert.equal(sums.length, 1);
  assert.match(sums[0].body.text, /Daily summary/);
  assert.ok(sums[0].body.stats.orders >= 1);
});

test('Stripe: payment link, verified webhook marks the order paid', async () => {
  await call('/api/settings', { method: 'PUT', body: { settings: { payments: { provider: 'stripe', currency: 'usd', stripeSecretKey: 'sk_test_x', stripeWebhookSecret: 'whsec_x' } } } });
  const conv = app.store.getOrCreateConversation('web', 'visitor-pay-1', 'Sara');
  const order = await app.agent.executeTool(conv, 'create_order', { items: [{ name: 'Cupcakes', quantity: 6 }] });
  const r0 = app.store.data.requests.find((x) => x.id === order.reference);
  r0.total = 18.5;
  const link = await app.agent.executeTool(conv, 'create_payment_link', { reference: order.reference });
  assert.equal(link.url, 'https://checkout.stripe.com/c/pay/cs_test_1');
  const form = new URLSearchParams(stripe.calls.at(-1).raw);
  assert.equal(form.get('line_items[0][price_data][unit_amount]'), '1850');
  assert.equal(form.get('metadata[reference]'), order.reference);
  assert.equal(stripe.calls.at(-1).headers.authorization, 'Bearer sk_test_x');

  const event = JSON.stringify({ type: 'checkout.session.completed', data: { object: { metadata: { reference: order.reference }, payment_status: 'paid' } } });
  let res = await call('/webhooks/stripe', { method: 'POST', jar: '', body: event, headers: { 'stripe-signature': 't=1,v1=bad' } });
  assert.equal(res.status, 400);
  const t = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac('sha256', 'whsec_x').update(`${t}.${event}`).digest('hex');
  res = await call('/webhooks/stripe', { method: 'POST', jar: '', body: event, headers: { 'stripe-signature': `t=${t},v1=${sig}` } });
  assert.equal(res.status, 200);
  assert.equal(r0.payment.status, 'paid');
  assert.match(conv.messages.at(-1).text, /Payment received/);
  assert.ok(await waitFor(() => hook.calls.find((c) => c.body?.event === 'payment')));
});

test('Paymob: unified checkout link', async () => {
  await call('/api/settings', { method: 'PUT', body: { settings: { payments: { provider: 'paymob', currency: 'EGP', paymobSecretKey: 'egy_sk_x', paymobPublicKey: 'egy_pk_x', paymobIntegrationIds: '111, 222' } } } });
  const conv = app.store.getOrCreateConversation('web', 'visitor-pay-2', 'Hany Adel');
  const order = await app.agent.executeTool(conv, 'create_order', { items: [{ name: 'Tart', quantity: 1 }], phone: '0100' });
  app.store.data.requests.find((x) => x.id === order.reference).total = 250;
  const link = await app.agent.executeTool(conv, 'create_payment_link', { reference: order.reference });
  assert.equal(link.url, `${paymob.url}/unifiedcheckout/?publicKey=egy_pk_x&clientSecret=egy_csk_1`);
  const sent = paymob.calls.at(-1);
  assert.equal(sent.headers.authorization, 'Token egy_sk_x');
  assert.equal(sent.body.amount, 25000);
  assert.deepEqual(sent.body.payment_methods, [111, 222]);
  assert.equal(sent.body.billing_data.last_name, 'Adel');
  // owner can mark paid by hand
  const r = await call('/api/requests/' + order.reference, { method: 'PATCH', body: { action: 'markPaid' } });
  assert.equal(r.body.request.payment.status, 'paid');
});

test('team: staff log in with a username and only see the inbox and orders', async () => {
  let r = await call('/api/users', { method: 'POST', body: { name: 'Nada', username: 'nada', password: 'staff-pass-1' } });
  assert.equal(r.status, 200);
  const id = r.body.user.id;
  r = await call('/api/login', { method: 'POST', jar: '', body: { username: 'nada', password: 'wrong-pass' } });
  assert.equal(r.status, 401);
  r = await call('/api/login', { method: 'POST', jar: '', body: { username: 'NADA', password: 'staff-pass-1' } });
  const staff = r.headers.get('set-cookie').split(';')[0];
  r = await call('/api/session', { jar: staff });
  assert.equal(r.body.role, 'agent');
  assert.equal(r.body.userName, 'Nada');
  assert.equal((await call('/api/conversations', { jar: staff })).status, 200);
  assert.equal((await call('/api/requests', { jar: staff })).status, 200);
  assert.equal((await call('/api/settings', { jar: staff })).status, 403);
  assert.equal((await call('/api/users', { jar: staff })).status, 403);
  r = await call('/api/conversations/' + encodeURIComponent('web:visitor-pay-1') + '/reply', { method: 'POST', jar: staff, body: { text: 'Hi, Nada here' } });
  assert.equal(r.status, 200);
  assert.equal(app.store.data.conversations['web:visitor-pay-1'].messages.at(-1).by, 'Nada');
  // staff can change their own password
  r = await call('/api/me/password', { method: 'POST', jar: staff, body: { current: 'staff-pass-1', next: 'staff-pass-2' } });
  assert.equal(r.status, 200);
  const staff2 = r.headers.get('set-cookie').split(';')[0];
  assert.equal((await call('/api/conversations', { jar: staff })).status, 401, 'old session ends after a password change');
  // removing the user ends their session
  await call('/api/users/' + id, { method: 'DELETE', body: {} });
  assert.equal((await call('/api/conversations', { jar: staff2 })).status, 401);
});
