// HTTP server. Serves the main business at "/" and, in agency mode,
// more businesses at "/b/<slug>/", each with its own data and channels.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createTenant, tenantDataDir } from './tenant.js';
import { hashPassword } from './auth.js';
import { send, readJson, clientIp, serveStatic, cookie } from './http.js';
import { parseCookies, RateLimiter } from './auth.js';

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export function createApp({ dataDir, setupToken = process.env.SETUP_TOKEN || '', agencyPassword = process.env.AGENCY_PASSWORD || '', env = process.env } = {}) {
  fs.mkdirSync(dataDir, { recursive: true });
  const registryFile = path.join(dataDir, 'agency.json');
  const registry = fs.existsSync(registryFile)
    ? JSON.parse(fs.readFileSync(registryFile, 'utf8'))
    : { secret: crypto.randomBytes(32).toString('hex'), tenants: [] };
  const saveRegistry = () => {
    fs.writeFileSync(registryFile + '.tmp', JSON.stringify(registry, null, 2));
    fs.renameSync(registryFile + '.tmp', registryFile);
  };
  if (!fs.existsSync(registryFile)) saveRegistry();

  // ---------- agency session ----------
  const agencyLimiter = new RateLimiter(10, 15 * 60_000);
  const agencyToken = () => crypto.createHmac('sha256', registry.secret).update('agency:' + agencyPassword).digest('base64url');
  const isAgencyAuthed = (req) => {
    if (!agencyPassword) return false;
    const given = Buffer.from(parseCookies(req.headers.cookie).wk_agency || '');
    const expected = Buffer.from(agencyToken());
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  };

  // ---------- tenants ----------
  const root = createTenant({ dataDir, setupToken, env, isAgencyAuthed });
  const tenants = new Map(); // slug -> tenant

  async function loadTenant(slug) {
    if (tenants.has(slug)) return tenants.get(slug);
    const t = createTenant({ dataDir: tenantDataDir(dataDir, slug), slug, basePath: `/b/${slug}`, env, isAgencyAuthed });
    tenants.set(slug, t);
    await t.start();
    return t;
  }

  // ---------- agency console ----------
  async function agencyRoutes(req, res, p) {
    if (!agencyPassword) return send(res, 404, 'Agency mode is off. Set AGENCY_PASSWORD to turn it on.');
    if (p === '/agency' || p === '/agency/') return serveStatic(res, 'agency.html');
    if (p === '/api/agency/login' && req.method === 'POST') {
      if (!agencyLimiter.allow(clientIp(req))) return send(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
      const body = await readJson(req);
      const a = Buffer.from(String(body.password || ''));
      const b = Buffer.from(agencyPassword);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return send(res, 401, { error: 'Wrong password' });
      return send(res, 200, { ok: true }, { 'set-cookie': cookie(req, 'wk_agency', agencyToken(), 30 * 86400) });
    }
    if (p === '/api/agency/logout' && req.method === 'POST') return send(res, 200, { ok: true }, { 'set-cookie': cookie(req, 'wk_agency', '', 0) });
    if (!isAgencyAuthed(req)) return send(res, 401, { error: 'Not signed in' });
    if (req.method !== 'GET' && !(req.headers['content-type'] || '').includes('application/json')) return send(res, 415, { error: 'Send JSON' });

    if (p === '/api/agency/tenants' && req.method === 'GET') {
      const list = [{ slug: '', path: '/', ...summary(root) }];
      for (const t of registry.tenants) list.push({ slug: t.slug, path: `/b/${t.slug}/`, createdAt: t.createdAt, ...summary(await loadTenant(t.slug)) });
      return send(res, 200, { tenants: list });
    }
    if (p === '/api/agency/tenants' && req.method === 'POST') {
      const body = await readJson(req);
      const slug = String(body.slug || '').trim().toLowerCase();
      if (!SLUG_RE.test(slug)) return send(res, 400, { error: 'Use 1-40 lowercase letters, digits or dashes for the link name' });
      if (registry.tenants.some((t) => t.slug === slug)) return send(res, 409, { error: 'That link name is taken' });
      const password = String(body.password || '');
      if (password && password.length < 8) return send(res, 400, { error: 'Password must be at least 8 characters' });
      registry.tenants.push({ slug, createdAt: new Date().toISOString() });
      saveRegistry();
      const t = await loadTenant(slug);
      if (body.name) t.store.data.profile.businessName = String(body.name).slice(0, 120);
      if (password) t.store.data.admin = hashPassword(password);
      if (body.template) (await import('./templates.js')).applyTemplate(t.store, body.template, body.lang === 'en' ? 'en' : 'ar');
      t.store.flush();
      return send(res, 200, { slug, path: `/b/${slug}/` });
    }
    let m;
    if ((m = p.match(/^\/api\/agency\/tenants\/([a-z0-9-]+)$/)) && req.method === 'DELETE') {
      // Archive: stop serving it; the data folder is kept on disk.
      const slug = m[1];
      registry.tenants = registry.tenants.filter((t) => t.slug !== slug);
      saveRegistry();
      tenants.get(slug)?.stop();
      tenants.delete(slug);
      return send(res, 200, { ok: true });
    }
    return send(res, 404, { error: 'Not found' });
  }

  function summary(t) {
    const o = t.overview();
    const ch = o.channels;
    return {
      name: o.businessName,
      conversations: o.conversations,
      needsAttention: o.needsAttention,
      pendingRequests: o.pendingRequests,
      messages7d: o.customerMessages7d,
      setUp: Boolean(t.store.data.admin),
      channels: Object.entries(ch).filter(([k, v]) => k !== 'web' && (v.connected || v.configured)).map(([k]) => k),
    };
  }

  // ---------- dispatch ----------
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    (async () => {
      if (p === '/agency' || p === '/agency/' || p.startsWith('/api/agency/') || p === '/agency.js') {
        if (p === '/agency.js') return serveStatic(res, 'agency.js');
        return agencyRoutes(req, res, p);
      }
      const m = p.match(/^\/b\/([a-z0-9-]+)(\/.*)?$/);
      if (m) {
        if (!registry.tenants.some((t) => t.slug === m[1])) return send(res, 404, 'Not found');
        if (!m[2]) return send(res, 301, '', { location: `/b/${m[1]}/` });
        const t = await loadTenant(m[1]);
        return t.handle(req, res, url, m[2]);
      }
      return root.handle(req, res, url, p);
    })().catch((err) => {
      const status = err.status || 500;
      if (status === 500) console.error('[http]', err);
      if (!res.headersSent) send(res, status, { error: status === 500 ? 'Internal error' : err.message });
    });
  });

  return {
    server,
    root,
    // Backwards-compatible handles on the main business
    store: root.store,
    agent: root.agent,
    telegram: root.telegram,
    meta: root.meta,
    tenants,
    loadTenant,
    async start(port) {
      await root.start();
      for (const t of registry.tenants) await loadTenant(t.slug);
      await new Promise((r) => server.listen(port, r));
      return server.address().port;
    },
    async stop() {
      root.stop();
      for (const t of tenants.values()) t.stop();
      await new Promise((r) => server.close(r));
    },
  };
}
