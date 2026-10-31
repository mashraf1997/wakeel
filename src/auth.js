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

export function createSession(secret, passwordHash) {
  // Binding to the password hash logs out every session when the password changes.
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_DAYS * 864e5, v: passwordHash.slice(0, 16) })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function checkSession(secret, passwordHash, token) {
  if (!token || !passwordHash) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.exp > Date.now() && data.v === passwordHash.slice(0, 16);
  } catch {
    return false;
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
