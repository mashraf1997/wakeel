import crypto from 'node:crypto';

const SESSION_DAYS = 30;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password, admin) {
  if (!admin) return false;
  const hash = crypto.scryptSync(password, admin.salt, 64);
  const expected = Buffer.from(admin.hash, 'hex');
  return hash.length === expected.length && crypto.timingSafeEqual(hash, expected);
}

export function createSession(secret, passwordHash, uid = 'owner') {
  // Binding to the password hash logs out every session when the password changes.
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_DAYS * 864e5, u: uid, v: passwordHash.slice(0, 16) })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

/**
 * @param hashFor (uid) => password hash of that user, or null
 * @returns the user id ('owner' or a staff id) or null
 */
export function checkSession(secret, token, hashFor) {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const uid = data.u || 'owner';
    const hash = hashFor(uid);
    return hash && data.exp > Date.now() && data.v === hash.slice(0, 16) ? uid : null;
  } catch {
    return null;
  }
}

export function parseCookies(header) {
  const out = {};
  for (const part of (header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

// Simple fixed-window limiter keyed by IP (or anything else).
export class RateLimiter {
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.hits = new Map();
  }
  allow(key) {
    const now = Date.now();
    let h = this.hits.get(key);
    if (!h || now - h.start > this.windowMs) {
      h = { start: now, count: 0 };
      this.hits.set(key, h);
    }
    h.count += 1;
    if (this.hits.size > 10000) this.hits.clear();
    return h.count <= this.limit;
  }
}
