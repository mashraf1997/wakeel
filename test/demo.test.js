import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';

test('demo mode: seeded, demo login, locked settings, reset', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wakeel-demo-'));
  const app = createApp({ dataDir, env: { DEMO_MODE: 'true' } });
  const base = `http://127.0.0.1:${await app.start(0)}`;
  const call = async (p, o = {}) => {
    const r = await fetch(base + p, { method: o.method || 'GET', headers: { ...(o.body ? { 'content-type': 'application/json' } : {}), ...(o.jar ? { cookie: o.jar } : {}) }, body: o.body ? JSON.stringify(o.body) : undefined });
    return { status: r.status, body: await r.json().catch(() => ({})), headers: r.headers };
  };
  try {
  let r = await call('/api/session');
  assert.deepEqual(r.body.demo, { password: 'demo1234', resetMinutes: 60 });
  r = await call('/api/login', { method: 'POST', body: { password: 'demo1234' } });
  const jar = r.headers.get('set-cookie').split(';')[0];
  r = await call('/api/overview', { jar });
  assert.ok(r.body.conversations >= 3);
  assert.equal(r.body.pendingRequests, 2);
  r = await call('/api/password', { method: 'POST', jar, body: { current: 'demo1234', next: 'hijacked!' } });
  assert.equal(r.status, 403);
  await call('/api/settings', { method: 'PUT', jar, body: { settings: { botEnabled: false, channels: { telegram: { token: 'x', enabled: true } }, notify: { webhookUrl: 'http://evil' } } } });
  assert.equal(app.store.data.settings.botEnabled, false, 'harmless settings still work');
  assert.equal(app.store.data.settings.channels.telegram.token, '', 'channel tokens are not saved');
  assert.equal(app.store.data.settings.notify.webhookUrl, '');
  const { seedDemo, demoConfig } = await import('../src/demo.js');
  seedDemo(app.store, demoConfig({ DEMO_MODE: 'true' }));
  assert.equal(app.store.data.settings.botEnabled, true, 'reset restores the sample');
  r = await call('/api/overview', { jar });
  assert.equal(r.status, 200, 'sessions survive a reset');
  } finally {
    await app.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
