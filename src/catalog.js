// Keeps the assistant's product list in sync with the shop the business
// already runs: Dukkan, WooCommerce (Store API) or Shopify (products.json).
// None of these need API keys.

const MAX_PRODUCTS = 2000;

const stripHtml = (html) =>
  String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);

const base = (url) => String(url || '').trim().replace(/\/+$/, '');

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${url} answered HTTP ${res.status}`);
  return res.json();
}

// ---------- Dukkan ----------
export async function fetchDukkan(url) {
  const res = await fetch(base(url) + '/', { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Dukkan answered HTTP ${res.status}`);
  const html = await res.text();
  const m = html.match(/window\.DUKKAN=(\{[\s\S]*?\});<\/script>/);
  if (!m) throw new Error('This page does not look like a Dukkan store');
  const data = JSON.parse(m[1]);
  return {
    shop: {
      name: data.shop?.name || '',
      currency: data.shop?.currency || '',
      deliveryFee: data.shop?.deliveryFee || 0,
      freeDeliveryOver: data.shop?.freeDeliveryOver || 0,
      minOrder: data.shop?.minOrder || 0,
      methods: data.shop?.methods || [],
      acceptingOrders: data.shop?.acceptingOrders !== false,
    },
    products: (data.products || []).slice(0, MAX_PRODUCTS).map((p) => ({
      id: String(p.id),
      name: p.name,
      description: p.description || '',
      price: p.price,
      variants: (p.variants || []).map((v) => ({ name: v.name, price: v.price })),
      available: p.available !== false,
    })),
  };
}

/** Places an order in Dukkan. Dukkan validates and prices it from its own catalog. */
export async function createDukkanOrder(url, order) {
  const res = await fetch(base(url) + '/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-dukkan': '1' },
    body: JSON.stringify(order),
    signal: AbortSignal.timeout(20_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.code = data.error || 'dukkan_error';
    throw err;
  }
  return data; // { no, total, whatsappUrl }
}

// ---------- WooCommerce (Store API, public) ----------
export async function fetchWooCommerce(url) {
  const products = [];
  let currency = '';
  for (let page = 1; page <= 20 && products.length < MAX_PRODUCTS; page++) {
    const list = await getJson(`${base(url)}/wp-json/wc/store/v1/products?per_page=100&page=${page}`);
    if (!Array.isArray(list) || !list.length) break;
    for (const p of list) {
      const minor = Number(p.prices?.currency_minor_unit ?? 2);
      const price = Number(p.prices?.price || 0) / 10 ** minor;
      currency = currency || p.prices?.currency_code || '';
      products.push({
        id: String(p.id),
        name: stripHtml(p.name),
        description: stripHtml(p.short_description || p.description),
        price,
        variants: [],
        available: p.is_in_stock !== false && p.is_purchasable !== false,
        url: p.permalink || '',
      });
    }
    if (list.length < 100) break;
  }
  return { shop: { currency }, products };
}

// ---------- Shopify (public products.json) ----------
export async function fetchShopify(url) {
  const products = [];
  for (let page = 1; page <= 10 && products.length < MAX_PRODUCTS; page++) {
    const data = await getJson(`${base(url)}/products.json?limit=250&page=${page}`);
    const list = data.products || [];
    if (!list.length) break;
    for (const p of list) {
      const variants = (p.variants || []).filter((v) => v.title !== 'Default Title');
      products.push({
        id: String(p.id),
        name: p.title,
        description: stripHtml(p.body_html),
        price: Number(p.variants?.[0]?.price || 0),
        variants: variants.map((v) => ({ name: v.title, price: Number(v.price), available: v.available !== false })),
        available: (p.variants || []).some((v) => v.available !== false),
        url: `${base(url)}/products/${p.handle}`,
      });
    }
    if (list.length < 250) break;
  }
  return { shop: {}, products };
}

const FETCHERS = { dukkan: fetchDukkan, woocommerce: fetchWooCommerce, shopify: fetchShopify };

export async function syncCatalog(store) {
  const cfg = store.data.settings.catalog;
  const target = store.data.catalog;
  if (!FETCHERS[cfg.source] || !cfg.url) {
    store.data.catalog = { products: [], shop: null, syncedAt: null, error: null };
    store.save();
    return store.data.catalog;
  }
  try {
    const { shop, products } = await FETCHERS[cfg.source](cfg.url);
    store.data.catalog = { products, shop, syncedAt: new Date().toISOString(), error: null, source: cfg.source };
  } catch (err) {
    target.error = err.message;
    target.errorAt = new Date().toISOString();
  }
  store.save();
  return store.data.catalog;
}

/** Text block for the system prompt. */
export function catalogText(store) {
  const { products, shop, source } = store.data.catalog;
  if (!products?.length) return '';
  const cur = shop?.currency || store.data.profile.currency || '';
  const money = (n) => (cur ? `${n} ${cur}` : String(n));
  const lines = products.map((p) => {
    const price = p.variants?.length ? p.variants.map((v) => `${v.name}: ${money(v.price)}`).join(', ') : money(p.price);
    return `- ${p.name} — ${price}${p.available ? '' : ' (OUT OF STOCK)'}${p.description ? ` — ${p.description}` : ''} [id:${p.id}]`;
  });
  const extra = [];
  if (source === 'dukkan' && shop) {
    if (shop.methods?.length) extra.push(`Order types: ${shop.methods.join(', ')}`);
    if (shop.deliveryFee) extra.push(`Delivery fee: ${money(shop.deliveryFee)}${shop.freeDeliveryOver ? ` (free over ${money(shop.freeDeliveryOver)})` : ''}`);
    if (shop.minOrder) extra.push(`Minimum order: ${money(shop.minOrder)}`);
    if (shop.acceptingOrders === false) extra.push('The shop is NOT accepting orders right now.');
  }
  return [...extra, ...lines].join('\n');
}

export function findProduct(store, { product_id, name }) {
  const products = store.data.catalog.products || [];
  if (product_id) {
    const p = products.find((x) => x.id === String(product_id));
    if (p) return p;
  }
  const n = String(name || '').trim().toLowerCase();
  return products.find((x) => x.name.toLowerCase() === n) || products.find((x) => n && x.name.toLowerCase().includes(n));
}
