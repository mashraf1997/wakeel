// Telegram via long polling: works behind any host, no public webhook URL needed.
import fs from 'node:fs';
import { download, MAX_AUDIO_BYTES, MAX_IMAGE_BYTES } from '../media.js';

export class TelegramChannel {
  constructor(store, onMessage) {
    this.store = store;
    this.onMessage = onMessage;
    this.onOwnerMessage = null; // (chatId, text) => boolean, set by the tenant
    this.running = false;
    this.offset = 0;
    this.token = null;
    this.botInfo = null;
    this.lastError = null;
    this.apiBase = process.env.TELEGRAM_API_URL || 'https://api.telegram.org';
  }

  get config() {
    return this.store.data.settings.channels.telegram;
  }

  api(method, body, signal) {
    return fetch(`${this.apiBase}/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body || {}),
      signal,
    }).then((r) => r.json());
  }

  // Start, stop or restart to match current settings.
  async sync() {
    const { enabled, token } = this.config;
    if (!enabled || !token) return this.stop();
    if (this.running && this.token === token) return;
    this.stop();
    this.token = token;
    this.running = true;
    this.lastError = null;
    try {
      const me = await this.api('getMe');
      if (!me.ok) throw new Error(me.description || 'Invalid bot token');
      this.botInfo = me.result;
      await this.api('deleteWebhook', { drop_pending_updates: false });
    } catch (err) {
      this.lastError = err.message;
      this.running = false;
      console.error('[telegram]', err.message);
      return;
    }
    console.log(`[telegram] polling as @${this.botInfo.username}`);
    this.loop();
  }

  stop() {
    this.running = false;
    this.abort?.abort();
    this.botInfo = null;
  }

  fileFetcher(fileId, maxBytes) {
    return async () => {
      const f = await this.api('getFile', { file_id: fileId });
      if (!f.ok) throw new Error(f.description || 'getFile failed');
      return download(`${this.apiBase}/file/bot${this.token}/${f.result.file_path}`, {}, maxBytes);
    };
  }

  async loop() {
    const myToken = this.token;
    while (this.running && this.token === myToken) {
      this.abort = new AbortController();
      try {
        const res = await this.api('getUpdates', { offset: this.offset, timeout: 30, allowed_updates: ['message'] }, this.abort.signal);
        if (!res.ok) throw new Error(res.description || 'getUpdates failed');
        this.lastError = null;
        for (const u of res.result) {
          this.offset = u.update_id + 1;
          this.handleUpdate(u);
        }
      } catch (err) {
        if (!this.running) break;
        this.lastError = err.message;
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  handleUpdate(u) {
    const m = u.message;
    if (!m || m.chat?.type !== 'private') return;
    const chatId = String(m.chat.id);
    if (this.onOwnerMessage && this.onOwnerMessage(chatId, m.text || '')) return;
    const name = [m.from?.first_name, m.from?.last_name].filter(Boolean).join(' ');
    const msg = { channel: 'telegram', externalId: chatId, name, text: (m.text || m.caption || '').slice(0, 4000) };
    const voice = m.voice || m.audio;
    if (voice) msg.media = { kind: 'audio', fetch: this.fileFetcher(voice.file_id, MAX_AUDIO_BYTES) };
    else if (m.photo?.length) msg.media = { kind: 'image', fetch: this.fileFetcher(m.photo[m.photo.length - 1].file_id, MAX_IMAGE_BYTES) };
    if (!msg.text && !msg.media) return;
    this.onMessage(msg).catch((e) => console.error('[telegram] handler', e.message));
  }

  async send(chatId, text) {
    if (!this.token) throw new Error('Telegram is not connected');
    const res = await this.api('sendMessage', { chat_id: chatId, text });
    if (!res.ok) throw new Error(res.description || 'sendMessage failed');
  }

  async sendImage(chatId, filePath, mime) {
    if (!this.token) throw new Error('Telegram is not connected');
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('photo', new Blob([fs.readFileSync(filePath)], { type: mime }), 'image');
    const res = await fetch(`${this.apiBase}/bot${this.token}/sendPhoto`, { method: 'POST', body: form }).then((r) => r.json());
    if (!res.ok) throw new Error(res.description || 'sendPhoto failed');
  }

  status() {
    return {
      connected: Boolean(this.running && this.botInfo),
      username: this.botInfo?.username || null,
      error: this.lastError,
    };
  }
}
