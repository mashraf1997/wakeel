// Tiny JSON-file database. One file, atomic writes, no native modules,
// so Wakeel runs on any Node host (shared web-app hosting or a VPS).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MAX_MESSAGES_PER_CONVERSATION = 500;

export function defaultData() {
  return {
    version: 1,
    meta: { secret: crypto.randomBytes(32).toString('hex'), createdAt: new Date().toISOString() },
    admin: null, // { salt, hash }
    profile: {
      businessName: '',
      description: '',
      hours: '',
      address: '',
      phone: '',
      products: '',
      policies: '',
      language: 'auto',
      tone: 'friendly',
      currency: '',
    },
    settings: {
      botEnabled: true,
      ai: {
        provider: 'anthropic', // 'anthropic' | 'openai'
        model: 'claude-opus-5-5',
        apiKey: '',
        baseUrl: '',
        effort: 'low',
        vision: false, // OpenAI-compatible models only; Claude always sees images
      },
      channels: {
        telegram: { enabled: false, token: '' },
        whatsapp: { enabled: false, token: '', phoneNumberId: '', verifyToken: crypto.randomBytes(12).toString('hex'), appSecret: '' },
        instagram: { enabled: false, pageToken: '', verifyToken: '', appSecret: '' },
        messenger: { enabled: false, pageToken: '', verifyToken: '', appSecret: '' },
      },
      widget: { color: '#0F766E', greeting: '', title: '' },
      // Speech-to-text for voice notes (any OpenAI-compatible /audio/transcriptions API)
      transcription: { baseUrl: '', apiKey: '', model: '' },
      notify: {
        linkCode: crypto.randomBytes(6).toString('hex'),
        telegramChats: [], // owner chat ids linked with /start <linkCode>
        webhookUrl: '',
        events: { order: true, booking: true, handoff: true, error: true, payment: true, lowRating: true, summary: true },
      },
      catalog: { source: 'none', url: '', intervalMinutes: 60 }, // none | dukkan | woocommerce | shopify
      calendar: {
        enabled: false,
        icsUrl: '',
        timezone: '',
        open: '10:00',
        close: '22:00',
        closedDays: [], // 0 = Sunday ... 6 = Saturday
        slotMinutes: 30,
      },
      followups: { enabled: true },
      summary: { enabled: true, hour: 22, lastSentDate: '' },
      ratings: { enabled: true },
      payments: {
        provider: 'none', // none | stripe | paymob
        currency: '',
        stripeSecretKey: '',
        stripeWebhookSecret: '',
        paymobSecretKey: '',
        paymobPublicKey: '',
        paymobIntegrationIds: '',
      },
    },
    catalog: { products: [], shop: null, syncedAt: null, error: null },
    gaps: [], // questions the assistant could not answer: { id, question, count, firstAt, lastAt, conversationId, status }
    followups: [], // { id, conversationId, dueAt, note, status, createdAt }
    ratings: [], // { conversationId, requestId, score, at }
    users: [], // staff logins: { id, name, username, role: 'agent', salt, hash, createdAt }
    library: [], // owner images the assistant may send: { id, name, file, mime, createdAt }
    knowledge: [], // { id, title, text, createdAt }
    conversations: {}, // id -> conversation
    requests: [], // orders and bookings
  };
}

export class Store {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.file = path.join(dataDir, 'wakeel.json');
    this.timer = null;
    fs.mkdirSync(dataDir, { recursive: true });
    if (fs.existsSync(this.file)) {
      const loaded = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.data = mergeDefaults(defaultData(), loaded);
    } else {
      this.data = defaultData();
      this.flush();
    }
  }

  save() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 200);
  }

  flush() {
    clearTimeout(this.timer);
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data));
    fs.renameSync(tmp, this.file);
  }

  // ---------- conversations ----------
  conversationKey(channel, externalId) {
    return `${channel}:${externalId}`;
  }

  getOrCreateConversation(channel, externalId, name) {
    const id = this.conversationKey(channel, externalId);
    let c = this.data.conversations[id];
    if (!c) {
      c = {
        id,
        channel,
        externalId: String(externalId),
        name: name || '',
        mode: 'bot', // 'bot' | 'human'
        needsAttention: false,
        unread: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      };
      this.data.conversations[id] = c;
    } else if (name && !c.name) {
      c.name = name;
    }
    return c;
  }

  addMessage(conversation, role, text, extra = {}) {
    const msg = { id: crypto.randomUUID(), role, text, at: new Date().toISOString(), ...extra };
    conversation.messages.push(msg);
    if (conversation.messages.length > MAX_MESSAGES_PER_CONVERSATION) {
      conversation.messages.splice(0, conversation.messages.length - MAX_MESSAGES_PER_CONVERSATION);
    }
    conversation.updatedAt = msg.at;
    if (role === 'customer') conversation.unread += 1;
    this.save();
    return msg;
  }

  listConversations() {
    return Object.values(this.data.conversations)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(({ messages, ...rest }) => ({
        ...rest,
        lastMessage: messages[messages.length - 1] || null,
      }));
  }

  // ---------- requests (orders / bookings) ----------
  addRequest(req) {
    // Short, phone-friendly reference: R + 5 chars without look-alikes (0/O, 1/I).
    const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let id;
    do {
      id = 'R' + [...crypto.randomBytes(5)].map((b) => alphabet[b % alphabet.length]).join('');
    } while (this.data.requests.some((x) => x.id === id));
    const r = {
      id,
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...req,
    };
    this.data.requests.unshift(r);
    this.save();
    return r;
  }

  // ---------- media files ----------
  get mediaDir() {
    const dir = path.join(this.dataDir, 'media');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  saveMedia(buffer, mime) {
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/webm': 'webm', 'audio/wav': 'wav' }[String(mime).split(';')[0]] || 'bin';
    const file = `${crypto.randomUUID()}.${ext}`;
    fs.writeFileSync(path.join(this.mediaDir, file), buffer);
    return file;
  }

  mediaPath(file) {
    if (!/^[\w-]+\.[a-z0-9]+$/.test(file || '')) return null;
    const full = path.join(this.mediaDir, file);
    return fs.existsSync(full) ? full : null;
  }

  // ---------- knowledge ----------
  addKnowledge(title, text) {
    const k = { id: crypto.randomUUID(), title: title || 'Untitled', text, createdAt: new Date().toISOString() };
    this.data.knowledge.push(k);
    this.save();
    return k;
  }
}

function mergeDefaults(defaults, loaded) {
  if (Array.isArray(defaults) || typeof defaults !== 'object' || defaults === null) {
    return loaded === undefined ? defaults : loaded;
  }
  const out = { ...defaults };
  for (const [k, v] of Object.entries(loaded || {})) {
    if (k in defaults && defaults[k] && typeof defaults[k] === 'object' && !Array.isArray(defaults[k]) && v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = mergeDefaults(defaults[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
