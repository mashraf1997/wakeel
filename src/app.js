import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './store.js';
import { Agent } from './agent.js';
import { CLAUDE_MODELS } from './ai.js';
import { TelegramChannel } from './channels/telegram.js';
import { MetaChannels } from './channels/meta.js';
import { hashPassword, verifyPassword, createSession, checkSession, parseCookies, RateLimiter } from './auth.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(here, '..', 'public');
const MAX_BODY = 2 * 1024 * 1024;
const MASK = '••••••';
const VERSION = JSON.parse(fs.readFileSync(path.join(here, '..', 'package.json'), 'utf8')).version;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

export function createApp({ dataDir, setupToken = process.env.SETUP_TOKEN || '', env = process.env } = {}) {
  const store = new Store(dataDir);
  applyEnvDefaults(store, env);

  const agent = new Agent(store);
  const telegram = new TelegramChannel(store, onChannelMessage);
  const meta = new MetaChannels(store, onChannelMessage);

  const loginLimiter = new RateLimiter(10, 15 * 60_000);
  const widgetLimiter = new RateLimiter(30, 60_000);

  async function onChannelMessage(msg) {
    const { reply } = await agent.handleIncoming(msg);
    if (reply) await sendTo(msg.channel, msg.externalId, reply);
  }

  async function sendTo(channel, externalId, text) {
    if (channel === 'telegram') return telegram.send(externalId, text);
    if (channel === 'whatsapp' || channel === 'instagram') return meta.send(channel, externalId, text);
    // 'web' and 'test' are pulled by the widget / dashboard
  }

  // ---------------- helpers ----------------
  const send = (res, status, body, headers = {}) => {
    const isObj = typeof body === 'object' && !(body instanceof Buffer);
    res.writeHead(status, {
      'content-type': isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
      'x-content-type-options': 'nosniff',
      ...headers,
    });
    res.end(isObj ? JSON.stringify(body) : body);
  };

  const readBody = (req) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on('data', (c) => {
        size += c.length;
        if (size > MAX_BODY) {
          reject(Object.assign(new Error('Body too large'), { status: 413 }));
          req.destroy();
        } else chunks.push(c);
      });
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });

  const readJson = async (req) => {
    const raw = await readBody(req);
    if (!raw.length) return {};
    try {
      return JSON.parse(raw.toString('utf8'));
    } catch {
      throw Object.assign(new Error('Invalid JSON'), { status: 400 });
    }
  };

  const clientIp = (req) => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
  const isHttps = (req) => req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted;

  const isAuthed = (req) => {
    const token = parseCookies(req.headers.cookie).wk_session;
    return checkSession(store.data.meta.secret, store.data.admin?.hash, token);
  };

  const sessionCookie = (req, value, maxAge) =>
    `wk_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isHttps(req) ? '; Secure' : ''}`;

  const serveStatic = (res, file, extraHeaders = {}) => {
    const full = path.join(PUBLIC_DIR, file);
    if (!full.startsWith(PUBLIC_DIR) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) return send(res, 404, 'Not found');
    res.writeHead(200, {
      'content-type': MIME[path.extname(full)] || 'application/octet-stream',
      'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff',
      ...extraHeaders,
    });
    fs.createReadStream(full).pipe(res);
  };

  // ---------------- views of stored data ----------------
  function maskedSettings() {
    const s = structuredClone(store.data.settings);
    const mask = (obj, key) => {
      if (obj[key]) obj[key] = MASK + String(obj[key]).slice(-4);
    };
    mask(s.ai, 'apiKey');
    mask(s.channels.telegram, 'token');
    mask(s.channels.whatsapp, 'token');
    mask(s.channels.whatsapp, 'appSecret');
    mask(s.channels.instagram, 'pageToken');
    mask(s.channels.instagram, 'appSecret');
    s.aiKeyFromEnv = !store.data.settings.ai.apiKey && Boolean(env.ANTHROPIC_API_KEY) && store.data.settings.ai.provider === 'anthropic';
    return s;
  }

  // Merge incoming settings, keeping secrets the client only saw masked.
  function mergeSecrets(target, incoming) {
    for (const [k, v] of Object.entries(incoming || {})) {
      if (!(k in target)) continue;
      if (v && typeof v === 'object' && !Array.isArray(v)) mergeSecrets(target[k], v);
      else if (typeof v === 'string' && v.startsWith(MASK)) continue;
      else if (typeof target[k] === typeof v || target[k] === null || target[k] === '') target[k] = typeof v === 'string' ? v.trim() : v;
    }
  }

  function overview() {
    const convs = Object.values(store.data.conversations).filter((c) => c.channel !== 'test');
    const since = Date.now() - 7 * 864e5;
    const days = [...Array(7)].map((_, i) => new Date(Date.now() - (6 - i) * 864e5).toISOString().slice(0, 10));
    const perDay = Object.fromEntries(days.map((d) => [d, 0]));
    const byChannel = { whatsapp: 0, instagram: 0, telegram: 0, web: 0 };
    let botReplies = 0, customerMsgs = 0;
    for (const c of convs) {
      for (const m of c.messages) {
        if (Date.parse(m.at) < since) continue;
        if (m.role === 'customer') {
          customerMsgs += 1;
          byChannel[c.channel] = (byChannel[c.channel] || 0) + 1;
          const d = m.at.slice(0, 10);
          if (d in perDay) perDay[d] += 1;
        } else if (m.role === 'bot') botReplies += 1;
      }
    }
    const ai = store.data.settings.ai;
    return {
      conversations: convs.length,
      needsAttention: convs.filter((c) => c.needsAttention).length,
      pendingRequests: store.data.requests.filter((r) => r.status === 'pending').length,
      customerMessages7d: customerMsgs,
      botReplies7d: botReplies,
      perDay: days.map((d) => ({ day: d, count: perDay[d] })),
      byChannel,
      aiReady: ai.provider === 'openai' ? Boolean(ai.model) : Boolean(ai.apiKey || env.ANTHROPIC_API_KEY),
      profileReady: Boolean(store.data.profile.businessName && (store.data.profile.products || store.data.knowledge.length)),
      channels: channelStatus(),
    };
  }

  function channelStatus() {
    const m = meta.status();
    return { web: { connected: true }, telegram: telegram.status(), whatsapp: m.whatsapp, instagram: m.instagram };
  }

  // ---------------- routes ----------------
  async function route(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    const method = req.method;

    // ----- public -----
    if (p === '/health') return send(res, 200, { ok: true, version: VERSION });
    if (p === '/widget.js') return serveStatic(res, 'widget.js', { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=300' });

    if (p.startsWith('/api/widget/')) {
      const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
      if (method === 'OPTIONS') return send(res, 204, '', cors);
      if (p === '/api/widget/config' && method === 'GET') {
        const w = store.data.settings.widget;
        return send(res, 200, { title: w.title || store.data.profile.businessName || 'Chat', greeting: w.greeting, color: w.color }, cors);
      }
      const visitorId = String(url.searchParams.get('visitor') || '').slice(0, 64);
      if (p === '/api/widget/messages' && method === 'GET') {
        if (!/^[a-zA-Z0-9-]{8,64}$/.test(visitorId)) return send(res, 400, { error: 'Invalid visitor id' }, cors);
        const c = store.data.conversations[store.conversationKey('web', visitorId)];
        const messages = (c?.messages || []).map((m) => ({ id: m.id, from: m.role === 'customer' ? 'me' : 'them', text: m.text, at: m.at }));
        return send(res, 200, { messages }, cors);
      }
      if (p === '/api/widget/messages' && method === 'POST') {
        if (!widgetLimiter.allow(clientIp(req))) return send(res, 429, { error: 'Too many messages, slow down' }, cors);
        const body = await readJson(req);
        const id = String(body.visitor || '');
        const text = String(body.text || '').trim().slice(0, 2000);
        if (!/^[a-zA-Z0-9-]{8,64}$/.test(id) || !text) return send(res, 400, { error: 'visitor and text are required' }, cors);
        const { reply } = await agent.handleIncoming({ channel: 'web', externalId: id, name: String(body.name || '').slice(0, 80), text });
        return send(res, 200, { reply }, cors);
      }
      return send(res, 404, { error: 'Not found' }, cors);
    }

    if (p === '/webhooks/meta') {
      if (method === 'GET') {
        const challenge = meta.verify(url.searchParams);
        return challenge ? send(res, 200, challenge) : send(res, 403, 'Verification failed');
      }
      if (method === 'POST') {
        const raw = await readBody(req);
        if (!meta.checkSignature(raw, req.headers['x-hub-signature-256'])) return send(res, 401, 'Bad signature');
        let payload;
        try {
          payload = JSON.parse(raw.toString('utf8'));
        } catch {
          return send(res, 400, 'Invalid JSON');
        }
        send(res, 200, 'EVENT_RECEIVED'); // answer Meta fast, work after
        meta.handle(payload);
        return;
      }
    }

    // ----- dashboard auth -----
    if (p === '/api/session' && method === 'GET') {
      return send(res, 200, { needsSetup: !store.data.admin, authed: isAuthed(req), setupTokenRequired: Boolean(setupToken), version: VERSION });
    }
    if (p === '/api/setup' && method === 'POST') {
      if (store.data.admin) return send(res, 409, { error: 'Already set up' });
      const body = await readJson(req);
      if (setupToken && body.setupToken !== setupToken) return send(res, 403, { error: 'Wrong setup token' });
      const password = String(body.password || '');
      if (password.length < 8) return send(res, 400, { error: 'Password must be at least 8 characters' });
      store.data.admin = hashPassword(password);
      if (body.businessName) store.data.profile.businessName = String(body.businessName).slice(0, 120);
      store.flush();
      return send(res, 200, { ok: true }, { 'set-cookie': sessionCookie(req, createSession(store.data.meta.secret, store.data.admin.hash), 30 * 86400) });
    }
    if (p === '/api/login' && method === 'POST') {
      if (!loginLimiter.allow(clientIp(req))) return send(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
      const body = await readJson(req);
      if (!verifyPassword(String(body.password || ''), store.data.admin)) return send(res, 401, { error: 'Wrong password' });
      return send(res, 200, { ok: true }, { 'set-cookie': sessionCookie(req, createSession(store.data.meta.secret, store.data.admin.hash), 30 * 86400) });
    }
    if (p === '/api/logout' && method === 'POST') {
      return send(res, 200, { ok: true }, { 'set-cookie': sessionCookie(req, '', 0) });
    }

    // ----- dashboard API (auth required) -----
    if (p.startsWith('/api/')) {
      if (!isAuthed(req)) return send(res, 401, { error: 'Not signed in' });
      if (method !== 'GET' && !(req.headers['content-type'] || '').includes('application/json')) {
        return send(res, 415, { error: 'Send JSON' }); // blocks cross-site form posts
      }
      return dashboardApi(req, res, url, p, method);
    }

    // ----- dashboard SPA -----
    if (method === 'GET') {
      if (p === '/' || p === '/index.html') return serveStatic(res, 'index.html');
      if (/^\/[\w.-]+\.(js|css|svg|png|ico)$/.test(p)) return serveStatic(res, p.slice(1));
    }
    return send(res, 404, 'Not found');
  }

  async function dashboardApi(req, res, url, p, method) {
    const d = store.data;
    let m;

    if (p === '/api/overview' && method === 'GET') return send(res, 200, overview());

    if (p === '/api/conversations' && method === 'GET') return send(res, 200, { conversations: store.listConversations() });

    if ((m = p.match(/^\/api\/conversations\/([^/]+)$/)) && method === 'GET') {
      const c = d.conversations[decodeURIComponent(m[1])];
      if (!c) return send(res, 404, { error: 'Conversation not found' });
      c.unread = 0;
      store.save();
      return send(res, 200, { conversation: c });
    }
    if ((m = p.match(/^\/api\/conversations\/([^/]+)\/reply$/)) && method === 'POST') {
      const c = d.conversations[decodeURIComponent(m[1])];
      if (!c) return send(res, 404, { error: 'Conversation not found' });
      const body = await readJson(req);
      const text = String(body.text || '').trim();
      if (!text) return send(res, 400, { error: 'Message is empty' });
      try {
        await sendTo(c.channel, c.externalId, text);
      } catch (err) {
        return send(res, 502, { error: `Could not deliver: ${err.message}` });
      }
      c.mode = 'human';
      c.needsAttention = false;
      store.addMessage(c, 'owner', text);
      return send(res, 200, { conversation: c });
    }
    if ((m = p.match(/^\/api\/conversations\/([^/]+)$/)) && method === 'PATCH') {
      const c = d.conversations[decodeURIComponent(m[1])];
      if (!c) return send(res, 404, { error: 'Conversation not found' });
      const body = await readJson(req);
      if (body.mode === 'bot' || body.mode === 'human') c.mode = body.mode;
      if (typeof body.needsAttention === 'boolean') c.needsAttention = body.needsAttention;
      store.save();
      return send(res, 200, { conversation: c });
    }
    if ((m = p.match(/^\/api\/conversations\/([^/]+)$/)) && method === 'DELETE') {
      delete d.conversations[decodeURIComponent(m[1])];
      store.save();
      return send(res, 200, { ok: true });
    }

    if (p === '/api/requests' && method === 'GET') return send(res, 200, { requests: d.requests });
    if ((m = p.match(/^\/api\/requests\/([^/]+)$/)) && method === 'PATCH') {
      const r = d.requests.find((x) => x.id === m[1]);
      if (!r) return send(res, 404, { error: 'Request not found' });
      const body = await readJson(req);
      if (!['pending', 'confirmed', 'done', 'cancelled'].includes(body.status)) return send(res, 400, { error: 'Unknown status' });
      r.status = body.status;
      r.updatedAt = new Date().toISOString();
      store.save();
      // Tell the customer, in their channel, when the owner confirms or cancels.
      if (body.notify && (body.status === 'confirmed' || body.status === 'cancelled')) {
        const c = d.conversations[r.conversationId];
        if (c) {
          const arabic = c.messages.some((x) => x.role === 'customer' && /[؀-ۿ]/.test(x.text));
          const text = body.status === 'confirmed'
            ? (arabic ? `تم تأكيد طلبك رقم ${r.id} ✅` : `Your request ${r.id} is confirmed ✅`)
            : (arabic ? `للأسف تم إلغاء طلبك رقم ${r.id}. لو محتاج أي مساعدة احنا موجودين.` : `Sorry, your request ${r.id} was cancelled. Reply here if you need help.`);
          try {
            await sendTo(c.channel, c.externalId, text);
            store.addMessage(c, 'owner', text);
          } catch (err) {
            return send(res, 200, { request: r, warning: `Saved, but the customer was not notified: ${err.message}` });
          }
        }
      }
      return send(res, 200, { request: r });
    }

    if (p === '/api/profile' && method === 'GET') return send(res, 200, { profile: d.profile });
    if (p === '/api/profile' && method === 'PUT') {
      const body = await readJson(req);
      for (const k of Object.keys(d.profile)) if (typeof body[k] === 'string') d.profile[k] = body[k].slice(0, 20000);
      store.save();
      return send(res, 200, { profile: d.profile });
    }

    if (p === '/api/knowledge' && method === 'GET') {
      return send(res, 200, { knowledge: d.knowledge.map((k) => ({ ...k, text: k.text.slice(0, 400), length: k.text.length })) });
    }
    if (p === '/api/knowledge' && method === 'POST') {
      const body = await readJson(req);
      const text = String(body.text || '').trim();
      if (!text) return send(res, 400, { error: 'Document is empty' });
      const k = store.addKnowledge(String(body.title || '').slice(0, 200), text.slice(0, 500_000));
      return send(res, 200, { knowledge: { ...k, text: k.text.slice(0, 400), length: k.text.length } });
    }
    if ((m = p.match(/^\/api\/knowledge\/([^/]+)$/)) && method === 'DELETE') {
      d.knowledge = d.knowledge.filter((k) => k.id !== m[1]);
      store.save();
      return send(res, 200, { ok: true });
    }

    if (p === '/api/settings' && method === 'GET') {
      return send(res, 200, { settings: maskedSettings(), claudeModels: CLAUDE_MODELS, webhookPath: '/webhooks/meta' });
    }
    if (p === '/api/settings' && method === 'PUT') {
      const body = await readJson(req);
      mergeSecrets(d.settings, body.settings || {});
      store.save();
      await telegram.sync();
      return send(res, 200, { settings: maskedSettings() });
    }

    if (p === '/api/channels' && method === 'GET') return send(res, 200, { channels: channelStatus() });

    if (p === '/api/playground' && method === 'POST') {
      const body = await readJson(req);
      if (body.reset) {
        delete d.conversations[store.conversationKey('test', 'owner')];
        store.save();
        return send(res, 200, { ok: true });
      }
      const text = String(body.text || '').trim().slice(0, 2000);
      if (!text) return send(res, 400, { error: 'Message is empty' });
      const conv = d.conversations[store.conversationKey('test', 'owner')];
      if (conv) conv.mode = 'bot';
      const { reply, conversation } = await agent.handleIncoming({ channel: 'test', externalId: 'owner', name: 'Test', text });
      return send(res, 200, { reply, error: conversation.lastError && Date.now() - Date.parse(conversation.lastError.at) < 5000 ? conversation.lastError : null });
    }

    if (p === '/api/password' && method === 'POST') {
      const body = await readJson(req);
      if (!verifyPassword(String(body.current || ''), d.admin)) return send(res, 401, { error: 'Current password is wrong' });
      if (String(body.next || '').length < 8) return send(res, 400, { error: 'New password must be at least 8 characters' });
      d.admin = hashPassword(String(body.next));
      store.flush();
      return send(res, 200, { ok: true }, { 'set-cookie': sessionCookie(req, createSession(d.meta.secret, d.admin.hash), 30 * 86400) });
    }

    return send(res, 404, { error: 'Not found' });
  }

  const server = http.createServer((req, res) => {
    route(req, res).catch((err) => {
      const status = err.status || 500;
      if (status === 500) console.error('[http]', err);
      if (!res.headersSent) send(res, status, { error: status === 500 ? 'Internal error' : err.message });
    });
  });

  return {
    server,
    store,
    agent,
    telegram,
    meta,
    async start(port) {
      await telegram.sync();
      await new Promise((r) => server.listen(port, r));
      return server.address().port;
    },
    async stop() {
      telegram.stop();
      store.flush();
      await new Promise((r) => server.close(r));
    },
  };
}

// First boot only: let docker-compose / hosting panels preconfigure the AI.
function applyEnvDefaults(store, env) {
  if (store.data.admin) return;
  const ai = store.data.settings.ai;
  if (env.AI_PROVIDER === 'openai' || env.AI_PROVIDER === 'anthropic') ai.provider = env.AI_PROVIDER;
  if (env.AI_MODEL) ai.model = env.AI_MODEL;
  if (env.AI_BASE_URL) ai.baseUrl = env.AI_BASE_URL;
  if (env.AI_API_KEY) ai.apiKey = env.AI_API_KEY;
  store.save();
}
