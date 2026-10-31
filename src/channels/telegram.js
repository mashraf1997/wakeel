// Telegram via long polling: works behind any host, no public webhook URL needed.
export class TelegramChannel {
  constructor(store, onMessage) {
    this.store = store;
    this.onMessage = onMessage;
    this.running = false;
    this.offset = 0;
    this.token = null;
    this.botInfo = null;
    this.lastError = null;
  }

  get config() {
    return this.store.data.settings.channels.telegram;
  }

  api(method, body, signal) {
    return fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
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
          const m = u.message;
          if (!m || !m.text || m.chat?.type !== 'private') continue;
          const name = [m.from?.first_name, m.from?.last_name].filter(Boolean).join(' ');
          this.onMessage({ channel: 'telegram', externalId: String(m.chat.id), name, text: m.text.slice(0, 4000) })
            .catch((e) => console.error('[telegram] handler', e.message));
        }
      } catch (err) {
        if (!this.running) break;
        this.lastError = err.message;
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  async send(chatId, text) {
    if (!this.token) throw new Error('Telegram is not connected');
    const res = await this.api('sendMessage', { chat_id: chatId, text });
    if (!res.ok) throw new Error(res.description || 'sendMessage failed');
  }

  status() {
    return {
      connected: Boolean(this.running && this.botInfo),
      username: this.botInfo?.username || null,
      error: this.lastError,
    };
  }
}
