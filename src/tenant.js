// One business: its data, channels, assistant and dashboard API.
// The server can run many of these side by side (agency mode).
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { Store } from './store.js';
import { Agent } from './agent.js';
import { CLAUDE_MODELS } from './ai.js';
import { TelegramChannel } from './channels/telegram.js';
import { MetaChannels } from './channels/meta.js';
import { Notifier } from './notify.js';
import { syncCatalog } from './catalog.js';
import { availability } from './calendar.js';
import { applyTemplate, TEMPLATES } from './templates.js';
import { sniffImageType, IMAGE_TYPES, MAX_IMAGE_BYTES } from './media.js';
import { hashPassword, verifyPassword, createSession, checkSession, parseCookies, RateLimiter } from './auth.js';
import { send, readJson, readBody, clientIp, originOf, serveStatic, sendFile, cookie, VERSION } from './http.js';

const MASK = '••••••';

export function createTenant({ dataDir, slug = '', basePath = '', setupToken = '', env = process.env, isAgencyAuthed = () => false }) {
  const store = new Store(dataDir);
  applyEnvDefaults(store, env);
  const cookieName = slug ? `wk_session_${slug}` : 'wk_session';

  const publicUrl = () => store.data.meta.publicUrl || null;
  const telegram = new TelegramChannel(store, onChannelMessage);
  const meta = new MetaChannels(store, onChannelMessage, { publicUrl });
  const notifier = new Notifier(store, { telegram, dashboardUrl: () => (publicUrl() ? publicUrl() + '/' : null) });
  const agent = new Agent(store, { notifier });

  telegram.onOwnerMessage = (chatId, text) => {
    if (notifier.tryLinkOwner(chatId, text)) {
      const ar = /[؀-ۿ]/.test(store.data.profile.businessName || '');
      telegram.send(chatId, ar ? '✅ تمام! هيوصلك هنا إشعار بكل طلب جديد أو عميل محتاجك.' : '✅ Done! You will get alerts here for new orders and customers who need you.').catch(() => {});
      return true;
    }
    return notifier.isOwnerChat(chatId);
  };

  const loginLimiter = new RateLimiter(10, 15 * 60_000);
  const widgetLimiter = new RateLimiter(30, 60_000);

  async function onChannelMessage(msg) {
    const { reply, images } = await agent.handleIncoming(msg);
    for (const img of images || []) await sendImageTo(msg.channel, msg.externalId, img).catch((e) => console.error(`[${msg.channel}] image`, e.message));
    if (reply) await sendTo(msg.channel, msg.externalId, reply);
  }

  async function sendTo(channel, externalId, text) {
    if (channel === 'telegram') return telegram.send(externalId, text);
    if (['whatsapp', 'instagram', 'messenger'].includes(channel)) return meta.send(channel, externalId, text);
    // 'web' and 'test' are pulled by the widget / dashboard
  }

  async function sendImageTo(channel, externalId, img) {
    const file = store.mediaPath(img.file);
    if (!file) throw new Error('Image file is missing');
    if (channel === 'telegram') return telegram.sendImage(externalId, file, img.mime);
    if (['whatsapp', 'instagram', 'messenger'].includes(channel)) return meta.sendImage(channel, externalId, file, img.mime, `/media/public/${img.id}`);
  }

  // ---------------- catalog sync schedule ----------------
  let catalogTimer = null;
  function scheduleCatalog() {
    clearInterval(catalogTimer);
    catalogTimer = setInterval(() => {
      const cfg = store.data.settings.catalog;
      if (cfg.source === 'none' || !cfg.url) return;
      const last = Date.parse(store.data.catalog.syncedAt || store.data.catalog.errorAt || 0) || 0;
      if (Date.now() - last >= Math.max(5, Number(cfg.intervalMinutes) || 60) * 60_000) syncCatalog(store).catch(() => {});
    }, 60_000);
    catalogTimer.unref?.();
  }

  // ---------------- auth ----------------
  const isAuthed = (req) => {
    if (isAgencyAuthed(req)) return true;
    const token = parseCookies(req.headers.cookie)[cookieName];
    return checkSession(store.data.meta.secret, store.data.admin?.hash, token);
  };
  const sessionCookie = (req, value, maxAge) => cookie(req, cookieName, value, maxAge, basePath || '/');
  const newSession = (req) => sessionCookie(req, createSession(store.data.meta.secret, store.data.admin.hash), 30 * 86400);

  // ---------------- views ----------------
  function maskedSettings() {
    const s = structuredClone(store.data.settings);
    const mask = (obj, key) => {
      if (obj[key]) obj[key] = MASK + String(obj[key]).slice(-4);
    };
    mask(s.ai, 'apiKey');
    mask(s.transcription, 'apiKey');
    mask(s.channels.telegram, 'token');
    mask(s.channels.whatsapp, 'token');
    mask(s.channels.whatsapp, 'appSecret');
    for (const c of ['instagram', 'messenger']) {
      mask(s.channels[c], 'pageToken');
      mask(s.channels[c], 'appSecret');
    }
    s.aiKeyFromEnv = !store.data.settings.ai.apiKey && Boolean(env.ANTHROPIC_API_KEY) && store.data.settings.ai.provider === 'anthropic';
    return s;
  }

  // Merge incoming settings, keeping secrets the client only saw masked.
  function mergeSecrets(target, incoming) {
    for (const [k, v] of Object.entries(incoming || {})) {
      if (!(k in target)) continue;
      if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) mergeSecrets(target[k], v);
      else if (typeof v === 'string' && v.startsWith(MASK)) continue;
      else if (Array.isArray(target[k]) && Array.isArray(v)) target[k] = v;
      else if (typeof target[k] === typeof v || target[k] === null || target[k] === '') target[k] = typeof v === 'string' ? v.trim() : v;
    }
  }

  function channelStatus() {
    return { web: { connected: true }, telegram: telegram.status(), ...meta.status() };
  }

  function overview() {
    const convs = Object.values(store.data.conversations).filter((c) => c.channel !== 'test');
    const since = Date.now() - 7 * 864e5;
    const days = [...Array(7)].map((_, i) => new Date(Date.now() - (6 - i) * 864e5).toISOString().slice(0, 10));
    const perDay = Object.fromEntries(days.map((d) => [d, 0]));
    const byChannel = { whatsapp: 0, instagram: 0, messenger: 0, telegram: 0, web: 0 };
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
    const pending = store.data.requests.filter((r) => r.status === 'pending');
    return {
      businessName: store.data.profile.businessName,
      conversations: convs.length,
      needsAttention: convs.filter((c) => c.needsAttention).length,
      pendingRequests: pending.length,
      latestPendingId: pending[0]?.id || null,
      customerMessages7d: customerMsgs,
      botReplies7d: botReplies,
      perDay: days.map((d) => ({ day: d, count: perDay[d] })),
      byChannel,
      aiReady: ai.provider === 'openai' ? Boolean(ai.model) : Boolean(ai.apiKey || env.ANTHROPIC_API_KEY),
      profileReady: Boolean(store.data.profile.businessName && (store.data.profile.products || store.data.knowledge.length || store.data.catalog.products.length)),
      notifyReady: Boolean(store.data.settings.notify.telegramChats.length || store.data.settings.notify.webhookUrl),
      channels: channelStatus(),
    };
  }

  const libraryView = (l) => ({ id: l.id, name: l.name, url: `${basePath}/media/public/${l.id}` });

  // ---------------- routes ----------------
  async function handle(req, res, url, p) {
    const method = req.method;

    // ----- public -----
    if (p === '/health') return send(res, 200, { ok: true, version: VERSION });
    if (p === '/widget.js') return serveStatic(res, 'widget.js', { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=300' });

    let m;
    if ((m = p.match(/^\/media\/public\/([\w-]+)$/)) && method === 'GET') {
      const img = store.data.library.find((l) => l.id === m[1]);
      return img ? sendFile(res, store.mediaPath(img.file), { 'cache-control': 'public, max-age=3600', 'access-control-allow-origin': '*' }) : send(res, 404, 'Not found');
    }

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
        const messages = (c?.messages || []).map((x) => ({
          id: x.id,
          from: x.role === 'customer' ? 'me' : 'them',
          text: x.libraryImage ? '' : x.text,
          image: x.libraryImage ? `${basePath}/media/public/${x.libraryImage}` : undefined,
          at: x.at,
        }));
        return send(res, 200, { messages }, cors);
      }
      if (p === '/api/widget/messages' && method === 'POST') {
        if (!widgetLimiter.allow(clientIp(req))) return send(res, 429, { error: 'Too many messages, slow down' }, cors);
        const body = await readJson(req);
        const id = String(body.visitor || '');
        const text = String(body.text || '').trim().slice(0, 2000);
        if (!/^[a-zA-Z0-9-]{8,64}$/.test(id) || !text) return send(res, 400, { error: 'visitor and text are required' }, cors);
        const { reply, images } = await agent.handleIncoming({ channel: 'web', externalId: id, name: String(body.name || '').slice(0, 80), text });
        return send(res, 200, { reply, images: (images || []).map(libraryView) }, cors);
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
      const authed = isAuthed(req);
      if (authed) {
        const pub = originOf(req) + basePath;
        if (store.data.meta.publicUrl !== pub) {
          store.data.meta.publicUrl = pub;
          store.save();
        }
      }
      return send(res, 200, { needsSetup: !store.data.admin, authed, setupTokenRequired: Boolean(setupToken), version: VERSION, basePath, templates: Object.keys(TEMPLATES) });
    }
    if (p === '/api/setup' && method === 'POST') {
      if (store.data.admin) return send(res, 409, { error: 'Already set up' });
      const body = await readJson(req);
      if (setupToken && body.setupToken !== setupToken) return send(res, 403, { error: 'Wrong setup token' });
      const password = String(body.password || '');
      if (password.length < 8) return send(res, 400, { error: 'Password must be at least 8 characters' });
      store.data.admin = hashPassword(password);
      if (body.businessName) store.data.profile.businessName = String(body.businessName).slice(0, 120);
      if (body.template) applyTemplate(store, String(body.template), body.lang === 'en' ? 'en' : 'ar');
      store.data.meta.publicUrl = originOf(req) + basePath;
      store.flush();
      return send(res, 200, { ok: true }, { 'set-cookie': newSession(req) });
    }
    if (p === '/api/login' && method === 'POST') {
      if (!loginLimiter.allow(clientIp(req))) return send(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
      const body = await readJson(req);
      if (!verifyPassword(String(body.password || ''), store.data.admin)) return send(res, 401, { error: 'Wrong password' });
      return send(res, 200, { ok: true }, { 'set-cookie': newSession(req) });
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
    const conv = (id) => d.conversations[decodeURIComponent(id)];

    if (p === '/api/overview' && method === 'GET') return send(res, 200, overview());

    if (p === '/api/conversations' && method === 'GET') return send(res, 200, { conversations: store.listConversations() });

    if ((m = p.match(/^\/api\/conversations\/([^/]+)$/))) {
      const c = conv(m[1]);
      if (!c) return send(res, 404, { error: 'Conversation not found' });
      if (method === 'GET') {
        c.unread = 0;
        store.save();
        return send(res, 200, { conversation: { ...c, messages: c.messages.map((x) => (x.libraryImage ? { ...x, imageUrl: `${basePath}/media/public/${x.libraryImage}` } : x)) } });
      }
      if (method === 'PATCH') {
        const body = await readJson(req);
        if (body.mode === 'bot' || body.mode === 'human') c.mode = body.mode;
        if (typeof body.needsAttention === 'boolean') c.needsAttention = body.needsAttention;
        if (body.mode === 'bot') c.lastError = null;
        store.save();
        return send(res, 200, { conversation: c });
      }
      if (method === 'DELETE') {
        delete d.conversations[c.id];
        store.save();
        return send(res, 200, { ok: true });
      }
    }
    if ((m = p.match(/^\/api\/conversations\/([^/]+)\/reply$/)) && method === 'POST') {
      const c = conv(m[1]);
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

    if ((m = p.match(/^\/api\/media\/([\w-]+\.[a-z0-9]+)$/)) && method === 'GET') {
      return sendFile(res, store.mediaPath(m[1]), { 'cache-control': 'private, max-age=86400' });
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
    if (p === '/api/template' && method === 'POST') {
      const body = await readJson(req);
      if (!TEMPLATES[body.template]) return send(res, 400, { error: 'Unknown template' });
      for (const k of ['description', 'hours', 'currency', 'products', 'policies']) if (body.overwrite) d.profile[k] = '';
      applyTemplate(store, body.template, body.lang === 'en' ? 'en' : 'ar');
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

    // ----- image library (menu, price list...) -----
    if (p === '/api/library' && method === 'GET') return send(res, 200, { library: d.library.map(libraryView) });
    if (p === '/api/library' && method === 'POST') {
      const body = await readJson(req);
      const name = String(body.name || '').trim().slice(0, 80);
      const buffer = Buffer.from(String(body.data || ''), 'base64');
      const mime = sniffImageType(buffer, String(body.mime || ''));
      if (!name) return send(res, 400, { error: 'Give the image a name, for example "Menu"' });
      if (!IMAGE_TYPES.has(mime) || buffer.length > MAX_IMAGE_BYTES) return send(res, 400, { error: 'Use a JPG, PNG or WebP image up to 5 MB' });
      const item = { id: crypto.randomUUID(), name, file: store.saveMedia(buffer, mime), mime, createdAt: new Date().toISOString() };
      d.library.push(item);
      store.save();
      return send(res, 200, { item: libraryView(item) });
    }
    if ((m = p.match(/^\/api\/library\/([\w-]+)$/)) && method === 'DELETE') {
      const item = d.library.find((l) => l.id === m[1]);
      if (item) {
        const file = store.mediaPath(item.file);
        if (file) fs.rmSync(file, { force: true });
        d.library = d.library.filter((l) => l.id !== m[1]);
        store.save();
      }
      return send(res, 200, { ok: true });
    }

    // ----- catalog -----
    if (p === '/api/catalog' && method === 'GET') {
      const c = d.catalog;
      return send(res, 200, { settings: d.settings.catalog, count: c.products.length, syncedAt: c.syncedAt, error: c.error, sample: c.products.slice(0, 8) });
    }
    if (p === '/api/catalog/sync' && method === 'POST') {
      const c = await syncCatalog(store);
      return send(res, 200, { count: c.products.length, syncedAt: c.syncedAt, error: c.error, sample: c.products.slice(0, 8) });
    }

    // ----- calendar -----
    if (p === '/api/availability' && method === 'GET') {
      try {
        return send(res, 200, await availability(store, url.searchParams.get('date')));
      } catch (err) {
        return send(res, 400, { error: err.message });
      }
    }

    // ----- notifications -----
    if (p === '/api/notify/test' && method === 'POST') {
      const fake = { id: 'RTEST1', type: 'order', customerName: 'Test', items: [{ name: 'Test item', quantity: 1 }], phone: '' };
      const saved = d.settings.notify.events.order;
      d.settings.notify.events.order = true;
      await notifier.send('order', { request: fake });
      d.settings.notify.events.order = saved;
      return send(res, 200, { ok: true, telegramChats: d.settings.notify.telegramChats.length, webhook: Boolean(d.settings.notify.webhookUrl) });
    }
    if (p === '/api/notify/unlink' && method === 'POST') {
      d.settings.notify.telegramChats = [];
      d.settings.notify.linkCode = crypto.randomBytes(6).toString('hex');
      store.save();
      return send(res, 200, { ok: true });
    }

    if (p === '/api/settings' && method === 'GET') {
      return send(res, 200, { settings: maskedSettings(), claudeModels: CLAUDE_MODELS, webhookPath: `${basePath}/webhooks/meta`, telegramBot: telegram.status().username });
    }
    if (p === '/api/settings' && method === 'PUT') {
      const body = await readJson(req);
      const before = JSON.stringify(d.settings.catalog);
      mergeSecrets(d.settings, body.settings || {});
      store.save();
      await telegram.sync();
      if (JSON.stringify(d.settings.catalog) !== before) syncCatalog(store).catch(() => {});
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
      const c = d.conversations[store.conversationKey('test', 'owner')];
      if (c) {
        c.mode = 'bot';
        c.lastError = null;
      }
      const { reply, images, conversation } = await agent.handleIncoming({ channel: 'test', externalId: 'owner', name: 'Test', text });
      return send(res, 200, { reply, images: (images || []).map(libraryView), error: conversation.lastError || null });
    }

    if (p === '/api/password' && method === 'POST') {
      const body = await readJson(req);
      if (!verifyPassword(String(body.current || ''), d.admin)) return send(res, 401, { error: 'Current password is wrong' });
      if (String(body.next || '').length < 8) return send(res, 400, { error: 'New password must be at least 8 characters' });
      d.admin = hashPassword(String(body.next));
      store.flush();
      return send(res, 200, { ok: true }, { 'set-cookie': newSession(req) });
    }

    return send(res, 404, { error: 'Not found' });
  }

  return {
    slug,
    store,
    agent,
    telegram,
    meta,
    notifier,
    handle,
    overview,
    async start() {
      await telegram.sync();
      scheduleCatalog();
      if (store.data.settings.catalog.source !== 'none' && !store.data.catalog.syncedAt) syncCatalog(store).catch(() => {});
    },
    stop() {
      telegram.stop();
      clearInterval(catalogTimer);
      store.flush();
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
  const tr = store.data.settings.transcription;
  if (env.TRANSCRIBE_BASE_URL) tr.baseUrl = env.TRANSCRIBE_BASE_URL;
  if (env.TRANSCRIBE_MODEL) tr.model = env.TRANSCRIBE_MODEL;
  if (env.TRANSCRIBE_API_KEY) tr.apiKey = env.TRANSCRIBE_API_KEY;
  store.save();
}

export function tenantDataDir(root, slug) {
  return path.join(root, 'tenants', slug);
}
