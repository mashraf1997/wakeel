// Runs once a minute per business: sends due follow-ups and the owner's daily summary.

const WHATSAPP_WINDOW_MS = 23.5 * 3600e3; // Meta allows free-form replies for 24h after the customer's last message

export async function runScheduled(t, now = Date.now()) {
  await sendDueFollowups(t, now);
  await maybeSendSummary(t, now);
}

async function sendDueFollowups(t, now) {
  const { store, agent } = t;
  const d = store.data;
  for (const f of d.followups) {
    if (f.status !== 'scheduled' || Date.parse(f.dueAt) > now) continue;
    const conv = d.conversations[f.conversationId];
    const lastCustomer = conv && [...conv.messages].reverse().find((m) => m.role === 'customer');
    const skip =
      !conv ||
      conv.mode === 'human' ||
      !d.settings.botEnabled ||
      !d.settings.followups.enabled ||
      conv.channel === 'test' ||
      (lastCustomer && Date.parse(lastCustomer.at) > Date.parse(f.createdAt)) || // they wrote again
      d.requests.some((r) => r.conversationId === conv.id && Date.parse(r.createdAt) > Date.parse(f.createdAt)) || // they ordered
      (['whatsapp', 'instagram', 'messenger'].includes(conv.channel) && lastCustomer && now - Date.parse(lastCustomer.at) > WHATSAPP_WINDOW_MS);
    if (skip) {
      f.status = 'skipped';
      continue;
    }
    f.status = 'sending';
    try {
      const text = await agent.writeFollowup(conv, f.note);
      if (!text) {
        f.status = 'skipped';
        continue;
      }
      await t.sendTo(conv.channel, conv.externalId, text);
      store.addMessage(conv, 'bot', text, { followup: true });
      f.status = 'sent';
      f.sentAt = new Date(now).toISOString();
    } catch (err) {
      f.status = 'failed';
      f.error = err.message;
    }
  }
  // keep the list short
  if (d.followups.length > 1000) d.followups = d.followups.filter((f) => f.status === 'scheduled').concat(d.followups.slice(-200));
  store.save();
}

function localParts(now, tz) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit' })
      .formatToParts(new Date(now))
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

export function buildSummary(store, now = Date.now()) {
  const d = store.data;
  const since = now - 864e5;
  const ar = /[؀-ۿ]/.test(d.profile.businessName || '') || !d.profile.businessName;
  const convs = Object.values(d.conversations).filter((c) => c.channel !== 'test');
  let customerMsgs = 0;
  const activeConvs = new Set();
  for (const c of convs) for (const m of c.messages) if (m.role === 'customer' && Date.parse(m.at) >= since) { customerMsgs += 1; activeConvs.add(c.id); }
  const newReqs = d.requests.filter((r) => Date.parse(r.createdAt) >= since);
  const orders = newReqs.filter((r) => r.type === 'order');
  const bookings = newReqs.filter((r) => r.type === 'booking');
  const revenue = orders.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const pending = d.requests.filter((r) => r.status === 'pending').length;
  const attention = convs.filter((c) => c.needsAttention).length;
  const gaps = d.gaps.filter((g) => g.status === 'open' && Date.parse(g.lastAt) >= since).sort((a, b) => b.count - a.count).slice(0, 3);
  const ratings = d.ratings.filter((r) => Date.parse(r.at) >= since);
  const avg = ratings.length ? (ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(1) : null;
  const L = ar
    ? [`💬 ${customerMsgs} رسالة من ${activeConvs.size} عميل`, `🛒 ${orders.length} طلب${revenue ? ` (${revenue} ${d.profile.currency || ''})` : ''}`, `📅 ${bookings.length} حجز`, pending ? `⏳ ${pending} طلب مستني تأكيدك` : null, attention ? `🙋 ${attention} محادثة محتاجاك` : null, avg ? `⭐ متوسط التقييم ${avg} من ${ratings.length} تقييم` : null, gaps.length ? `❓ أسئلة ماعرفتش أجاوبها:\n${gaps.map((g) => `• ${g.question} (${g.count})`).join('\n')}` : null]
    : [`💬 ${customerMsgs} messages from ${activeConvs.size} customers`, `🛒 ${orders.length} orders${revenue ? ` (${revenue} ${d.profile.currency || ''})` : ''}`, `📅 ${bookings.length} bookings`, pending ? `⏳ ${pending} waiting for your confirmation` : null, attention ? `🙋 ${attention} chats need you` : null, avg ? `⭐ Average rating ${avg} from ${ratings.length}` : null, gaps.length ? `❓ Questions I could not answer:\n${gaps.map((g) => `• ${g.question} (${g.count})`).join('\n')}` : null];
  return { text: L.filter(Boolean).join('\n'), stats: { customerMsgs, customers: activeConvs.size, orders: orders.length, bookings: bookings.length, revenue, pending, attention, avgRating: avg && Number(avg), gaps: gaps.map((g) => g.question) } };
}

async function maybeSendSummary(t, now) {
  const { store, notifier } = t;
  const cfg = store.data.settings.summary;
  if (!cfg.enabled) return;
  const n = store.data.settings.notify;
  if (!n.telegramChats.length && !n.webhookUrl) return;
  const tz = store.data.settings.calendar.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const { date, hour } = localParts(now, tz);
  if (hour !== Number(cfg.hour) || cfg.lastSentDate === date) return;
  cfg.lastSentDate = date;
  store.save();
  const s = buildSummary(store, now);
  await notifier.send('summary', { text: s.text, stats: s.stats });
}
