/* Wakeel dashboard — plain JavaScript, no build step. */
(function () {
  'use strict';

  // ------------------------------------------------------------------ i18n
  const STR = {
    ar: {
      overview: 'نظرة عامة', inbox: 'المحادثات', requests: 'الطلبات والحجوزات', knowledge: 'معلومات البيزنس', channels: 'القنوات', ai: 'الذكاء الاصطناعي', account: 'الحساب', logout: 'تسجيل الخروج', lang: 'English',
      setupTitle: 'أهلاً بيك في وكيل', setupLead: 'اعمل كلمة سر للوحة التحكم. هتحتاجها كل مرة تدخل.', businessName: 'اسم البيزنس', password: 'كلمة السر', passwordHint: '8 حروف على الأقل', setupToken: 'رمز الإعداد (SETUP_TOKEN)', start: 'ابدأ',
      loginTitle: 'تسجيل الدخول', login: 'دخول',
      overviewLead: 'آخر 7 أيام على كل القنوات.', getStarted: 'خطوات التشغيل', stepAI: 'اربط نموذج ذكاء اصطناعي', stepInfo: 'اكتب معلومات البيزنس والأسعار', stepChannel: 'وصّل قناة (واتساب، إنستجرام، تليجرام، أو الموقع)', stepTest: 'جرّب الوكيل بنفسك',
      msgs7d: 'رسائل العملاء', replies7d: 'ردود الوكيل', pending: 'طلبات مستنية تأكيد', attention: 'محتاجة تدخّل منك', perDay: 'رسائل العملاء يومياً', channelStatus: 'حالة القنوات',
      connected: 'متصل', notConnected: 'غير متصل', configured: 'متظبط', error: 'خطأ',
      search: 'دوّر بالاسم أو الرسالة', noConvs: 'لسه مفيش محادثات. أول ما عميل يبعت هتلاقيها هنا.', pickConv: 'اختار محادثة من القائمة', back: 'رجوع',
      modeBot: 'الوكيل بيرد', modeHuman: 'إنت بترد', takeOver: 'استلم المحادثة', handBack: 'رجّعها للوكيل', del: 'حذف', confirmDelete: 'متأكد إنك عايز تحذف المحادثة دي؟', yes: 'أيوه، احذف', cancel: 'إلغاء',
      typeReply: 'اكتب ردك هنا… (Enter للإرسال)', send: 'إرسال', handedOff: 'الوكيل حوّل المحادثة ليك', aiError: 'الوكيل ماقدرش يرد: ',
      all: 'الكل', pendingTab: 'مستني', confirmedTab: 'متأكد', doneTab: 'خلص', cancelledTab: 'ملغي',
      ref: 'الرقم', type: 'النوع', customer: 'العميل', details: 'التفاصيل', when: 'الوقت', status: 'الحالة', actions: '',
      order: 'طلب', booking: 'حجز', confirmNotify: 'أكّد وبلّغ العميل', markDone: 'خلص', cancelNotify: 'إلغاء وبلّغ العميل', openChat: 'المحادثة', noRequests: 'مفيش طلبات هنا.',
      st_pending: 'مستني تأكيد', st_confirmed: 'متأكد', st_done: 'خلص', st_cancelled: 'ملغي',
      profileTitle: 'بيانات البيزنس', profileLead: 'الوكيل بيرد من المعلومات دي بس، ومش هيألف أسعار أو وعود.', about: 'نبذة', hours: 'مواعيد العمل', address: 'العنوان', phone: 'التليفون', currency: 'العملة', products: 'المنتجات والخدمات والأسعار', productsHint: 'سطر لكل منتج: الاسم - السعر - ملاحظات', policies: 'السياسات', policiesHint: 'التوصيل، الاسترجاع، طرق الدفع…', tone: 'أسلوب الرد', toneFriendly: 'ودود وبسيط', toneFormal: 'رسمي ومحترم', toneFun: 'خفيف ومرح', save: 'حفظ', saved: 'اتحفظ ✓',
      docsTitle: 'ملفات ومستندات', docsLead: 'ارفع المنيو أو الأسئلة الشائعة أو أي ملف نصي (txt, md, csv). أو الصق النص.', dropHere: 'اسحب ملفات هنا أو اضغط للاختيار', docTitle: 'عنوان المستند', docText: 'النص', addDoc: 'إضافة', noDocs: 'لسه مفيش مستندات.', chars: 'حرف',
      webTitle: 'شات على موقعك', webLead: 'الصق السطر ده قبل </body> في أي موقع (ووردبريس، هوستنجر، أي موقع).', color: 'اللون', greeting: 'رسالة الترحيب', widgetTitle: 'العنوان', copy: 'نسخ', copied: 'اتنسخ ✓',
      tgTitle: 'تليجرام', tgLead: 'أسهل قناة تبدأ بيها. خطوة واحدة.', tgToken: 'توكن البوت', enable: 'تفعيل',
      tgSteps: ['افتح @BotFather في تليجرام واكتب /newbot', 'اختار اسم للبوت وانسخ التوكن', 'الصقه هنا وفعّل القناة واحفظ'],
      waTitle: 'واتساب (الرسمي)', waLead: 'عن طريق WhatsApp Cloud API من Meta، فرقمك في أمان.', waToken: 'Access token', waPhoneId: 'Phone number ID', verifyToken: 'Verify token', appSecret: 'App secret (اختياري، أكثر أماناً)', webhookUrl: 'رابط الـ Webhook',
      waSteps: ['ادخل developers.facebook.com واعمل App من نوع Business', 'ضيف منتج WhatsApp وخد Phone number ID والتوكن', 'في Configuration حط رابط الـ Webhook والـ Verify token اللي هنا', 'اشترك في حقل messages', 'استخدم توكن دائم (System User) عشان مايخلصش'],
      igTitle: 'إنستجرام', igLead: 'رسائل الـ Direct لحساب بيزنس مربوط بصفحة فيسبوك.', igToken: 'Page access token',
      igSteps: ['حوّل حساب إنستجرام لحساب بيزنس واربطه بصفحة فيسبوك', 'في نفس الـ App ضيف منتج Messenger/Instagram', 'حط رابط الـ Webhook والـ Verify token، واشترك في messages', 'انسخ Page access token والصقه هنا'],
      aiTitle: 'نموذج الذكاء الاصطناعي', aiLead: 'اختار Claude من Anthropic، أو أي نموذج متوافق مع OpenAI زي Ollama على الـ VPS بتاعك.', provider: 'المزوّد', provAnthropic: 'Anthropic (Claude)', provOpenai: 'متوافق مع OpenAI (Ollama, OpenRouter, …)', model: 'النموذج', customModel: 'نموذج تاني…', apiKey: 'API key', baseUrl: 'Base URL', baseUrlHint: 'Ollama على نفس السيرفر: http://ollama:11434/v1', effort: 'مستوى التفكير', effortHint: 'Low كفاية للشات وأسرع وأرخص', keyFromEnv: 'بيستخدم ANTHROPIC_API_KEY من إعدادات السيرفر',
      botEnabled: 'الوكيل شغّال', botEnabledHint: 'لو قفلته، الرسائل هتوصلك في المحادثات من غير رد آلي.',
      playTitle: 'جرّب الوكيل', playLead: 'اكتب كأنك عميل. المحادثة دي للتجربة بس.', playPh: 'مثلاً: عندكم توصيل لمدينة نصر؟', reset: 'محادثة جديدة', thinking: 'بيكتب…',
      pwTitle: 'تغيير كلمة السر', current: 'كلمة السر الحالية', next: 'كلمة السر الجديدة', change: 'تغيير', version: 'الإصدار',
      ago_now: 'دلوقتي', ago_m: 'د', ago_h: 'س', ago_d: 'ي',
    },
    en: {
      overview: 'Overview', inbox: 'Inbox', requests: 'Orders & bookings', knowledge: 'Business info', channels: 'Channels', ai: 'AI model', account: 'Account', logout: 'Sign out', lang: 'العربية',
      setupTitle: 'Welcome to Wakeel', setupLead: 'Create a password for this dashboard. You will need it to sign in.', businessName: 'Business name', password: 'Password', passwordHint: 'At least 8 characters', setupToken: 'Setup token (SETUP_TOKEN)', start: 'Get started',
      loginTitle: 'Sign in', login: 'Sign in',
      overviewLead: 'Last 7 days across every channel.', getStarted: 'Get started', stepAI: 'Connect an AI model', stepInfo: 'Add your business info and prices', stepChannel: 'Connect a channel (WhatsApp, Instagram, Telegram or website)', stepTest: 'Try the assistant yourself',
      msgs7d: 'Customer messages', replies7d: 'Assistant replies', pending: 'Waiting for confirmation', attention: 'Need your attention', perDay: 'Customer messages per day', channelStatus: 'Channel status',
      connected: 'Connected', notConnected: 'Not connected', configured: 'Configured', error: 'Error',
      search: 'Search name or message', noConvs: 'No conversations yet. They appear here as soon as a customer writes.', pickConv: 'Pick a conversation', back: 'Back',
      modeBot: 'Assistant replying', modeHuman: 'You are replying', takeOver: 'Take over', handBack: 'Hand back to assistant', del: 'Delete', confirmDelete: 'Delete this conversation?', yes: 'Yes, delete', cancel: 'Cancel',
      typeReply: 'Type your reply… (Enter to send)', send: 'Send', handedOff: 'The assistant handed this chat to you', aiError: 'The assistant could not reply: ',
      all: 'All', pendingTab: 'Pending', confirmedTab: 'Confirmed', doneTab: 'Done', cancelledTab: 'Cancelled',
      ref: 'Ref', type: 'Type', customer: 'Customer', details: 'Details', when: 'When', status: 'Status', actions: '',
      order: 'Order', booking: 'Booking', confirmNotify: 'Confirm & notify', markDone: 'Done', cancelNotify: 'Cancel & notify', openChat: 'Chat', noRequests: 'Nothing here.',
      st_pending: 'Pending', st_confirmed: 'Confirmed', st_done: 'Done', st_cancelled: 'Cancelled',
      profileTitle: 'Business details', profileLead: 'The assistant answers only from this information and never invents prices or promises.', about: 'About', hours: 'Opening hours', address: 'Address', phone: 'Phone', currency: 'Currency', products: 'Products, services and prices', productsHint: 'One per line: name - price - notes', policies: 'Policies', policiesHint: 'Delivery, returns, payment methods…', tone: 'Tone', toneFriendly: 'Friendly and simple', toneFormal: 'Formal and polite', toneFun: 'Light and playful', save: 'Save', saved: 'Saved ✓',
      docsTitle: 'Documents', docsLead: 'Upload your menu, FAQ or any text file (txt, md, csv), or paste text.', dropHere: 'Drop files here or click to choose', docTitle: 'Title', docText: 'Text', addDoc: 'Add', noDocs: 'No documents yet.', chars: 'chars',
      webTitle: 'Website chat', webLead: 'Paste this line before </body> on any website (WordPress, Hostinger Website Builder, anything).', color: 'Color', greeting: 'Greeting', widgetTitle: 'Title', copy: 'Copy', copied: 'Copied ✓',
      tgTitle: 'Telegram', tgLead: 'The easiest channel to start with.', tgToken: 'Bot token', enable: 'Enable',
      tgSteps: ['Open @BotFather in Telegram and send /newbot', 'Pick a name and copy the token', 'Paste it here, enable, and save'],
      waTitle: 'WhatsApp (official)', waLead: 'Uses Meta’s WhatsApp Cloud API, so your number stays safe.', waToken: 'Access token', waPhoneId: 'Phone number ID', verifyToken: 'Verify token', appSecret: 'App secret (optional, more secure)', webhookUrl: 'Webhook URL',
      waSteps: ['Go to developers.facebook.com and create a Business app', 'Add the WhatsApp product; copy the Phone number ID and token', 'Under Configuration, paste the webhook URL and verify token shown here', 'Subscribe to the messages field', 'Use a permanent System User token so it does not expire'],
      igTitle: 'Instagram', igLead: 'Direct messages for a business account linked to a Facebook Page.', igToken: 'Page access token',
      igSteps: ['Switch Instagram to a business account linked to a Facebook Page', 'In the same app add the Messenger / Instagram product', 'Set the webhook URL and verify token, subscribe to messages', 'Copy the Page access token and paste it here'],
      aiTitle: 'AI model', aiLead: 'Use Claude from Anthropic, or any OpenAI-compatible model such as Ollama on your own VPS.', provider: 'Provider', provAnthropic: 'Anthropic (Claude)', provOpenai: 'OpenAI-compatible (Ollama, OpenRouter, …)', model: 'Model', customModel: 'Other model…', apiKey: 'API key', baseUrl: 'Base URL', baseUrlHint: 'Ollama on the same server: http://ollama:11434/v1', effort: 'Effort', effortHint: 'Low is enough for chat: faster and cheaper', keyFromEnv: 'Using ANTHROPIC_API_KEY from the server environment',
      botEnabled: 'Assistant is on', botEnabledHint: 'When off, messages still arrive in the inbox without automatic replies.',
      playTitle: 'Try the assistant', playLead: 'Write as if you were a customer. This chat is for testing only.', playPh: 'e.g. Do you deliver downtown?', reset: 'New chat', thinking: 'Typing…',
      pwTitle: 'Change password', current: 'Current password', next: 'New password', change: 'Change', version: 'Version',
      ago_now: 'now', ago_m: 'm', ago_h: 'h', ago_d: 'd',
    },
  };
  let lang = safeGet('wk_lang') || 'ar';
  const t = (k) => (STR[lang][k] ?? STR.en[k] ?? k);

  function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }

  // ------------------------------------------------------------------ utils
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const app = document.getElementById('app');

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      method: opts.method || 'GET',
      headers: opts.body !== undefined ? { 'content-type': 'application/json' } : {},
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: 'same-origin',
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== '/api/login' && path !== '/api/password') { boot(); throw new Error(data.error || 'Not signed in'); }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  let toastTimer;
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function ago(iso) {
    const s = (Date.now() - Date.parse(iso)) / 1000;
    if (s < 60) return t('ago_now');
    if (s < 3600) return Math.floor(s / 60) + t('ago_m');
    if (s < 86400) return Math.floor(s / 3600) + t('ago_h');
    return Math.floor(s / 86400) + t('ago_d');
  }
  const time = (iso) => new Date(iso).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const chIcon = (c) => `<span class="ch ${esc(c)}" aria-label="${esc(c)}">${{ whatsapp: 'WA', instagram: 'IG', telegram: 'TG', web: 'WEB', test: 'T' }[c] || '?'}</span>`;

  async function copyText(text, btn) {
    try { await navigator.clipboard.writeText(text); if (btn) { const o = btn.textContent; btn.textContent = t('copied'); setTimeout(() => (btn.textContent = o), 1500); } }
    catch { toast(text); }
  }

  function applyLang() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }

  // ------------------------------------------------------------------ state
  const state = { session: null, overview: null, polling: null, currentConv: null, convFilter: '', reqFilter: 'pending' };

  async function boot() {
    applyLang();
    clearInterval(state.polling);
    state.session = await api('/api/session').catch(() => ({ needsSetup: false, authed: false }));
    if (state.session.needsSetup) return renderSetup();
    if (!state.session.authed) return renderLogin();
    renderShell();
    route();
    state.polling = setInterval(poll, 5000);
  }

  // ------------------------------------------------------------------ auth screens
  function authFrame(inner) {
    app.innerHTML = `<div class="auth"><form class="card" id="authForm" novalidate>
      <div class="brand"><img src="/favicon.svg" alt="">Wakeel <span class="muted small">وكيل</span></div>${inner}
      <div class="err" id="authErr"></div>
      <div class="row"><button class="btn primary" type="submit" id="authBtn"></button><span class="spacer"></span><button class="btn sm" type="button" id="langBtn">${t('lang')}</button></div>
    </form></div>`;
    $('#langBtn').onclick = () => { lang = lang === 'ar' ? 'en' : 'ar'; safeSet('wk_lang', lang); boot(); };
  }

  function renderSetup() {
    authFrame(`<div class="stack"><h1>${t('setupTitle')}</h1><p class="muted">${t('setupLead')}</p></div>
      <label class="field" for="f-bn">${t('businessName')}<input type="text" id="f-bn" autocomplete="organization"></label>
      <label class="field" for="f-pw">${t('password')} <span class="hint">${t('passwordHint')}</span><input type="password" id="f-pw" autocomplete="new-password" minlength="8" required></label>
      ${state.session.setupTokenRequired ? `<label class="field" for="f-st">${t('setupToken')}<input type="password" id="f-st" class="ltr"></label>` : ''}`);
    $('#authBtn').textContent = t('start');
    $('#authForm').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await api('/api/setup', { method: 'POST', body: { password: $('#f-pw').value, businessName: $('#f-bn').value, setupToken: $('#f-st')?.value } });
        location.hash = '#overview';
        boot();
      } catch (err) { $('#authErr').textContent = err.message; }
    };
    $('#f-bn').focus();
  }

  function renderLogin() {
    authFrame(`<h1>${t('loginTitle')}</h1>
      <label class="field" for="f-pw">${t('password')}<input type="password" id="f-pw" autocomplete="current-password" required></label>`);
    $('#authBtn').textContent = t('login');
    $('#authForm').onsubmit = async (e) => {
      e.preventDefault();
      try { await api('/api/login', { method: 'POST', body: { password: $('#f-pw').value } }); boot(); }
      catch (err) { $('#authErr').textContent = err.message; }
    };
    $('#f-pw').focus();
  }

  // ------------------------------------------------------------------ shell + routing
  const PAGES = ['overview', 'inbox', 'requests', 'knowledge', 'channels', 'ai', 'account'];

  function renderShell() {
    const navItems = PAGES.map((p) => `<a class="nav" href="#${p}" data-page="${p}"><span>${t(p)}</span><span class="badge" data-badge="${p}" hidden></span></a>`).join('');
    app.innerHTML = `<div class="shell">
      <nav class="rail" aria-label="Main">
        <div class="brand"><img src="/favicon.svg" alt="">Wakeel</div>
        ${navItems}
        <div class="rail-foot">
          <button class="nav" type="button" id="langBtn">${t('lang')}</button>
          <button class="nav" type="button" id="logoutBtn">${t('logout')}</button>
        </div>
      </nav>
      <nav class="mobile-nav" aria-label="Main">${navItems}</nav>
      <main class="main" id="main"></main>
    </div>`;
    $('#langBtn').onclick = () => { lang = lang === 'ar' ? 'en' : 'ar'; safeSet('wk_lang', lang); boot(); };
    $('#logoutBtn').onclick = async () => { await api('/api/logout', { method: 'POST', body: {} }); boot(); };
  }

  function currentPage() {
    const h = location.hash.replace('#', '').split(':')[0];
    return PAGES.includes(h) ? h : 'overview';
  }

  function route() {
    if (!$('#main')) return;
    const page = currentPage();
    $$('.nav[data-page]').forEach((a) => a.setAttribute('aria-current', a.dataset.page === page ? 'page' : 'false'));
    const main = $('#main');
    main.scrollTop = 0;
    ({ overview: pageOverview, inbox: pageInbox, requests: pageRequests, knowledge: pageKnowledge, channels: pageChannels, ai: pageAI, account: pageAccount }[page])(main);
    updateBadges();
  }
  window.addEventListener('hashchange', () => { if (state.session?.authed) route(); });

  async function updateBadges() {
    try {
      const o = await api('/api/overview');
      state.overview = o;
      const set = (p, n) => { $$(`[data-badge="${p}"]`).forEach((b) => { b.hidden = !n; b.textContent = n; }); };
      set('inbox', o.needsAttention);
      set('requests', o.pendingRequests);
    } catch { /* ignore */ }
  }

  async function poll() {
    if (document.hidden) return;
    updateBadges();
    const page = currentPage();
    if (page === 'inbox') refreshInbox(true);
  }

  // ------------------------------------------------------------------ overview
  async function pageOverview(main) {
    const o = await api('/api/overview');
    state.overview = o;
    const ch = o.channels;
    const anyChannel = ch.telegram.connected || ch.whatsapp.configured || ch.instagram.configured || o.byChannel.web > 0;
    const steps = [
      [o.aiReady, t('stepAI'), '#ai'],
      [o.profileReady, t('stepInfo'), '#knowledge'],
      [anyChannel, t('stepChannel'), '#channels'],
      [o.botReplies7d > 0, t('stepTest'), '#ai'],
    ];
    const max = Math.max(1, ...o.perDay.map((d) => d.count));
    const dayName = (d) => new Date(d + 'T12:00:00').toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'short' });
    const chRow = (key, label, st) => {
      let pill;
      if (key === 'web') pill = `<span class="pill good">${t('connected')}</span>`;
      else if (st.error) pill = `<span class="pill bad" title="${esc(st.error)}">${t('error')}</span>`;
      else if (st.connected || st.configured) pill = `<span class="pill good">${st.username ? '@' + esc(st.username) : t('configured')}</span>`;
      else pill = `<span class="pill off">${t('notConnected')}</span>`;
      return `<div class="row">${chIcon(key)}<span>${label}</span><span class="spacer"></span>${pill}</div>`;
    };
    main.innerHTML = `<div class="page">
      <div class="page-head"><div><h1>${t('overview')}</h1><p>${t('overviewLead')}</p></div></div>
      ${steps.every((s) => s[0]) ? '' : `<section class="card"><h2>${t('getStarted')}</h2><ol class="checklist">${steps.map(([done, label, href], i) => `<li class="${done ? 'done' : ''}"><span class="check">${done ? '✓' : i + 1}</span><a class="t" href="${href}">${label}</a></li>`).join('')}</ol></section>`}
      <div class="grid4">
        <div class="card stat"><b>${o.customerMessages7d}</b><span>${t('msgs7d')}</span></div>
        <div class="card stat"><b>${o.botReplies7d}</b><span>${t('replies7d')}</span></div>
        <a class="card stat ${o.pendingRequests ? 'alert' : ''}" href="#requests" style="text-decoration:none;color:inherit"><b>${o.pendingRequests}</b><span>${t('pending')}</span></a>
        <a class="card stat ${o.needsAttention ? 'alert' : ''}" href="#inbox" style="text-decoration:none;color:inherit"><b>${o.needsAttention}</b><span>${t('attention')}</span></a>
      </div>
      <div class="grid2">
        <section class="card"><h2>${t('perDay')}</h2>
          <div class="bars">${o.perDay.map((d, i) => `<div class="bar ${i === 6 ? 'today' : ''}"><small>${d.count}</small><i style="height:${Math.max(2, Math.round((d.count / max) * 110))}px"></i></div>`).join('')}</div>
          <div class="bar-labels">${o.perDay.map((d) => `<span>${dayName(d.day)}</span>`).join('')}</div>
        </section>
        <section class="card"><h2>${t('channelStatus')}</h2>
          <div class="stack">
            ${chRow('whatsapp', 'WhatsApp', ch.whatsapp)}
            ${chRow('instagram', 'Instagram', ch.instagram)}
            ${chRow('telegram', 'Telegram', ch.telegram)}
            ${chRow('web', lang === 'ar' ? 'شات الموقع' : 'Website chat', ch.web)}
          </div>
        </section>
      </div>
    </div>`;
  }

  // ------------------------------------------------------------------ inbox
  async function pageInbox(main) {
    const wanted = decodeURIComponent(location.hash.split(':').slice(1).join(':') || '');
    if (wanted) state.currentConv = wanted;
    main.innerHTML = `<div class="inbox ${state.currentConv ? 'open' : ''}" id="inbox">
      <aside class="conv-list"><div class="head"><h1>${t('inbox')}</h1>
        <input type="text" id="convSearch" placeholder="${t('search')}" value="${esc(state.convFilter)}" aria-label="${t('search')}"></div>
        <div id="convItems"></div></aside>
      <section class="thread" id="thread"></section>
    </div>`;
    main.style.overflow = 'hidden';
    $('#convSearch').oninput = (e) => { state.convFilter = e.target.value; refreshInbox(); };
    await refreshInbox();
    window.addEventListener('hashchange', () => { main.style.overflow = ''; }, { once: true });
  }

  async function refreshInbox(fromPoll) {
    const items = $('#convItems');
    if (!items) return;
    const { conversations } = await api('/api/conversations');
    const q = state.convFilter.trim().toLowerCase();
    const list = conversations.filter((c) => !q || (c.name || c.externalId).toLowerCase().includes(q) || (c.lastMessage?.text || '').toLowerCase().includes(q));
    items.innerHTML = list.length ? list.map((c) => `<button class="conv" data-id="${esc(c.id)}" aria-current="${c.id === state.currentConv}">
        ${chIcon(c.channel)}
        <span style="min-width:0"><span class="name" style="display:block">${esc(c.name || c.externalId)}</span><span class="preview" style="display:block">${esc(c.lastMessage?.text || '')}</span></span>
        <span class="meta"><span>${c.lastMessage ? ago(c.lastMessage.at) : ''}</span>${c.needsAttention ? '<span class="flag" title="!"></span>' : c.unread ? `<span class="badge" style="background:var(--accent)">${c.unread}</span>` : ''}</span>
      </button>`).join('') : `<div class="empty small">${t('noConvs')}</div>`;
    $$('.conv', items).forEach((b) => (b.onclick = () => { state.currentConv = b.dataset.id; history.replaceState(null, '', '#inbox'); $('#inbox').classList.add('open'); refreshInbox(); }));
    await renderThread(fromPoll);
  }

  async function renderThread(fromPoll) {
    const el = $('#thread');
    if (!el) return;
    if (!state.currentConv) { el.innerHTML = `<div class="empty">${t('pickConv')}</div>`; return; }
    let c;
    try { ({ conversation: c } = await api('/api/conversations/' + encodeURIComponent(state.currentConv))); }
    catch { state.currentConv = null; el.innerHTML = `<div class="empty">${t('pickConv')}</div>`; return; }
    const prevMsgs = $('#msgs');
    const atBottom = !prevMsgs || prevMsgs.scrollHeight - prevMsgs.scrollTop - prevMsgs.clientHeight < 60;
    const draft = $('#replyBox')?.value || '';
    if (fromPoll && prevMsgs && prevMsgs.dataset.count === String(c.messages.length) && prevMsgs.dataset.mode === c.mode) return;
    const human = c.mode === 'human';
    el.innerHTML = `<div class="thread-head">
        <button class="btn sm mobile-only" id="backBtn" type="button">${t('back')}</button>
        ${chIcon(c.channel)}<h2>${esc(c.name || c.externalId)}</h2>
        <span class="pill ${human ? 'warn' : 'good'}">${human ? t('modeHuman') : t('modeBot')}</span>
        <span class="spacer"></span>
        <button class="btn sm" id="modeBtn" type="button">${human ? t('handBack') : t('takeOver')}</button>
        <button class="btn sm danger" id="delBtn" type="button">${t('del')}</button>
      </div>
      <div class="msgs" id="msgs" data-count="${c.messages.length}" data-mode="${c.mode}">
        ${c.messages.map((m) => `<div class="msg ${m.role}">${esc(m.text)}<small>${m.role === 'owner' ? (lang === 'ar' ? 'إنت · ' : 'You · ') : m.role === 'bot' ? (lang === 'ar' ? 'الوكيل · ' : 'Assistant · ') : ''}${time(m.at)}</small></div>`).join('')}
        ${c.handoffReason && human ? `<div class="notice">${t('handedOff')}: ${esc(c.handoffReason)}</div>` : ''}
        ${c.lastError ? `<div class="notice">${t('aiError')}${esc(c.lastError.message)}</div>` : ''}
      </div>
      <form class="composer" id="replyForm">
        <textarea id="replyBox" rows="1" placeholder="${t('typeReply')}" aria-label="${t('typeReply')}">${esc(draft)}</textarea>
        <button class="btn primary" type="submit">${t('send')}</button>
      </form>`;
    const msgs = $('#msgs');
    if (atBottom) msgs.scrollTop = msgs.scrollHeight;
    $('#backBtn').onclick = () => { state.currentConv = null; $('#inbox').classList.remove('open'); refreshInbox(); };
    $('#backBtn').style.display = window.matchMedia('(max-width: 900px)').matches ? '' : 'none';
    $('#modeBtn').onclick = async () => { await api('/api/conversations/' + encodeURIComponent(c.id), { method: 'PATCH', body: { mode: human ? 'bot' : 'human', needsAttention: false } }); refreshInbox(); };
    $('#delBtn').onclick = () => confirmDialog(t('confirmDelete'), async () => { await api('/api/conversations/' + encodeURIComponent(c.id), { method: 'DELETE', body: {} }); state.currentConv = null; refreshInbox(); });
    const box = $('#replyBox');
    box.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#replyForm').requestSubmit(); } };
    $('#replyForm').onsubmit = async (e) => {
      e.preventDefault();
      const text = box.value.trim();
      if (!text) return;
      box.disabled = true;
      try { await api('/api/conversations/' + encodeURIComponent(c.id) + '/reply', { method: 'POST', body: { text } }); box.value = ''; await refreshInbox(); $('#replyBox')?.focus(); }
      catch (err) { toast(err.message); box.disabled = false; }
    };
  }

  function confirmDialog(message, onYes) {
    const d = document.createElement('dialog');
    d.innerHTML = `<form method="dialog" class="stack" style="min-width:260px"><p>${esc(message)}</p><div class="row"><button class="btn danger" value="yes">${t('yes')}</button><button class="btn" value="no">${t('cancel')}</button></div></form>`;
    d.style.cssText = 'border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--ink);padding:20px';
    document.body.appendChild(d);
    d.addEventListener('close', () => { if (d.returnValue === 'yes') onYes(); d.remove(); });
    d.showModal();
  }

  // ------------------------------------------------------------------ requests
  async function pageRequests(main) {
    const { requests } = await api('/api/requests');
    const f = state.reqFilter;
    const list = requests.filter((r) => f === 'all' || r.status === f);
    const tabs = [['pending', 'pendingTab'], ['confirmed', 'confirmedTab'], ['done', 'doneTab'], ['cancelled', 'cancelledTab'], ['all', 'all']];
    const pill = { pending: 'warn', confirmed: 'good', done: 'off', cancelled: 'bad' };
    const details = (r) => r.type === 'order'
      ? r.items.map((i) => `${esc(i.quantity)} × ${esc(i.name)}${i.notes ? ` <span class="muted">(${esc(i.notes)})</span>` : ''}`).join('<br>') + (r.address ? `<br><span class="muted">${esc(r.address)}</span>` : '')
      : `${esc(r.service)}<br><span class="mono">${esc(r.date)} ${esc(r.time)}</span>${r.partySize ? ` · ${esc(r.partySize)}` : ''}`;
    main.innerHTML = `<div class="page">
      <div class="page-head"><h1>${t('requests')}</h1>
        <div class="tabs" role="group">${tabs.map(([k, l]) => `<button type="button" data-f="${k}" aria-pressed="${f === k}">${t(l)}</button>`).join('')}</div></div>
      ${list.length ? `<div class="table-wrap"><table>
        <thead><tr><th>${t('ref')}</th><th>${t('type')}</th><th>${t('customer')}</th><th>${t('details')}</th><th>${t('when')}</th><th>${t('status')}</th><th></th></tr></thead>
        <tbody>${list.map((r) => `<tr>
          <td class="mono">${esc(r.id)}</td>
          <td>${chIcon(r.channel)} ${t(r.type)}</td>
          <td>${esc(r.customerName || '—')}${r.phone ? `<br><span class="mono">${esc(r.phone)}</span>` : ''}${r.notes ? `<br><span class="muted small">${esc(r.notes)}</span>` : ''}</td>
          <td>${details(r)}</td>
          <td class="num small">${time(r.createdAt)}</td>
          <td><span class="pill ${pill[r.status]}">${t('st_' + r.status)}</span></td>
          <td><div class="stack" style="gap:6px">
            ${r.status === 'pending' ? `<button class="btn sm primary" data-act="confirmed" data-id="${esc(r.id)}">${t('confirmNotify')}</button>` : ''}
            ${r.status === 'confirmed' ? `<button class="btn sm" data-act="done" data-id="${esc(r.id)}">${t('markDone')}</button>` : ''}
            ${r.status === 'pending' || r.status === 'confirmed' ? `<button class="btn sm danger" data-act="cancelled" data-id="${esc(r.id)}">${t('cancelNotify')}</button>` : ''}
            <a class="btn sm" href="#inbox:${encodeURIComponent(r.conversationId)}">${t('openChat')}</a>
          </div></td></tr>`).join('')}</tbody></table></div>` : `<div class="card empty">${t('noRequests')}</div>`}
    </div>`;
    $$('[data-f]', main).forEach((b) => (b.onclick = () => { state.reqFilter = b.dataset.f; pageRequests(main); }));
    $$('[data-act]', main).forEach((b) => (b.onclick = async () => {
      b.disabled = true;
      try {
        const out = await api('/api/requests/' + b.dataset.id, { method: 'PATCH', body: { status: b.dataset.act, notify: b.dataset.act !== 'done' } });
        if (out.warning) toast(out.warning);
        pageRequests(main); updateBadges();
      } catch (err) { toast(err.message); b.disabled = false; }
    }));
  }

  // ------------------------------------------------------------------ knowledge
  async function pageKnowledge(main) {
    const [{ profile: p }, { knowledge }] = await Promise.all([api('/api/profile'), api('/api/knowledge')]);
    const fld = (id, label, hint, type = 'text') => `<label class="field" for="p-${id}">${t(label)}${hint ? ` <span class="hint">${t(hint)}</span>` : ''}
      ${type === 'area' ? `<textarea id="p-${id}">${esc(p[id])}</textarea>` : `<input type="text" id="p-${id}" value="${esc(p[id])}">`}</label>`;
    main.innerHTML = `<div class="page">
      <div class="page-head"><div><h1>${t('knowledge')}</h1><p>${t('profileLead')}</p></div></div>
      <form class="card" id="profileForm">
        <h2>${t('profileTitle')}</h2>
        <div class="grid2">${fld('businessName', 'businessName')}${fld('phone', 'phone')}</div>
        ${fld('description', 'about', '', 'area')}
        <div class="grid2">${fld('hours', 'hours')}${fld('address', 'address')}</div>
        <div class="grid2">${fld('currency', 'currency')}
          <label class="field" for="p-tone">${t('tone')}<select id="p-tone">
            ${[['friendly', 'toneFriendly'], ['formal', 'toneFormal'], ['playful', 'toneFun']].map(([v, l]) => `<option value="${v}" ${p.tone === v ? 'selected' : ''}>${t(l)}</option>`).join('')}</select></label></div>
        ${fld('products', 'products', 'productsHint', 'area')}
        ${fld('policies', 'policies', 'policiesHint', 'area')}
        <div class="row"><button class="btn primary" type="submit">${t('save')}</button></div>
      </form>
      <section class="card">
        <div><h2>${t('docsTitle')}</h2><p class="muted small">${t('docsLead')}</p></div>
        <div class="drop" id="drop" tabindex="0" role="button">${t('dropHere')}<input type="file" id="fileIn" accept=".txt,.md,.csv,.json,text/plain" multiple hidden></div>
        <form class="stack" id="docForm">
          <label class="field" for="d-title">${t('docTitle')}<input type="text" id="d-title"></label>
          <label class="field" for="d-text">${t('docText')}<textarea id="d-text"></textarea></label>
          <div class="row"><button class="btn" type="submit">${t('addDoc')}</button></div>
        </form>
        <div id="docs">${knowledge.length ? knowledge.map((k) => `<div class="doc"><div><h3>${esc(k.title)}</h3><p>${esc(k.text)}</p><span class="muted small">${k.length.toLocaleString()} ${t('chars')}</span></div><button class="btn sm danger" data-del="${esc(k.id)}" type="button">${t('del')}</button></div>`).join('') : `<p class="muted">${t('noDocs')}</p>`}</div>
      </section>
    </div>`;
    $('#profileForm').onsubmit = async (e) => {
      e.preventDefault();
      const body = {};
      for (const k of ['businessName', 'phone', 'description', 'hours', 'address', 'currency', 'tone', 'products', 'policies']) body[k] = $('#p-' + k).value;
      try { await api('/api/profile', { method: 'PUT', body }); toast(t('saved')); } catch (err) { toast(err.message); }
    };
    $('#docForm').onsubmit = async (e) => {
      e.preventDefault();
      const text = $('#d-text').value.trim();
      if (!text) return;
      try { await api('/api/knowledge', { method: 'POST', body: { title: $('#d-title').value, text } }); pageKnowledge(main); } catch (err) { toast(err.message); }
    };
    $$('[data-del]', main).forEach((b) => (b.onclick = async () => { await api('/api/knowledge/' + b.dataset.del, { method: 'DELETE', body: {} }); pageKnowledge(main); }));
    const drop = $('#drop'), fileIn = $('#fileIn');
    const upload = async (files) => {
      for (const f of files) {
        if (f.size > 1.5 * 1024 * 1024) { toast(f.name + ': > 1.5 MB'); continue; }
        const text = await f.text();
        try { await api('/api/knowledge', { method: 'POST', body: { title: f.name, text } }); } catch (err) { toast(err.message); }
      }
      pageKnowledge(main);
    };
    drop.onclick = () => fileIn.click();
    drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileIn.click(); } };
    fileIn.onchange = () => upload([...fileIn.files]);
    drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
    drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); upload([...e.dataTransfer.files]); };
  }

  // ------------------------------------------------------------------ channels
  async function pageChannels(main) {
    const [{ settings: s, webhookPath }, { channels: st }] = await Promise.all([api('/api/settings'), api('/api/channels')]);
    const c = s.channels;
    const origin = location.origin;
    const embed = `<script src="${origin}/widget.js" async></script>`;
    const webhook = origin + webhookPath;
    const statusPill = (x) => x.error ? `<span class="pill bad" title="${esc(x.error)}">${t('error')}</span>` : (x.connected || x.configured) ? `<span class="pill good">${x.username ? '@' + esc(x.username) : t('configured')}</span>` : `<span class="pill off">${t('notConnected')}</span>`;
    const inp = (id, label, value, ltr = true) => `<label class="field" for="${id}">${t(label)}<input type="text" id="${id}" class="${ltr ? 'ltr' : ''}" value="${esc(value)}" autocomplete="off" spellcheck="false"></label>`;
    const copyRow = (text, id) => `<div class="copy"><pre id="${id}">${esc(text)}</pre><button class="btn sm" type="button" data-copy="${id}">${t('copy')}</button></div>`;
    const steps = (key) => `<details class="steps"><summary>${lang === 'ar' ? 'إزاي أوصّلها؟' : 'How to connect'}</summary><ol>${t(key).map((x) => `<li>${esc(x)}</li>`).join('')}</ol></details>`;
    main.innerHTML = `<div class="page">
      <div class="page-head"><h1>${t('channels')}</h1></div>
      <section class="card"><div class="card-head"><div class="row">${chIcon('web')}<h2>${t('webTitle')}</h2></div><span class="pill good">${t('connected')}</span></div>
        <p class="muted small">${esc(t('webLead'))}</p>${copyRow(embed, 'embedCode')}
        <div class="grid2">${inp('w-title', 'widgetTitle', s.widget.title, false)}${inp('w-greeting', 'greeting', s.widget.greeting, false)}</div>
        <label class="field" for="w-color" style="max-width:200px">${t('color')}<input type="color" id="w-color" value="${esc(s.widget.color)}" style="height:40px;width:100%;border:1px solid var(--line);border-radius:8px;background:var(--bg)"></label>
      </section>
      <section class="card"><div class="card-head"><div class="row">${chIcon('telegram')}<h2>${t('tgTitle')}</h2></div>${statusPill(st.telegram)}</div>
        <p class="muted small">${t('tgLead')}</p>${steps('tgSteps')}
        ${inp('tg-token', 'tgToken', c.telegram.token)}
        <label class="switch"><input type="checkbox" id="tg-on" ${c.telegram.enabled ? 'checked' : ''}>${t('enable')}</label>
      </section>
      <section class="card"><div class="card-head"><div class="row">${chIcon('whatsapp')}<h2>${t('waTitle')}</h2></div>${statusPill(st.whatsapp)}</div>
        <p class="muted small">${t('waLead')}</p>${steps('waSteps')}
        <div class="field">${t('webhookUrl')}${copyRow(webhook, 'waHook')}</div>
        <div class="grid2">${inp('wa-token', 'waToken', c.whatsapp.token)}${inp('wa-phone', 'waPhoneId', c.whatsapp.phoneNumberId)}</div>
        <div class="grid2">${inp('wa-verify', 'verifyToken', c.whatsapp.verifyToken)}${inp('wa-secret', 'appSecret', c.whatsapp.appSecret)}</div>
        <label class="switch"><input type="checkbox" id="wa-on" ${c.whatsapp.enabled ? 'checked' : ''}>${t('enable')}</label>
      </section>
      <section class="card"><div class="card-head"><div class="row">${chIcon('instagram')}<h2>${t('igTitle')}</h2></div>${statusPill(st.instagram)}</div>
        <p class="muted small">${t('igLead')}</p>${steps('igSteps')}
        <div class="field">${t('webhookUrl')}${copyRow(webhook, 'igHook')}</div>
        <div class="grid2">${inp('ig-token', 'igToken', c.instagram.pageToken)}${inp('ig-verify', 'verifyToken', c.instagram.verifyToken || c.whatsapp.verifyToken)}</div>
        ${inp('ig-secret', 'appSecret', c.instagram.appSecret)}
        <label class="switch"><input type="checkbox" id="ig-on" ${c.instagram.enabled ? 'checked' : ''}>${t('enable')}</label>
      </section>
      <div class="row" style="position:sticky;bottom:0;padding:12px 0;background:var(--bg)"><button class="btn primary" id="saveCh" type="button">${t('save')}</button></div>
    </div>`;
    $$('[data-copy]', main).forEach((b) => (b.onclick = () => copyText($('#' + b.dataset.copy).textContent, b)));
    $('#saveCh').onclick = async () => {
      const body = { settings: {
        widget: { title: $('#w-title').value, greeting: $('#w-greeting').value, color: $('#w-color').value },
        channels: {
          telegram: { token: $('#tg-token').value, enabled: $('#tg-on').checked },
          whatsapp: { token: $('#wa-token').value, phoneNumberId: $('#wa-phone').value, verifyToken: $('#wa-verify').value, appSecret: $('#wa-secret').value, enabled: $('#wa-on').checked },
          instagram: { pageToken: $('#ig-token').value, verifyToken: $('#ig-verify').value, appSecret: $('#ig-secret').value, enabled: $('#ig-on').checked },
        },
      } };
      try { await api('/api/settings', { method: 'PUT', body }); toast(t('saved')); setTimeout(() => pageChannels(main), 600); } catch (err) { toast(err.message); }
    };
  }

  // ------------------------------------------------------------------ AI + playground
  async function pageAI(main) {
    const { settings: s, claudeModels } = await api('/api/settings');
    const ai = s.ai;
    const known = claudeModels.some((m) => m.id === ai.model);
    main.innerHTML = `<div class="page">
      <div class="page-head"><div><h1>${t('aiTitle')}</h1><p>${t('aiLead')}</p></div></div>
      <div class="grid2">
        <form class="card" id="aiForm">
          <label class="switch"><input type="checkbox" id="bot-on" ${s.botEnabled ? 'checked' : ''}>${t('botEnabled')}</label>
          <p class="muted small">${t('botEnabledHint')}</p>
          <label class="field" for="ai-provider">${t('provider')}<select id="ai-provider">
            <option value="anthropic" ${ai.provider === 'anthropic' ? 'selected' : ''}>${t('provAnthropic')}</option>
            <option value="openai" ${ai.provider === 'openai' ? 'selected' : ''}>${t('provOpenai')}</option></select></label>
          <div id="claudeFields" class="stack">
            <label class="field" for="ai-model-sel">${t('model')}<select id="ai-model-sel">
              ${claudeModels.map((m) => `<option value="${esc(m.id)}" ${ai.model === m.id ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}
              <option value="__custom" ${!known && ai.provider === 'anthropic' ? 'selected' : ''}>${t('customModel')}</option></select></label>
            <label class="field" for="ai-effort">${t('effort')} <span class="hint">${t('effortHint')}</span><select id="ai-effort">
              ${['low', 'medium', 'high'].map((e) => `<option value="${e}" ${ai.effort === e ? 'selected' : ''}>${e}</option>`).join('')}</select></label>
          </div>
          <label class="field" for="ai-model" id="modelFree">${t('model')}<input type="text" id="ai-model" class="ltr" value="${esc(ai.model)}" placeholder="qwen3:8b"></label>
          <label class="field" for="ai-key">${t('apiKey')}${s.aiKeyFromEnv ? ` <span class="hint">${t('keyFromEnv')}</span>` : ''}<input type="text" id="ai-key" class="ltr" value="${esc(ai.apiKey)}" autocomplete="off" spellcheck="false"></label>
          <label class="field" for="ai-base" id="baseField">${t('baseUrl')} <span class="hint">${t('baseUrlHint')}</span><input type="text" id="ai-base" class="ltr" value="${esc(ai.baseUrl)}" placeholder="https://openrouter.ai/api/v1"></label>
          <div class="row"><button class="btn primary" type="submit">${t('save')}</button></div>
        </form>
        <section class="card">
          <div class="card-head"><div><h2>${t('playTitle')}</h2><p class="muted small">${t('playLead')}</p></div><button class="btn sm" id="playReset" type="button">${t('reset')}</button></div>
          <div class="play"><div class="msgs" id="playMsgs"></div>
            <form class="composer" id="playForm"><textarea id="playBox" rows="1" placeholder="${t('playPh')}" aria-label="${t('playPh')}"></textarea><button class="btn primary" type="submit">${t('send')}</button></form></div>
        </section>
      </div>
    </div>`;
    const sync = () => {
      const isClaude = $('#ai-provider').value === 'anthropic';
      $('#claudeFields').style.display = isClaude ? '' : 'none';
      $('#baseField').style.display = isClaude ? 'none' : '';
      $('#modelFree').style.display = !isClaude || $('#ai-model-sel').value === '__custom' ? '' : 'none';
    };
    $('#ai-provider').onchange = sync;
    $('#ai-model-sel').onchange = sync;
    sync();
    $('#aiForm').onsubmit = async (e) => {
      e.preventDefault();
      const isClaude = $('#ai-provider').value === 'anthropic';
      const sel = $('#ai-model-sel').value;
      const body = { settings: { botEnabled: $('#bot-on').checked, ai: {
        provider: $('#ai-provider').value,
        model: isClaude && sel !== '__custom' ? sel : $('#ai-model').value,
        effort: $('#ai-effort').value,
        apiKey: $('#ai-key').value,
        baseUrl: isClaude ? '' : $('#ai-base').value,
      } } };
      try { await api('/api/settings', { method: 'PUT', body }); toast(t('saved')); } catch (err) { toast(err.message); }
    };

    // playground: reuse the test conversation stored on the server
    const msgs = $('#playMsgs');
    const add = (cls, text) => { const d = document.createElement('div'); d.className = 'msg ' + cls; d.textContent = text; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; };
    try {
      const { conversation } = await api('/api/conversations/' + encodeURIComponent('test:owner'));
      conversation.messages.forEach((m) => add(m.role === 'customer' ? 'customer' : 'bot', m.text));
    } catch { /* no test chat yet */ }
    $('#playReset').onclick = async () => { await api('/api/playground', { method: 'POST', body: { reset: true } }); msgs.innerHTML = ''; };
    const box = $('#playBox');
    box.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#playForm').requestSubmit(); } };
    $('#playForm').onsubmit = async (e) => {
      e.preventDefault();
      const text = box.value.trim();
      if (!text) return;
      box.value = '';
      add('customer', text);
      const pending = add('bot', t('thinking'));
      try {
        const out = await api('/api/playground', { method: 'POST', body: { text } });
        pending.textContent = out.reply || '';
        if (out.error) { const n = document.createElement('div'); n.className = 'notice'; n.textContent = t('aiError') + out.error.message; msgs.appendChild(n); }
      } catch (err) { pending.textContent = err.message; }
      msgs.scrollTop = msgs.scrollHeight;
    };
  }

  // ------------------------------------------------------------------ account
  function pageAccount(main) {
    main.innerHTML = `<div class="page">
      <div class="page-head"><h1>${t('account')}</h1></div>
      <form class="card" id="pwForm" style="max-width:480px">
        <h2>${t('pwTitle')}</h2>
        <label class="field" for="pw-cur">${t('current')}<input type="password" id="pw-cur" autocomplete="current-password"></label>
        <label class="field" for="pw-new">${t('next')} <span class="hint">${t('passwordHint')}</span><input type="password" id="pw-new" autocomplete="new-password"></label>
        <div class="err" id="pwErr"></div>
        <div class="row"><button class="btn primary" type="submit">${t('change')}</button></div>
      </form>
      <p class="muted small">Wakeel · ${t('version')} ${esc(state.session.version)} · MIT</p>
    </div>`;
    $('#pwForm').onsubmit = async (e) => {
      e.preventDefault();
      try { await api('/api/password', { method: 'POST', body: { current: $('#pw-cur').value, next: $('#pw-new').value } }); toast(t('saved')); $('#pwForm').reset(); $('#pwErr').textContent = ''; }
      catch (err) { $('#pwErr').textContent = err.message; }
    };
  }

  boot();
})();
