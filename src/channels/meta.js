// WhatsApp Cloud API and Instagram Messaging share Meta's webhook format.
// Uses the official APIs only, so business numbers are not at risk of bans.
import crypto from 'node:crypto';

const GRAPH = () => `${process.env.META_GRAPH_URL || 'https://graph.facebook.com'}/${process.env.META_GRAPH_VERSION || 'v23.0'}`;

export class MetaChannels {
  constructor(store, onMessage) {
    this.store = store;
    this.onMessage = onMessage;
    this.lastEvent = { whatsapp: null, instagram: null };
    this.lastError = { whatsapp: null, instagram: null };
  }

  get wa() {
    return this.store.data.settings.channels.whatsapp;
  }
  get ig() {
    return this.store.data.settings.channels.instagram;
  }

  // GET /webhooks/meta — Meta's subscription handshake
  verify(query) {
    const mode = query.get('hub.mode');
    const token = query.get('hub.verify_token');
    const challenge = query.get('hub.challenge');
    const valid = [this.wa.verifyToken, this.ig.verifyToken].filter(Boolean);
    if (mode === 'subscribe' && token && valid.includes(token)) return challenge;
    return null;
  }

  // Verifies X-Hub-Signature-256 when an app secret is configured.
  checkSignature(rawBody, header) {
    const secrets = [this.wa.appSecret, this.ig.appSecret].filter(Boolean);
    if (!secrets.length) return true;
    if (!header || !header.startsWith('sha256=')) return false;
    const given = Buffer.from(header.slice(7), 'hex');
    return secrets.some((s) => {
      const expected = crypto.createHmac('sha256', s).update(rawBody).digest();
      return expected.length === given.length && crypto.timingSafeEqual(expected, given);
    });
  }

  // POST /webhooks/meta
  handle(payload) {
    if (payload.object === 'whatsapp_business_account' && this.wa.enabled) {
      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value || {};
          const names = Object.fromEntries((value.contacts || []).map((c) => [c.wa_id, c.profile?.name || '']));
          for (const m of value.messages || []) {
            this.lastEvent.whatsapp = new Date().toISOString();
            const text = m.type === 'text' ? m.text?.body : m.type === 'button' ? m.button?.text : m.type === 'interactive' ? (m.interactive?.button_reply?.title || m.interactive?.list_reply?.title) : null;
            if (!text) {
              this.send('whatsapp', m.from, unsupportedText()).catch(() => {});
              continue;
            }
            this.dispatch({ channel: 'whatsapp', externalId: m.from, name: names[m.from] || '', text });
          }
        }
      }
    } else if (payload.object === 'instagram' && this.ig.enabled) {
      for (const entry of payload.entry || []) {
        for (const ev of entry.messaging || []) {
          if (!ev.message || ev.message.is_echo || !ev.sender?.id) continue;
          this.lastEvent.instagram = new Date().toISOString();
          if (!ev.message.text) {
            this.send('instagram', ev.sender.id, unsupportedText()).catch(() => {});
            continue;
          }
          this.dispatch({ channel: 'instagram', externalId: ev.sender.id, name: '', text: ev.message.text });
        }
      }
    }
  }

  dispatch(msg) {
    msg.text = String(msg.text).slice(0, 4000);
    this.onMessage(msg).catch((e) => console.error(`[${msg.channel}] handler`, e.message));
  }

  async send(channel, to, text) {
    let res;
    if (channel === 'whatsapp') {
      if (!this.wa.token || !this.wa.phoneNumberId) throw new Error('WhatsApp is not configured');
      res = await fetch(`${GRAPH()}/${this.wa.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.wa.token}` },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text.slice(0, 4096) } }),
      });
    } else {
      if (!this.ig.pageToken) throw new Error('Instagram is not configured');
      res = await fetch(`${GRAPH()}/me/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.ig.pageToken}` },
        body: JSON.stringify({ recipient: { id: to }, message: { text: text.slice(0, 1000) } }),
      });
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body.error?.message || `HTTP ${res.status}`;
      this.lastError[channel] = msg;
      throw new Error(msg);
    }
    this.lastError[channel] = null;
  }

  status() {
    return {
      whatsapp: { configured: Boolean(this.wa.enabled && this.wa.token && this.wa.phoneNumberId), lastEvent: this.lastEvent.whatsapp, error: this.lastError.whatsapp },
      instagram: { configured: Boolean(this.ig.enabled && this.ig.pageToken), lastEvent: this.lastEvent.instagram, error: this.lastError.instagram },
    };
  }
}

function unsupportedText() {
  return 'لسه بفهم الرسائل المكتوبة بس 🙏 ممكن تكتب طلبك؟\nI can only read text messages for now. Could you type it?';
}
