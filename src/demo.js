// Demo mode (DEMO_MODE=true): a public showcase that fills itself with a sample
// restaurant and resets on a timer. Anything that would reach outside the server
// (channel tokens, AI keys, webhooks, payments, passwords) is locked.
import crypto from 'node:crypto';
import { defaultData } from './store.js';
import { hashPassword } from './auth.js';
import { applyTemplate } from './templates.js';

export function demoConfig(env = process.env) {
  if (!/^(1|true|yes)$/i.test(env.DEMO_MODE || '')) return null;
  return { password: env.DEMO_PASSWORD || 'demo1234', resetMinutes: Math.max(5, Number(env.DEMO_RESET_MINUTES) || 60), lang: env.DEMO_LANG === 'en' ? 'en' : 'ar' };
}

const ago = (min) => new Date(Date.now() - min * 60_000).toISOString();

export function seedDemo(store, demo) {
  const keepSecret = store.data.meta.secret;
  const keepAdmin = store.data.admin?.demo ? store.data.admin : null;
  store.data = defaultData();
  // Same secret and password hash across resets, so visitors stay signed in.
  store.data.meta.secret = keepSecret;
  store.data.admin = keepAdmin || { ...hashPassword(demo.password), demo: true };
  const ar = demo.lang === 'ar';
  store.data.profile.businessName = ar ? 'بيتزا النيل' : 'Nile Pizza';
  applyTemplate(store, 'restaurant', demo.lang);
  store.data.settings.widget.greeting = ar ? 'أهلاً! أنا مساعد بيتزا النيل 👋 أقدر أساعدك في الطلب أو أي سؤال.' : 'Hi! I am the Nile Pizza assistant 👋 How can I help?';

  const convs = ar
    ? [
        ['whatsapp', '201001234567', 'منى أحمد', [['customer', 'السلام عليكم، عايزة اطلب بيتزا', 34], ['bot', 'وعليكم السلام يا منى! عندنا مارجريتا بـ150 وسوبر سوبريم بـ210 (وسط). تحبي إيه؟', 33], ['customer', '2 مارجريتا وسط، التوصيل لمدينة نصر', 32], ['bot', 'تمام: 2 مارجريتا وسط = 300 جنيه + 20 توصيل. العنوان بالتفصيل إيه؟', 31], ['customer', 'عباس العقاد، عمارة 12، الدور 3', 30], ['bot', 'طلبك اتسجل برقم R7KQ2 ✅ الفريق هيأكده خلال دقايق.', 29]]],
        ['instagram', 'ig-nour', 'nour.designs', [['customer', 'عندكم توصيل لمصر الجديدة؟', 120], ['bot', 'أيوه بنوصل لمصر الجديدة خلال 45 دقيقة تقريباً، والتوصيل 20 جنيه.', 119]]],
        ['telegram', '5550001', 'كريم عادل', [['customer', 'عندكم بيتزا من غير جبنة؟', 15], ['bot', 'مش موجودة في المنيو حالياً، هسأل الفريق لو ينفع نعملها مخصوص.', 14]], { mode: 'human', needsAttention: true, handoffReason: 'طلب خاص مش في المنيو' }],
        ['web', 'visitor-demo-0001', '', [['customer', 'مواعيدكم إيه يوم الجمعة؟', 300], ['bot', 'بنفتح يومياً من 12 الظهر لحد 2 بعد نص الليل، والجمعة كمان 😊', 299]]],
      ]
    : [
        ['whatsapp', '15550101', 'Mona', [['customer', 'Hi, I want to order pizza', 34], ['bot', 'Hi Mona! Margherita is 12 and Supreme is 14 (medium). Which one?', 33], ['customer', '2 medium Margherita, delivery downtown', 32], ['bot', '2 medium Margherita = 24 + 2 delivery. What is the full address?', 31], ['customer', '12 Main St, 3rd floor', 30], ['bot', 'Your order R7KQ2 is in ✅ The team will confirm in a few minutes.', 29]]],
        ['instagram', 'ig-nour', 'nour.designs', [['customer', 'Do you deliver to the old town?', 120], ['bot', 'Yes, in about 45 minutes; delivery is 2.', 119]]],
        ['telegram', '5550001', 'Karim', [['customer', 'Can I get a pizza without cheese?', 15], ['bot', 'It is not on the menu; I will ask the team if they can make it.', 14]], { mode: 'human', needsAttention: true, handoffReason: 'Special request' }],
      ];
  for (const [ch, id, name, msgs, extra] of convs) {
    const c = store.getOrCreateConversation(ch, id, name);
    for (const [role, text, min] of msgs) store.addMessage(c, role, text).at = ago(min);
    c.updatedAt = c.messages.at(-1).at;
    c.unread = 0;
    Object.assign(c, extra || {});
  }
  const req = store.addRequest({ type: 'order', conversationId: 'whatsapp:' + convs[0][1], channel: 'whatsapp', customerName: convs[0][2], phone: convs[0][1], address: ar ? 'عباس العقاد، عمارة 12، الدور 3' : '12 Main St, 3rd floor', items: [{ name: ar ? 'بيتزا مارجريتا (وسط)' : 'Margherita (medium)', quantity: 2, notes: '' }], total: ar ? 320 : 26, notes: '' });
  req.id = 'R7KQ2';
  store.addRequest({ type: 'booking', conversationId: 'instagram:ig-nour', channel: 'instagram', customerName: 'Nour', phone: '', service: ar ? 'ترابيزة عيد ميلاد' : 'Birthday table', date: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10), time: '20:00', partySize: 8, notes: '' });
  store.data.gaps.push({ id: crypto.randomUUID(), question: ar ? 'عندكم بيتزا نباتي؟' : 'Do you have vegan pizza?', count: 3, firstAt: ago(3000), lastAt: ago(60), conversationId: '', status: 'open' });
  store.data.ratings.push({ conversationId: 'whatsapp:' + convs[0][1], score: 5, at: ago(600) }, { conversationId: 'web:x', score: 4, at: ago(1200) });
  store.flush();
}

/** Settings fields that are not saved in demo mode. */
export const DEMO_LOCKED_SETTINGS = ['ai', 'channels', 'payments', 'notify', 'transcription', 'catalog', 'calendar'];
