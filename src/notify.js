// Tells the business owner about things that need them, outside the dashboard:
// Telegram messages to linked owner chats, and a JSON webhook (n8n, Make, Zapier...).

const LABELS = {
  order: { ar: '🛒 طلب جديد', en: '🛒 New order' },
  booking: { ar: '📅 حجز جديد', en: '📅 New booking' },
  handoff: { ar: '🙋 عميل محتاج يكلمك', en: '🙋 A customer needs you' },
  error: { ar: '⚠️ الوكيل ماقدرش يرد', en: '⚠️ The assistant could not reply' },
};

export class Notifier {
  constructor(store, { telegram, dashboardUrl }) {
    this.store = store;
    this.telegram = telegram;
    this.dashboardUrl = dashboardUrl; // () => string | null
    this.recentErrors = new Map();
  }

  get config() {
    return this.store.data.settings.notify;
  }

  lang() {
    return /[؀-ۿ]/.test(this.store.data.profile.businessName || '') ? 'ar' : 'en';
  }

  format(event, payload) {
    const L = this.lang();
    const lines = [LABELS[event][L]];
    const { request: r, conversation: c } = payload;
    const who = r?.customerName || c?.name || c?.externalId || '';
    if (who) lines.push(`${L === 'ar' ? 'العميل' : 'Customer'}: ${who}${c ? ` (${c.channel})` : ''}`);
    if (r?.type === 'order') {
      for (const i of r.items) lines.push(`• ${i.quantity} × ${i.name}${i.variant ? ` (${i.variant})` : ''}`);
      if (r.total) lines.push(`${L === 'ar' ? 'الإجمالي' : 'Total'}: ${r.total}`);
      if (r.address) lines.push(`📍 ${r.address}`);
    }
    if (r?.type === 'booking') lines.push(`${r.service} · ${r.date} ${r.time}${r.partySize ? ` · ${r.partySize}` : ''}`);
    if (r?.phone) lines.push(`📞 ${r.phone}`);
    if (r) lines.push(`#${r.id}`);
    if (event === 'handoff' && c?.handoffReason) lines.push(c.handoffReason);
    if (event === 'error' && payload.message) lines.push(payload.message);
    const url = this.dashboardUrl();
    if (url) lines.push(url + (c ? `#inbox:${encodeURIComponent(c.id)}` : '#requests'));
    return lines.join('\n');
  }

  async send(event, payload) {
    const cfg = this.config;
    if (!cfg.events[event]) return;
    if (event === 'error') {
      // at most one error alert per conversation every 30 minutes
      const key = payload.conversation?.id || 'global';
      const last = this.recentErrors.get(key) || 0;
      if (Date.now() - last < 30 * 60_000) return;
      this.recentErrors.set(key, Date.now());
    }
    const text = this.format(event, payload);
    const jobs = [];
    if (this.telegram?.token) {
      for (const chatId of cfg.telegramChats) jobs.push(this.telegram.send(chatId, text).catch((e) => console.error('[notify] telegram', e.message)));
    }
    if (cfg.webhookUrl) {
      const body = {
        event,
        business: this.store.data.profile.businessName,
        text,
        request: payload.request || null,
        conversation: payload.conversation ? { id: payload.conversation.id, channel: payload.conversation.channel, name: payload.conversation.name, externalId: payload.conversation.externalId } : null,
        at: new Date().toISOString(),
      };
      jobs.push(
        fetch(cfg.webhookUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) })
          .catch((e) => console.error('[notify] webhook', e.message)),
      );
    }
    await Promise.all(jobs);
  }

  // Telegram "/start <code>" from the owner links their chat for alerts.
  tryLinkOwner(chatId, text) {
    const m = String(text || '').trim().match(/^\/start(?:@\w+)?\s+(\S+)/);
    if (!m || m[1] !== this.config.linkCode) return false;
    if (!this.config.telegramChats.includes(String(chatId))) this.config.telegramChats.push(String(chatId));
    this.store.save();
    return true;
  }

  isOwnerChat(chatId) {
    return this.config.telegramChats.includes(String(chatId));
  }
}
