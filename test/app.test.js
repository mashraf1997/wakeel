import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createApp } from '../src/app.js';
import { search, normalize } from '../src/knowledge.js';

// ---------- fake upstream servers ----------
function fakeServer(handler) {
  const calls = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null;
    calls.push({ url: req.url, headers: req.headers, body });
    const out = await handler(req, body, calls);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(out));
  });
  return new Promise((r) => server.listen(0, () => r({ server, calls, url: `http://127.0.0.1:${server.address().port}` })));
}

// OpenAI-compatible: first asks to create an order, then confirms in text.
const openaiFake = await fakeServer((req, body) => {
  const last = body.messages[body.messages.length - 1];
  if (last.role === 'tool') {
    const ref = JSON.parse(last.content).reference;
    return { choices: [{ message: { role: 'assistant', content: `تمام! طلبك رقم ${ref} وصل وهنأكده حالاً.` } }] };
  }
  if (/كلم حد/.test(last.content)) {
    return { choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: 'h1', type: 'function', function: { name: 'handoff_to_human', arguments: '{"reason":"customer asked"}' } }] } }] };
  }
  if (/عايز/.test(last.content)) {
    return { choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'create_order', arguments: JSON.stringify({ items: [{ name: 'بيتزا مارجريتا', quantity: 2 }], customer_name: 'منى', phone: '01000000000' }) } }] } }] };
  }
  return { choices: [{ message: { role: 'assistant', content: 'أهلاً بيك! أقدر أساعدك إزاي؟' } }] };
});

// Anthropic Messages API: tool_use first, then end_turn.
const anthropicFake = await fakeServer((req, body) => {
  const last = body.messages[body.messages.length - 1];
  const isToolResult = Array.isArray(last.content) && last.content[0]?.type === 'tool_result';
  const base = { id: 'msg_' + crypto.randomUUID(), type: 'message', role: 'assistant', model: body.model, usage: { input_tokens: 10, output_tokens: 10 } };
  if (isToolResult) return { ...base, stop_reason: 'end_turn', content: [{ type: 'text', text: 'Booked! Reference ' + JSON.parse(last.content[0].content).reference }] };
  return { ...base, stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'toolu_1', name: 'book_appointment', input: { service: 'Cleaning', date: '2026-11-04', time: '17:45', customer_name: 'Sam' } }] };
});

// Meta Graph API: records outbound WhatsApp messages.
const graphFake = await fakeServer(() => ({ messages: [{ id: 'wamid.1' }] }));

let app, base, cookie, dataDir;

before(async () => {
  process.env.META_GRAPH_URL = graphFake.url;
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wakeel-'));
  app = createApp({ dataDir, setupToken: '', env: {} });
  const port = await app.start(0);
  base = `http://127.0.0.1:${port}`;
});

after(async () => {
  await app.stop();
  for (const f of [openaiFake, anthropicFake, graphFake]) f.server.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

async function call(p, { method = 'GET', body, auth = true, headers = {} } = {}) {
  const res = await fetch(base + p, {
    method,
    headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(auth && cookie ? { cookie } : {}), ...headers },
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json, headers: res.headers };
}

test('knowledge search normalizes Arabic spelling', () => {
  assert.equal(normalize('أسعار الإيجار'), 'اسعار الايجار');
  const docs = [
    { title: 'المنيو', text: 'بيتزا مارجريتا 150 جنيه\n\nبيتزا خضار 140 جنيه' },
    { title: 'التوصيل', text: 'التوصيل لمدينة نصر ومصر الجديدة خلال ساعة' },
  ];
  const hits = search(docs, 'هل في توصيل لمدينه نصر؟');
  assert.equal(hits[0].title, 'التوصيل');
});

test('first-run setup, then API requires a session', async () => {
  let r = await call('/api/session');
  assert.equal(r.body.needsSetup, true);
  r = await call('/api/overview');
  assert.equal(r.status, 401);
  r = await call('/api/setup', { method: 'POST', body: { password: 'short' } });
  assert.equal(r.status, 400);
  r = await call('/api/setup', { method: 'POST', body: { password: 'correct-horse', businessName: 'بيتزا النيل' } });
  assert.equal(r.status, 200);
  cookie = r.headers.get('set-cookie').split(';')[0];
  r = await call('/api/setup', { method: 'POST', body: { password: 'another-one' } });
  assert.equal(r.status, 409, 'setup cannot run twice');
  r = await call('/api/login', { method: 'POST', body: { password: 'wrong-password' }, auth: false });
  assert.equal(r.status, 401);
  r = await call('/api/overview');
  assert.equal(r.status, 200);
});

test('mutations without JSON content-type are rejected', async () => {
  const r = await call('/api/profile', { method: 'PUT', body: 'businessName=x', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
  assert.equal(r.status, 415);
});

test('settings mask secrets and keep them when masked values come back', async () => {
  await call('/api/settings', { method: 'PUT', body: { settings: { ai: { provider: 'openai', model: 'qwen3:8b', baseUrl: openaiFake.url, apiKey: 'sk-secret-1234' } } } });
  const r = await call('/api/settings');
  assert.match(r.body.settings.ai.apiKey, /^•+1234$/);
  await call('/api/settings', { method: 'PUT', body: { settings: { ai: { apiKey: r.body.settings.ai.apiKey } } } });
  assert.equal(app.store.data.settings.ai.apiKey, 'sk-secret-1234');
});

test('OpenAI-compatible provider: order tool creates a request', async () => {
  await call('/api/profile', { method: 'PUT', body: { products: 'بيتزا مارجريتا - 150 جنيه' } });
  let r = await call('/api/playground', { method: 'POST', body: { text: 'السلام عليكم' } });
  assert.equal(r.body.reply, 'أهلاً بيك! أقدر أساعدك إزاي؟');
  r = await call('/api/playground', { method: 'POST', body: { text: 'عايز 2 بيتزا مارجريتا' } });
  assert.match(r.body.reply, /طلبك رقم R/);
  const { body } = await call('/api/requests');
  assert.equal(body.requests.length, 1);
  assert.equal(body.requests[0].items[0].quantity, 2);
  assert.equal(body.requests[0].status, 'pending');
  // system prompt carried the business info and the auth header was sent
  const sent = openaiFake.calls.at(-1);
  assert.match(sent.body.messages[0].content, /بيتزا مارجريتا - 150 جنيه/);
  assert.equal(sent.headers.authorization, 'Bearer sk-secret-1234');
});

test('Anthropic provider: tool loop, refusal fallback opt-in, effort', async () => {
  await call('/api/settings', { method: 'PUT', body: { settings: { ai: { provider: 'anthropic', model: 'claude-opus-5-5', apiKey: 'sk-ant-test', baseUrl: anthropicFake.url, effort: 'low' } } } });
  await call('/api/playground', { method: 'POST', body: { reset: true } });
  const r = await call('/api/playground', { method: 'POST', body: { text: 'Book a cleaning Wednesday 17:45' } });
  assert.match(r.body.reply, /^Booked! Reference R/);
  const [first, second] = anthropicFake.calls.slice(-2);
  assert.equal(first.url, '/v1/messages?beta=true');
  assert.match(first.headers['anthropic-beta'], /server-side-fallback-2026-07-01/);
  assert.equal(first.body.fallbacks, 'default');
  assert.deepEqual(first.body.output_config, { effort: 'low' });
  assert.equal(first.body.system[0].cache_control.type, 'ephemeral');
  assert.deepEqual(first.body.tools.map((t) => t.name), ['create_order', 'book_appointment', 'handoff_to_human', 'report_missing_info', 'schedule_followup']);
  assert.equal(second.body.messages.at(-1).content[0].tool_use_id, 'toolu_1');
  const booking = app.store.data.requests.find((x) => x.type === 'booking');
  assert.equal(booking.time, '17:45');
});

test('website widget: chat, handoff to human, owner reply', async () => {
  await call('/api/settings', { method: 'PUT', body: { settings: { ai: { provider: 'openai', baseUrl: openaiFake.url } } } });
  const visitor = 'visitor-' + crypto.randomUUID();
  let r = await call('/api/widget/messages', { method: 'POST', body: { visitor, text: 'ممكن أكلم حد؟' }, auth: false });
  assert.ok(r.body.reply);
  const conv = app.store.data.conversations['web:' + visitor];
  assert.equal(conv.mode, 'human');
  assert.equal(conv.needsAttention, true);
  // bot stays quiet while a human owns the chat
  r = await call('/api/widget/messages', { method: 'POST', body: { visitor, text: 'لسه مستني' }, auth: false });
  assert.equal(r.body.reply, null);
  r = await call('/api/conversations/' + encodeURIComponent(conv.id) + '/reply', { method: 'POST', body: { text: 'أهلاً، معاك أحمد' } });
  assert.equal(r.status, 200);
  r = await call('/api/widget/messages?visitor=' + visitor, { auth: false });
  assert.equal(r.body.messages.at(-1).text, 'أهلاً، معاك أحمد');
  assert.equal(r.headers.get('access-control-allow-origin'), '*');
});

test('WhatsApp webhook: verify, signature check, reply sent via Graph API', async () => {
  const secret = 'app-secret';
  await call('/api/settings', { method: 'PUT', body: { settings: { channels: { whatsapp: { enabled: true, token: 'EAAG-token', phoneNumberId: '1234567890', verifyToken: 'verify-me', appSecret: secret } } } } });
  let r = await call('/webhooks/meta?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=42', { auth: false });
  assert.equal(r.status, 200);
  assert.equal(r.body, 42);
  r = await call('/webhooks/meta?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=42', { auth: false });
  assert.equal(r.status, 403);

  const payload = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{ changes: [{ value: { contacts: [{ wa_id: '201000000000', profile: { name: 'Mona' } }], messages: [{ from: '201000000000', type: 'text', text: { body: 'السلام عليكم' } }] } }] }],
  });
  r = await call('/webhooks/meta', { method: 'POST', body: payload, auth: false, headers: { 'x-hub-signature-256': 'sha256=' + '0'.repeat(64) } });
  assert.equal(r.status, 401, 'bad signature rejected');
  const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  r = await call('/webhooks/meta', { method: 'POST', body: payload, auth: false, headers: { 'x-hub-signature-256': sig } });
  assert.equal(r.status, 200);
  for (let i = 0; i < 50 && !graphFake.calls.length; i++) await new Promise((res) => setTimeout(res, 20));
  const out = graphFake.calls[0];
  assert.equal(out.url, '/v23.0/1234567890/messages');
  assert.equal(out.headers.authorization, 'Bearer EAAG-token');
  assert.equal(out.body.to, '201000000000');
  assert.equal(out.body.text.body, 'أهلاً بيك! أقدر أساعدك إزاي؟');
  assert.equal(app.store.data.conversations['whatsapp:201000000000'].name, 'Mona');
});

test('confirming a request notifies the customer in their channel', async () => {
  const req = app.store.data.requests.find((x) => x.type === 'order');
  // move the order onto the WhatsApp conversation to exercise delivery
  req.conversationId = 'whatsapp:201000000000';
  req.channel = 'whatsapp';
  const before = graphFake.calls.length;
  const r = await call('/api/requests/' + req.id, { method: 'PATCH', body: { status: 'confirmed', notify: true } });
  assert.equal(r.body.request.status, 'confirmed');
  assert.equal(graphFake.calls.length, before + 1);
  assert.match(graphFake.calls.at(-1).body.text.body, new RegExp(req.id));
});

test('data survives a restart', async () => {
  app.store.flush();
  const again = createApp({ dataDir, env: {} });
  assert.equal(again.store.data.profile.businessName, 'بيتزا النيل');
  assert.ok(again.store.data.admin.hash);
  assert.ok(Object.keys(again.store.data.conversations).length >= 3);
});
