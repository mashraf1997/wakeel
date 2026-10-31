import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseIcs, busyIntervals, zonedToUtc } from '../src/calendar.js';

// A tiny PNG (1x1) used as a "photo"
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

// Generic fake upstream: route(req, body, rawBody) -> { status, headers, body }
function fake(route) {
  const calls = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks);
    let body = null;
    if ((req.headers['content-type'] || '').includes('application/json') && raw.length) body = JSON.parse(raw.toString());
    const call = { method: req.method, url: req.url, headers: req.headers, body, raw };
    calls.push(call);
    const out = (await route(call)) || { status: 404, body: { error: 'no route' } };
    const payload = Buffer.isBuffer(out.body) ? out.body : typeof out.body === 'string' ? out.body : JSON.stringify(out.body);
    res.writeHead(out.status || 200, { 'content-type': out.type || (typeof out.body === 'object' && !Buffer.isBuffer(out.body) ? 'application/json' : 'text/plain'), ...(out.headers || {}) });
    res.end(payload);
  });
  return new Promise((r) => server.listen(0, () => r({ server, calls, url: `http://127.0.0.1:${server.address().port}` })));
}

const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
const ymd = tomorrow.replace(/-/g, '');

let llm, graph, tg, stt, dukkan, woo, shopify, hook, ics, app, base, cookie, dataDir;

before(async () => {
  // OpenAI-compatible model: scripted by the last user message
  llm = await fake(({ body, url }) => {
    if (!url.endsWith('/chat/completions')) return null;
    const last = body.messages.at(-1);
    if (last.role === 'tool') return { body: { choices: [{ message: { role: 'assistant', content: 'TOOL_RESULT ' + last.content } }] } };
    const text = typeof last.content === 'string' ? last.content : last.content.map((c) => c.text || '').join(' ');
    const call = (name, args) => ({ body: { choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: 't1', type: 'function', function: { name, arguments: JSON.stringify(args) } }] } }] } });
    if (/menu please/.test(text)) return call('send_image', { name: 'menu' });
    return { body: { choices: [{ message: { role: 'assistant', content: 'ECHO: ' + text } }] } };
  });
  graph = await fake(({ url, method }) => {
    if (url === '/v23.0/MEDIA1') return { body: { url: graph.url + '/file/MEDIA1', mime_type: 'image/png' } };
    if (url === '/file/MEDIA1') return { body: PNG, type: 'image/png' };
    if (url === '/v23.0/AUDIO1') return { body: { url: graph.url + '/file/AUDIO1', mime_type: 'audio/ogg; codecs=opus' } };
    if (url === '/file/AUDIO1') return { body: Buffer.from('OggS-fake-audio'), type: 'audio/ogg' };
    if (url.endsWith('/media') && method === 'POST') return { body: { id: 'UPLOADED1' } };
    if (method === 'POST') return { body: { ok: true } };
    return null;
  });
  tg = await fake(({ url }) => {
    if (url.includes('/getFile')) return { body: { ok: true, result: { file_path: 'voice/file_1.oga' } } };
    if (url.includes('/file/bot')) return { body: Buffer.from('OggS-telegram-voice'), type: 'audio/ogg' };
    return { body: { ok: true, result: {} } };
  });
  stt = await fake(({ url, raw }) => (url.endsWith('/audio/transcriptions') ? { body: { text: raw.includes('telegram') ? 'عايز اعرف مواعيدكم' : 'hello voice' } } : null));
  dukkan = await fake(({ url, method, headers, body }) => {
    if (url === '/' && method === 'GET') {
      const data = { shop: { name: 'Bean', currency: 'EGP', deliveryFee: 20, methods: ['delivery', 'pickup'], acceptingOrders: true }, products: [{ id: 'p1', name: 'Latte', price: 0, variants: [{ name: 'M', price: 60 }, { name: 'L', price: 75 }], available: true }, { id: 'p2', name: 'Croissant', price: 45, variants: [], available: true }] };
      return { body: `<html><body><script>window.DUKKAN=${JSON.stringify(data)};</script></body></html>`, type: 'text/html' };
    }
    if (url === '/api/orders' && method === 'POST') {
      if (headers['x-dukkan'] !== '1') return { status: 403, body: { error: 'forbidden' } };
      if (!body.customer?.phone) return { status: 400, body: { error: 'phone_required' } };
      return { body: { no: 1042, total: 170 } };
    }
    return null;
  });
  woo = await fake(({ url }) => (url.startsWith('/wp-json/wc/store/v1/products') ? { body: url.includes('page=1') ? [{ id: 11, name: 'Mug', short_description: '<p>Ceramic</p>', prices: { price: '12500', currency_code: 'EGP', currency_minor_unit: 2 }, is_in_stock: true, permalink: 'https://x/mug' }] : [] } : null));
  shopify = await fake(({ url }) => (url.startsWith('/products.json') ? { body: { products: url.includes('page=1') ? [{ id: 7, title: 'Tee', handle: 'tee', body_html: 'Cotton', variants: [{ title: 'S', price: '15.00', available: true }, { title: 'M', price: '15.00', available: false }] }] : [] } } : null));
  hook = await fake(() => ({ body: { ok: true } }));
  ics = await fake(() => ({
    type: 'text/calendar',
    body: ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', `DTSTART;TZID=Africa/Cairo:${ymd}T130000`, `DTEND;TZID=Africa/Cairo:${ymd}T140000`, 'SUMMARY:Busy', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n'),
  }));

  process.env.META_GRAPH_URL = graph.url;
  process.env.TELEGRAM_API_URL = tg.url;
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wakeel-f-'));
  const { createApp } = await import('../src/app.js');
  app = createApp({ dataDir, setupToken: '', agencyPassword: 'agency-secret-1', env: {} });
  base = `http://127.0.0.1:${await app.start(0)}`;
});

after(async () => {
  await app.stop();
  for (const f of [llm, graph, tg, stt, dukkan, woo, shopify, hook, ics]) f.server.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

async function call(p, { method = 'GET', body, headers = {}, jar = cookie } = {}) {
  const res = await fetch(base + p, {
    method,
    redirect: 'manual',
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

test('setup with a template fills business info and turns on appointments', async () => {
  const r = await call('/api/setup', { method: 'POST', body: { password: 'owner-pass-1', businessName: 'عيادة النور', template: 'clinic', lang: 'ar' } });
  assert.equal(r.status, 200);
  cookie = r.headers.get('set-cookie').split(';')[0];
  const d = app.store.data;
  assert.match(d.profile.products, /تنظيف/);
  assert.equal(d.settings.calendar.enabled, true);
  assert.deepEqual(d.settings.calendar.closedDays, [5]);
  // AI: OpenAI-compatible fake; transcription fake
  await call('/api/settings', { method: 'PUT', body: { settings: { ai: { provider: 'openai', model: 'm', baseUrl: llm.url, vision: true }, transcription: { baseUrl: stt.url, model: 'whisper' } } } });
});

test('iCal parsing handles time zones and weekly recurrence', () => {
  const evs = parseIcs(['BEGIN:VEVENT', 'DTSTART;TZID=Africa/Cairo:20261102T100000', 'DTEND;TZID=Africa/Cairo:20261102T110000', 'RRULE:FREQ=WEEKLY;BYDAY=MO', 'END:VEVENT'].join('\n'), 'Africa/Cairo');
  assert.equal(evs.length, 1);
  const nextMonday = zonedToUtc(2026, 11, 9, 0, 0, 'Africa/Cairo');
  const busy = busyIntervals(evs, nextMonday, nextMonday + 864e5);
  assert.equal(busy.length, 1);
  assert.equal(new Date(busy[0][0]).toISOString(), '2026-11-09T08:00:00.000Z'); // 10:00 Cairo (UTC+2)
  const tuesday = nextMonday + 864e5;
  assert.equal(busyIntervals(evs, tuesday, tuesday + 864e5).length, 0);
});

test('availability blocks calendar events and existing bookings', async () => {
  const cal = app.store.data.settings.calendar;
  Object.assign(cal, { timezone: 'Africa/Cairo', open: '10:00', close: '16:00', slotMinutes: 60, closedDays: [], icsUrl: ics.url + '/basic.ics' });
  let r = await call('/api/availability?date=' + tomorrow);
  assert.deepEqual(r.body.slots, ['10:00', '11:00', '12:00', '14:00', '15:00']);
  const conv = app.store.getOrCreateConversation('test', 'cal', 'Sam');
  const res = await app.agent.executeTool(conv, 'book_appointment', { service: 'Cleaning', date: tomorrow, time: '13:00' });
  assert.equal(res.ok, false);
  assert.ok(res.free_slots.includes('12:00'));
  const ok = await app.agent.executeTool(conv, 'book_appointment', { service: 'Cleaning', date: tomorrow, time: '12:00' });
  assert.equal(ok.ok, true);
  r = await call('/api/availability?date=' + tomorrow);
  assert.ok(!r.body.slots.includes('12:00'), 'booked slot is no longer free');
});

test('Dukkan: sync catalog and place orders in the store', async () => {
  await call('/api/settings', { method: 'PUT', body: { settings: { catalog: { source: 'dukkan', url: dukkan.url } } } });
  const r = await call('/api/catalog/sync', { method: 'POST', body: {} });
  assert.equal(r.body.count, 2);
  const conv = app.store.getOrCreateConversation('whatsapp', '201000000001', 'Mona');
  // missing phone is reported back so the assistant can ask for it
  const fail = await app.agent.executeTool(conv, 'create_order', { items: [{ product_id: 'p1', name: 'Latte', variant: 'L', quantity: 2 }], method: 'pickup', customer_name: 'Mona', phone: '' }).catch((e) => e);
  // WhatsApp conversations default the phone to the sender, so this succeeds
  assert.equal(fail.ok, true);
  assert.equal(fail.order_number, 1042);
  assert.equal(fail.total, 170);
  const sent = dukkan.calls.find((c) => c.url === '/api/orders');
  assert.deepEqual(sent.body.items, [{ id: 'p1', qty: 2, variant: 'L' }]);
  assert.equal(sent.body.customer.phone, '201000000001');
  const webConv = app.store.getOrCreateConversation('web', 'visitor-1234', '');
  const noPhone = await app.agent.executeTool(webConv, 'create_order', { items: [{ product_id: 'p2', name: 'Croissant', quantity: 1 }], method: 'pickup', customer_name: 'Ali' });
  assert.equal(noPhone.ok, false);
  assert.equal(noPhone.error, 'phone_required');
  assert.match(noPhone.what_to_do, /phone/);
});

test('WooCommerce and Shopify catalogs are read without API keys', async () => {
  const { fetchWooCommerce, fetchShopify } = await import('../src/catalog.js');
  const w = await fetchWooCommerce(woo.url);
  assert.equal(w.products[0].name, 'Mug');
  assert.equal(w.products[0].price, 125);
  assert.equal(w.products[0].description, 'Ceramic');
  const s = await fetchShopify(shopify.url);
  assert.equal(s.products[0].variants.length, 2);
  assert.equal(s.products[0].available, true);
  await call('/api/settings', { method: 'PUT', body: { settings: { catalog: { source: 'none', url: '' } } } });
});

test('owner notifications: Telegram link, alerts and webhook', async () => {
  const d = app.store.data;
  app.telegram.token = 'TOKEN';
  // A stranger guessing /start does not link
  app.telegram.handleUpdate({ update_id: 1, message: { chat: { id: 555, type: 'private' }, from: { first_name: 'X' }, text: '/start wrong' } });
  assert.equal(d.settings.notify.telegramChats.length, 0);
  app.telegram.handleUpdate({ update_id: 2, message: { chat: { id: 999, type: 'private' }, from: { first_name: 'Owner' }, text: `/start ${d.settings.notify.linkCode}` } });
  assert.deepEqual(d.settings.notify.telegramChats, ['999']);
  await call('/api/settings', { method: 'PUT', body: { settings: { notify: { webhookUrl: hook.url + '/n8n' } } } });

  const before = tg.calls.length;
  const conv = app.store.getOrCreateConversation('instagram', 'ig-42', 'Nour');
  await app.agent.executeTool(conv, 'create_order', { items: [{ name: 'Whitening', quantity: 1 }], customer_name: 'Nour', phone: '0100' });
  const msg = await waitFor(() => tg.calls.slice(before).find((c) => c.url.endsWith('/sendMessage') && c.body.chat_id === '999'));
  assert.ok(msg, 'owner got a Telegram alert');
  assert.match(msg.body.text, /طلب جديد/);
  const h = await waitFor(() => hook.calls.find((c) => c.url === '/n8n'));
  assert.equal(h.body.event, 'order');
  assert.equal(h.body.request.customerName, 'Nour');
});

test('voice note on Telegram is transcribed and answered', async () => {
  const before = tg.calls.length;
  app.telegram.handleUpdate({ update_id: 3, message: { chat: { id: 4242, type: 'private' }, from: { first_name: 'Hoda' }, voice: { file_id: 'F1' } } });
  const reply = await waitFor(() => tg.calls.slice(before).find((c) => c.url.endsWith('/sendMessage') && c.body.chat_id === '4242'));
  assert.ok(reply);
  assert.equal(reply.body.text, 'ECHO: 🎤 عايز اعرف مواعيدكم');
  const conv = app.store.data.conversations['telegram:4242'];
  const m = conv.messages.find((x) => x.role === 'customer');
  assert.ok(app.store.mediaPath(m.audio), 'audio saved for the dashboard');
  // the owner can play it back
  const r = await fetch(base + '/api/media/' + m.audio, { headers: { cookie } });
  assert.equal(r.status, 200);
});

test('voice note without speech-to-text asks the customer to type', async () => {
  const saved = { ...app.store.data.settings.transcription };
  app.store.data.settings.transcription.baseUrl = '';
  const before = tg.calls.length;
  app.telegram.handleUpdate({ update_id: 4, message: { chat: { id: 4343, type: 'private' }, from: { first_name: 'Ola' }, voice: { file_id: 'F2' } } });
  const reply = await waitFor(() => tg.calls.slice(before).find((c) => c.url.endsWith('/sendMessage') && c.body.chat_id === '4343'));
  assert.match(reply.body.text, /تكتب|type/);
  Object.assign(app.store.data.settings.transcription, saved);
});

test('photo on WhatsApp reaches a vision model', async () => {
  await call('/api/settings', { method: 'PUT', body: { settings: { channels: { whatsapp: { enabled: true, token: 'WA', phoneNumberId: 'PN' } } } } });
  const before = llm.calls.length;
  app.meta.handle({ object: 'whatsapp_business_account', entry: [{ changes: [{ value: { contacts: [{ wa_id: '2011', profile: { name: 'Sara' } }], messages: [{ from: '2011', type: 'image', image: { id: 'MEDIA1', caption: 'عندكم ده؟' } }] } }] }] });
  const sent = await waitFor(() => graph.calls.find((c) => c.url === '/v23.0/PN/messages' && c.body?.to === '2011'));
  assert.ok(sent);
  const req = llm.calls.slice(before).find((c) => c.url.endsWith('/chat/completions'));
  const userMsg = req.body.messages.at(-1);
  assert.equal(userMsg.content[1].type, 'image_url');
  assert.match(userMsg.content[1].image_url.url, /^data:image\/png;base64,/);
});

test('image library: the assistant sends the menu on WhatsApp and in the widget', async () => {
  const up = await call('/api/library', { method: 'POST', body: { name: 'Menu', mime: 'image/png', data: PNG.toString('base64') } });
  assert.equal(up.status, 200);
  const pub = await fetch(base + up.body.item.url);
  assert.equal(pub.status, 200, 'library images are public so Instagram/Messenger can fetch them');
  const before = graph.calls.length;
  app.meta.handle({ object: 'whatsapp_business_account', entry: [{ changes: [{ value: { messages: [{ from: '2012', type: 'text', text: { body: 'menu please' } }] } }] }] });
  const img = await waitFor(() => graph.calls.slice(before).find((c) => c.url === '/v23.0/PN/messages' && c.body?.type === 'image'));
  assert.equal(img.body.image.id, 'UPLOADED1');
  assert.ok(graph.calls.slice(before).some((c) => c.url === '/v23.0/PN/media'), 'image uploaded first');
  const w = await call('/api/widget/messages', { method: 'POST', body: { visitor: 'visitor-' + crypto.randomUUID(), text: 'menu please' }, jar: '' });
  assert.equal(w.body.images[0].name, 'Menu');
});

test('Facebook Messenger messages are answered through the Page', async () => {
  await call('/api/settings', { method: 'PUT', body: { settings: { channels: { messenger: { enabled: true, pageToken: 'PAGE-T', verifyToken: 'ms-verify' } } } } });
  const v = await call('/webhooks/meta?hub.mode=subscribe&hub.verify_token=ms-verify&hub.challenge=77', { jar: '' });
  assert.equal(v.body, 77);
  const before = graph.calls.length;
  await call('/webhooks/meta', { method: 'POST', jar: '', body: { object: 'page', entry: [{ messaging: [{ sender: { id: 'PSID1' }, message: { text: 'hi page' } }] }] } });
  const out = await waitFor(() => graph.calls.slice(before).find((c) => c.url === '/v23.0/me/messages'));
  assert.equal(out.headers.authorization, 'Bearer PAGE-T');
  assert.deepEqual(out.body.recipient, { id: 'PSID1' });
  assert.equal(out.body.message.text, 'ECHO: hi page');
});

test('agency mode: separate businesses on one server', async () => {
  let r = await call('/api/agency/tenants', { jar: '' });
  assert.equal(r.status, 401);
  r = await call('/api/agency/login', { method: 'POST', body: { password: 'nope' }, jar: '' });
  assert.equal(r.status, 401);
  r = await call('/api/agency/login', { method: 'POST', body: { password: 'agency-secret-1' }, jar: '' });
  const agency = r.headers.get('set-cookie').split(';')[0];
  r = await call('/api/agency/tenants', { method: 'POST', body: { name: 'Nile Pizza', slug: 'nile-pizza', template: 'restaurant', password: 'pizza-pass-1', lang: 'en' }, jar: agency });
  assert.equal(r.status, 200);
  r = await call('/api/agency/tenants', { method: 'POST', body: { name: 'Bad', slug: 'Bad Slug!' }, jar: agency });
  assert.equal(r.status, 400);

  r = await call('/b/nile-pizza', { jar: '' });
  assert.equal(r.status, 301);
  r = await call('/b/nile-pizza/api/session', { jar: '' });
  assert.equal(r.body.needsSetup, false);
  assert.equal(r.body.basePath, '/b/nile-pizza');
  // owner login for the tenant
  r = await call('/b/nile-pizza/api/login', { method: 'POST', body: { password: 'pizza-pass-1' }, jar: '' });
  const tenantCookie = r.headers.get('set-cookie');
  assert.match(tenantCookie, /wk_session_nile-pizza=.*Path=\/b\/nile-pizza/);
  r = await call('/b/nile-pizza/api/profile', { jar: tenantCookie.split(';')[0] });
  assert.equal(r.body.profile.businessName, 'Nile Pizza');
  assert.match(r.body.profile.products, /Margherita/);
  // the main business's session does not open the tenant, the agency session does
  r = await call('/b/nile-pizza/api/profile');
  assert.equal(r.status, 401);
  r = await call('/b/nile-pizza/api/profile', { jar: agency });
  assert.equal(r.status, 200);
  // data is separate
  const tenant = app.tenants.get('nile-pizza');
  assert.notEqual(tenant.store.dataDir, app.store.dataDir);
  assert.equal(Object.keys(tenant.store.data.conversations).length, 0);
  // widget and webhooks live under the tenant path
  r = await fetch(base + '/b/nile-pizza/widget.js');
  assert.equal(r.status, 200);
  r = await call('/api/agency/tenants', { jar: agency });
  assert.deepEqual(r.body.tenants.map((x) => x.slug), ['', 'nile-pizza']);
  r = await call('/api/agency/tenants/nile-pizza', { method: 'DELETE', body: {}, jar: agency });
  r = await call('/b/nile-pizza/api/session', { jar: '' });
  assert.equal(r.status, 404);
});

test('photos reach Claude as image blocks', async () => {
  const claude = await fake(({ body }) => ({ body: { id: 'msg_1', type: 'message', role: 'assistant', model: body.model, stop_reason: 'end_turn', content: [{ type: 'text', text: 'Nice photo' }], usage: { input_tokens: 1, output_tokens: 1 } } }));
  const saved = structuredClone(app.store.data.settings.ai);
  Object.assign(app.store.data.settings.ai, { provider: 'anthropic', model: 'claude-opus-5-5', apiKey: 'sk-ant-x', baseUrl: claude.url });
  app.meta.handle({ object: 'whatsapp_business_account', entry: [{ changes: [{ value: { messages: [{ from: '2099', type: 'image', image: { id: 'MEDIA1', caption: 'how much?' } }] } }] }] });
  const req = await waitFor(() => claude.calls.find((c) => c.url.startsWith('/v1/messages')));
  const content = req.body.messages.at(-1).content;
  assert.equal(content[0].type, 'image');
  assert.equal(content[0].source.media_type, 'image/png');
  assert.equal(content[1].text, 'how much?');
  app.store.data.settings.ai = saved;
  claude.server.close();
});
