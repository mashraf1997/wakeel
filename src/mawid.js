// Mawid integration: when the business takes bookings on its Mawid page, Wakeel
// reads its services, checks real free times and books straight into Mawid.
// Uses Mawid's public booking API; no keys needed.

const CACHE_MS = 10 * 60_000;
const cache = new Map(); // url -> { at, services, currency }

const base = (url) => String(url || '').trim().replace(/\/+$/, '');
const hm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const toMin = (t) => { const m = String(t || '').match(/^(\d{1,2}):(\d{2})$/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };

export async function mawidServices(url, { fresh = false } = {}) {
  const hit = cache.get(url);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return hit;
  const res = await fetch(base(url) + '/', { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Mawid answered HTTP ${res.status}`);
  const html = await res.text();
  const m = html.match(/window\.MAWID=(\{[\s\S]*?\});<\/script>/);
  if (!m) throw new Error('This page does not look like a Mawid booking page');
  const d = JSON.parse(m[1]);
  const out = { at: Date.now(), services: (d.services || []).map((s) => ({ id: String(s.id), name: s.name, duration: s.duration, price: s.price, description: s.description || '' })), currency: d.shop?.currency || d.settings?.currency || '' };
  cache.set(url, out);
  return out;
}

const norm = (s) => String(s || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim();
const words = (s) => norm(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean).map((w) => w.replace(/^(ال|وال|بال)(?=\p{L}{2,})/u, ''));
export function findService(services, name) {
  const n = norm(name);
  const exact = services.find((s) => norm(s.name) === n);
  if (exact) return exact;
  // best word overlap, so "قص الشعر" finds "قص شعر"
  const q = words(name);
  let best = null, score = 0;
  for (const s of services) {
    const w = words(s.name);
    const hit = q.filter((x) => w.some((y) => y === x || (x.length >= 3 && (y.startsWith(x) || x.startsWith(y))))).length;
    if (hit > score) { best = s; score = hit; }
  }
  return best || (services.length === 1 ? services[0] : null);
}

export async function mawidSlots(url, serviceId, date) {
  const res = await fetch(`${base(url)}/api/slots?service=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}`, { signal: AbortSignal.timeout(20_000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { code: data.error });
  return (data.slots || []).map((s) => hm(s.start));
}

export async function mawidBook(url, { serviceId, date, time, name, phone, notes }) {
  const res = await fetch(`${base(url)}/api/bookings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-mawid': '1' },
    body: JSON.stringify({ serviceId, date, start: toMin(time), customer: { name, phone, notes } }),
    signal: AbortSignal.timeout(20_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { code: data.error || 'mawid_error' });
  return data; // { no, status, deposit, paymentInfo, manageUrl, ... }
}

export function mawidText(info) {
  if (!info?.services?.length) return '';
  return info.services.map((s) => `- ${s.name} — ${s.duration} min${s.price ? ` — ${s.price} ${info.currency}` : ''}${s.description ? ` — ${s.description}` : ''}`).join('\n');
}
