// WhatsApp Cloud API, Instagram Messaging and Facebook Messenger share Meta's
// webhook format. Uses the official APIs only, so business accounts are not at risk of bans.
import crypto from 'node:crypto';
import fs from 'node:fs';
import { download, MAX_AUDIO_BYTES, MAX_IMAGE_BYTES } from '../media.js';

const GRAPH = () => `${process.env.META_GRAPH_URL || 'https://graph.facebook.com'}/${process.env.META_GRAPH_VERSION || 'v23.0'}`;
const CHANNELS = ['whatsapp', 'instagram', 'messenger'];

export class MetaChannels {
  constructor(store, onMessage, { publicUrl } = {}) {
    this.store = store;
    this.onMessage = onMessage;
    this.publicUrl = publicUrl || (() => null);
    this.lastEvent = Object.fromEntries(CHANNELS.map((c) => [c, null]));
    this.lastError = Object.fromEntries(CHANNELS.map((c) => [c, null]));
  }

  cfg(channel) {
    return this.store.data.settings.channels[channel];
  }

  // GET /webhooks/meta — Meta's subscription handshake
  verify(query) {
    const mode = query.get('hub.mode');
    const token = query.get('hub.verify_token');
    const challenge = query.get('hub.challenge');
    const valid = CHANNELS.map((c) => this.cfg(c).verifyToken).filter(Boolean);
    if (mode === 'subscribe' && token && valid.includes(token)) return challenge;
    return null;
  }

  // Verifies X-Hub-Signature-256 when an app secret is configured.
  checkSignature(rawBody, header) {
    const secrets = CHANNELS.map((c) => this.cfg(c).appSecret).filter(Boolean);
    if (!secrets.length) return true;
    if (!header || !header.startsWith('sha256=')) return false;
    const given = Buffer.from(header.slice(7), 'hex');
    return secrets.some((s) => {
      const expected = crypto.createHmac('sha256', s).update(rawBody).digest();
      return expected.length === given.length && crypto.timingSafeEqual(expected, given);
    });
  }

  waMediaFetcher(mediaId, maxBytes) {
    const token = this.cfg('whatsapp').token;
    return async () => {
      const res = await fetch(`${GRAPH()}/${mediaId}`, { headers: { authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Media lookup failed: HTTP ${res.status}`);
      const info = await res.json();
      const file = await download(info.url, { authorization: `Bearer ${token}` }, maxBytes);
      return { buffer: file.buffer, mime: info.mime_type?.split(';')[0] || file.mime };
    };
  }

  // POST /webhooks/meta
  handle(payload) {
    const wa = this.cfg('whatsapp');
    if (payload.object === 'whatsapp_business_account' && wa.enabled) {
      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value || {};
          const names = Object.fromEntries((value.contacts || []).map((c) => [c.wa_id, c.profile?.name || '']));
          for (const m of value.messages || []) {
            this.lastEvent.whatsapp = new Date().toISOString();
            const msg = { channel: 'whatsapp', externalId: m.from, name: names[m.from] || '', text: '' };
            if (m.type === 'text') msg.text = m.text?.body;
            else if (m.type === 'button') msg.text = m.button?.text;
            else if (m.type === 'interactive') msg.text = m.interactive?.button_reply?.title || m.interactive?.list_reply?.title;
            else if (m.type === 'audio' || m.type === 'voice') msg.media = { kind: 'audio', fetch: this.waMediaFetcher((m.audio || m.voice).id, MAX_AUDIO_BYTES) };
            else if (m.type === 'image') {
              msg.text = m.image?.caption || '';
              msg.media = { kind: 'image', fetch: this.waMediaFetcher(m.image.id, MAX_IMAGE_BYTES) };
            } else if (m.type === 'location') {
              const l = m.location || {};
              msg.text = `📍 ${[l.name, l.address].filter(Boolean).join(', ')} (https://maps.google.com/?q=${l.latitude},${l.longitude})`;
            }
            if (!msg.text && !msg.media) {
              this.send('whatsapp', m.from, unsupportedText()).catch(() => {});
              continue;
            }
            this.dispatch(msg);
          }
        }
      }
      return;
    }

    const channel = payload.object === 'instagram' ? 'instagram' : payload.object === 'page' ? 'messenger' : null;
    if (!channel || !this.cfg(channel).enabled) return;
    for (const entry of payload.entry || []) {
      for (const ev of entry.messaging || []) {
        if (!ev.message || ev.message.is_echo || !ev.sender?.id) continue;
        this.lastEvent[channel] = new Date().toISOString();
        const msg = { channel, externalId: ev.sender.id, name: '', text: ev.message.text || '' };
        const att = (ev.message.attachments || [])[0];
        if (att?.type === 'audio' && att.payload?.url) msg.media = { kind: 'audio', fetch: () => download(att.payload.url, {}, MAX_AUDIO_BYTES) };
        else if (att?.type === 'image' && att.payload?.url) msg.media = { kind: 'image', fetch: () => download(att.payload.url, {}, MAX_IMAGE_BYTES) };
        if (!msg.text && !msg.media) {
          this.send(channel, ev.sender.id, unsupportedText()).catch(() => {});
          continue;
        }
        this.dispatch(msg);
      }
    }
  }

  dispatch(msg) {
    msg.text = String(msg.text || '').slice(0, 4000);
    this.onMessage(msg).catch((e) => console.error(`[${msg.channel}] handler`, e.message));
  }

  async post(channel, url, init) {
    const res = await fetch(url, init);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = body.error?.message || `HTTP ${res.status}`;
      this.lastError[channel] = msg;
      throw new Error(msg);
    }
    this.lastError[channel] = null;
    return body;
  }

  async send(channel, to, text) {
    if (channel === 'whatsapp') {
      const wa = this.cfg('whatsapp');
      if (!wa.token || !wa.phoneNumberId) throw new Error('WhatsApp is not configured');
      return this.post(channel, `${GRAPH()}/${wa.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${wa.token}` },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text.slice(0, 4096) } }),
      });
    }
    const c = this.cfg(channel);
    if (!c.pageToken) throw new Error(`${channel} is not configured`);
    return this.post(channel, `${GRAPH()}/me/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${c.pageToken}` },
      body: JSON.stringify({ recipient: { id: to }, messaging_type: 'RESPONSE', message: { text: text.slice(0, 1000) } }),
    });
  }

  async sendImage(channel, to, filePath, mime, publicPath) {
    if (channel === 'whatsapp') {
      const wa = this.cfg('whatsapp');
      if (!wa.token || !wa.phoneNumberId) throw new Error('WhatsApp is not configured');
      const form = new FormData();
      form.append('messaging_product', 'whatsapp');
      form.append('type', mime);
      form.append('file', new Blob([fs.readFileSync(filePath)], { type: mime }), 'image');
      const up = await this.post(channel, `${GRAPH()}/${wa.phoneNumberId}/media`, { method: 'POST', headers: { authorization: `Bearer ${wa.token}` }, body: form });
      return this.post(channel, `${GRAPH()}/${wa.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${wa.token}` },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'image', image: { id: up.id } }),
      });
    }
    // Instagram and Messenger fetch the image from a public URL.
    const base = this.publicUrl();
    if (!base) throw new Error('Public URL unknown: open the dashboard once from your domain');
    const c = this.cfg(channel);
    return this.post(channel, `${GRAPH()}/me/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${c.pageToken}` },
      body: JSON.stringify({ recipient: { id: to }, messaging_type: 'RESPONSE', message: { attachment: { type: 'image', payload: { url: base + publicPath, is_reusable: true } } } }),
    });
  }

  status() {
    const s = {};
    for (const c of CHANNELS) {
      const cfg = this.cfg(c);
      const configured = c === 'whatsapp' ? Boolean(cfg.enabled && cfg.token && cfg.phoneNumberId) : Boolean(cfg.enabled && cfg.pageToken);
      s[c] = { configured, lastEvent: this.lastEvent[c], error: this.lastError[c] };
    }
    return s;
  }
}

function unsupportedText() {
  return 'لسه بفهم الرسائل المكتوبة والصوتية والصور بس 🙏 ممكن تكتب طلبك؟\nI can read text, voice notes and photos. Could you type your message?';
}
