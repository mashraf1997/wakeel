import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';

let mawid, hooks, app, dataDir;
const calls = [];

before(async () => {
  mawid = http.createServer(async (req, res) => {
    let raw = '';
    for await (const c of req) raw += c;
    calls.push({ url: req.url, headers: req.headers, body: raw ? JSON.parse(raw) : null });
    const json = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html' });
      return res.end(`<script>window.MAWID=${JSON.stringify({ services: [{ id: 's1', name: 'قص شعر', duration: 30, price: 150 }, { id: 's2', name: 'صبغة', duration: 90, price: 600 }] })};</script>`);
    }
    if (req.url.startsWith('/api/slots')) return json(200, { slots: [{ start: 600 }, { start: 630 }, { start: 840 }] });
    if (req.url === '/api/bookings' && req.method === 'POST') {
      if (req.headers['x-mawid'] !== '1') return json(403, { error: 'forbidden' });
      const b = JSON.parse(raw);
      if (b.start === 840) return json(409, { error: 'slot_taken' });
      if (!b.customer.phone) return json(400, { error: 'phone_required' });
      return json(200, { no: 42, status: 'confirmed', manageUrl: 'http://mawid.test/b/tok' });
    }
    json(404, {});
  });
  await new Promise((r) => mawid.listen(0, r));
  const hookCalls = [];
  hooks = http.createServer(async (req, res) => { let raw = ''; for await (const c of req) raw += c; hookCalls.push({ url: req.url, body: JSON.parse(raw) }); res.end('{}'); });
  hooks.calls = hookCalls;
  await new Promise((r) => hooks.listen(0, r));
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wakeel-m-'));
  app = createApp({ dataDir, env: {} });
  await app.start(0);
  Object.assign(app.store.data.settings.calendar, { source: 'mawid', mawidUrl: `http://127.0.0.1:${mawid.address().port}` });
});
after(async () => {
  await app.stop();
  mawid.close();
  hooks.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test('Wakeel checks Mawid slots and books into Mawid', async () => {
  const conv = app.store.getOrCreateConversation('whatsapp', '201234', 'Hoda');
  let r = await app.agent.executeTool(conv, 'check_availability', { date: '2026-11-10', service: 'قص الشعر' });
  assert.equal(r.free_slots.length, 0 + 3);
  assert.deepEqual(r.free_slots, ['10:00', '10:30', '14:00']);
  assert.equal(r.service, 'قص شعر', 'service matched by name');
  r = await app.agent.executeTool(conv, 'book_appointment', { service: 'قص شعر', date: '2026-11-10', time: '10:30', customer_name: 'Hoda' });
  assert.equal(r.ok, true);
  assert.equal(r.booking_number, 42);
  const sent = calls.find((c) => c.url === '/api/bookings');
  assert.deepEqual(sent.body, { serviceId: 's1', date: '2026-11-10', start: 630, customer: { name: 'Hoda', phone: '201234', notes: '' } });
  const req = app.store.data.requests[0];
  assert.equal(req.externalRef, 'Mawid #42');
  assert.equal(req.status, 'confirmed');
  r = await app.agent.executeTool(conv, 'book_appointment', { service: 'قص شعر', date: '2026-11-10', time: '14:00' });
  assert.equal(r.error, 'slot_taken');
  assert.ok(r.free_slots.length);
});

test('the prompt lists bookable services from Mawid', async () => {
  const { mawidServices } = await import('../src/mawid.js');
  app.store.runtime = { mawid: await mawidServices(app.store.data.settings.calendar.mawidUrl) };
  const { buildSystemPrompt } = await import('../src/agent.js');
  assert.match(buildSystemPrompt(app.store, '').stable, /صبغة — 90 min — 600/);
});

test('notifications go to every webhook listed', async () => {
  const u = `http://127.0.0.1:${hooks.address().port}`;
  app.store.data.settings.notify.webhookUrl = `${u}/fatoora\n${u}/khatm not-a-url`;
  await app.root.notifier.send('order', { request: { id: 'R1', type: 'order', items: [{ name: 'x', quantity: 1 }] } });
  assert.deepEqual(hooks.calls.map((c) => c.url).sort(), ['/fatoora', '/khatm']);
});
