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
  const MORE = {
    ar: {
      bizType: 'نوع البيزنس', tplNone: 'غير ده / هبدأ من الصفر', tpl_restaurant: 'مطعم أو كافيه', tpl_clinic: 'عيادة', tpl_salon: 'صالون أو سبا', tpl_store: 'متجر أونلاين', tplHint: 'هنملالك منيو ومعلومات تجريبية تعدّلها براحتك', replyLang: 'لغة المحتوى التجريبي',
      fillTemplate: 'املا من قالب جاهز', fillConfirm: 'هيتحط محتوى القالب مكان الوصف والمواعيد والأسعار والسياسات. تكمّل؟', apply: 'تطبيق',
      catalogTitle: 'مزامنة المنتجات من متجرك', catalogLead: 'لو عندك متجر Dukkan أو WooCommerce أو Shopify، الوكيل هيقرا المنتجات والأسعار والمخزون منه تلقائياً كل ساعة.', source: 'المصدر', srcNone: 'مفيش', storeUrl: 'رابط المتجر', syncNow: 'زامن دلوقتي', products_n: 'منتج', lastSync: 'آخر مزامنة', dukkanNote: 'مع Dukkan الطلبات بتتسجل في المتجر نفسه برقم الطلب والإجمالي الحقيقي.',
      libTitle: 'صور يقدر الوكيل يبعتها', libLead: 'زي صورة المنيو أو قائمة الأسعار. لو العميل طلبها الوكيل يبعتها على طول.', imgName: 'اسم الصورة', imgNamePh: 'مثلاً: المنيو', upload: 'رفع صورة', noImages: 'مفيش صور لسه.',
      calTitle: 'المواعيد والحجوزات', calLead: 'الوكيل يعرض المواعيد الفاضية بس ومايحجزش ميعاد محجوز.', calOn: 'تفعيل نظام المواعيد', open: 'بيفتح', close: 'بيقفل', slot: 'مدة الميعاد (دقيقة)', closedDays: 'أيام الإجازة', tz: 'المنطقة الزمنية', ics: 'رابط iCal السري (اختياري)', icsHint: 'من Google Calendar ثم الإعدادات ثم «العنوان السري بتنسيق iCal». المواعيد المحجوزة في التقويم هتتقفل تلقائياً.', checkDay: 'شوف المواعيد الفاضية', freeSlots: 'مواعيد فاضية', noSlots: 'مفيش مواعيد فاضية',
      days: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
      msTitle: 'فيسبوك ماسنجر', msLead: 'رسائل صفحتك على فيسبوك، على نفس رابط الـ Webhook.', msToken: 'Page access token',
      msSteps: ['في نفس App بتاع Meta ضيف منتج Messenger', 'اربط صفحتك وانسخ Page access token', 'حط رابط الـ Webhook والـ Verify token، واشترك في messages'],
      notifyTitle: 'الإشعارات', notifyLead: 'يوصلك تنبيه أول ما ييجي طلب أو حجز أو عميل محتاجك.', tgLink: 'إشعارات على تليجرام', tgLinkHint: 'افتح الرابط ده من موبايلك واضغط Start:', tgLinkNeed: 'وصّل بوت تليجرام الأول (تحت) عشان تستلم الإشعارات عليه.', linked: 'أجهزة مربوطة', unlink: 'فك الربط', hook: 'Webhook (لـ n8n أو Make أو Zapier أو فاتورة أو ختم، وتقدر تحط أكتر من رابط بينهم مسافة)', events: 'ابعتلي لما', ev_order: 'طلب جديد', ev_booking: 'حجز جديد', ev_handoff: 'عميل محتاجني', ev_error: 'الوكيل يقع في مشكلة', testNotify: 'ابعت إشعار تجربة', browserNotify: 'إشعارات المتصفح', enableBrowser: 'فعّل إشعارات المتصفح', sent: 'اتبعت ✓',
      voiceTitle: 'الرسائل الصوتية', voiceLead: 'الوكيل يحوّل الفويس لنص ويرد عليه. محتاج خدمة تحويل صوت لنص متوافقة مع OpenAI.', voiceHint: 'مثال مجاني: Groq بالرابط https://api.groq.com/openai/v1 والنموذج whisper-large-v3-turbo', vision: 'النموذج بيشوف الصور', visionHint: 'فعّلها لو النموذج بيدعم الصور (Claude بيدعمها دايماً)',
      voiceNote: 'رسالة صوتية', newOrderAlert: 'طلب جديد!', attentionAlert: 'عميل محتاجك',
      stepNotify: 'فعّل الإشعارات عشان ماتفوّتش طلب',
      calSource: 'الحجز بيتم في', calBuiltin: 'وكيل نفسه', mawidUrl: 'رابط صفحة الحجز على Mawid', mawidNote: 'وكيل هيقرا الخدمات والمواعيد الفاضية من Mawid ويحجز فيه مباشرة. إعدادات المواعيد اللي تحت مش هتتستخدم.',
      username: 'اسم المستخدم', usernameHint: 'للموظفين بس. صاحب البيزنس يسيبه فاضي.',
      gapsTitle: 'أسئلة الوكيل ماعرفش يجاوبها', gapsLead: 'اكتب الإجابة مرة واحدة والوكيل هيعرفها بعد كده.', answerPh: 'اكتب الإجابة…', saveAnswer: 'حفظ الإجابة', dismiss: 'تجاهل', times: 'مرة', noGaps: 'مفيش أسئلة معلّقة 👌', gapsN: 'سؤال من غير إجابة',
      rating: 'متوسط التقييم (30 يوم)', ratings_n: 'تقييم',
      autoTitle: 'المتابعة التلقائية', followups: 'متابعة العملاء اللي ماكملوش الطلب (مرة واحدة)', ratingsOn: 'اطلب تقييم بعد ما الطلب يخلص', summaryOn: 'ملخص يومي على تليجرام أو الـ Webhook الساعة', ev_payment: 'دفع أونلاين', ev_lowRating: 'تقييم منخفض', ev_summary: 'الملخص اليومي',
      payTitle: 'الدفع أونلاين', payLead: 'الوكيل يبعت رابط دفع للعميل بعد الطلب. Stripe بيأكد الدفع تلقائياً، و Paymob بتأكده إنت بضغطة.', provider_none: 'مفيش', currencyCode: 'العملة (مثلاً EGP أو SAR أو USD)', stripeKey: 'Stripe secret key', stripeHook: 'Stripe webhook signing secret', stripeHookUrl: 'رابط الـ Webhook في Stripe (حدث checkout.session.completed)', paymobSecret: 'Paymob secret key', paymobPublic: 'Paymob public key', paymobIds: 'Integration IDs (مفصولة بفاصلة)',
      payLink: 'ابعت رابط دفع', paid: 'مدفوع', markPaid: 'اتدفع', totalQ: 'إجمالي الطلب', unpaid: 'رابط الدفع اتبعت',
      teamTitle: 'الفريق', teamLead: 'الموظفين يدخلوا باسم مستخدم ويشوفوا المحادثات والطلبات بس، من غير الإعدادات.', name: 'الاسم', addMember: 'إضافة موظف', noTeam: 'مفيش موظفين لسه.', remove: 'إزالة',
    },
    en: {
      bizType: 'Business type', tplNone: 'Other / start empty', tpl_restaurant: 'Restaurant or café', tpl_clinic: 'Clinic', tpl_salon: 'Salon or spa', tpl_store: 'Online store', tplHint: 'We add a sample menu and info you can edit', replyLang: 'Sample content language',
      fillTemplate: 'Fill from a template', fillConfirm: 'This replaces your description, hours, prices and policies with the template. Continue?', apply: 'Apply',
      catalogTitle: 'Sync products from your store', catalogLead: 'If you run a Dukkan, WooCommerce or Shopify store, the assistant reads products, prices and stock from it every hour.', source: 'Source', srcNone: 'None', storeUrl: 'Store URL', syncNow: 'Sync now', products_n: 'products', lastSync: 'Last sync', dukkanNote: 'With Dukkan, orders are placed in your store with its real order number and total.',
      libTitle: 'Images the assistant can send', libLead: 'For example your menu or price list. When a customer asks, the assistant sends it.', imgName: 'Image name', imgNamePh: 'e.g. Menu', upload: 'Upload image', noImages: 'No images yet.',
      calTitle: 'Appointments', calLead: 'The assistant offers only free times and never double-books.', calOn: 'Turn on appointments', open: 'Opens', close: 'Closes', slot: 'Slot length (minutes)', closedDays: 'Closed days', tz: 'Time zone', ics: 'Secret iCal address (optional)', icsHint: 'In Google Calendar: Settings → your calendar → “Secret address in iCal format”. Busy times there are blocked automatically.', checkDay: 'Check free times', freeSlots: 'Free times', noSlots: 'No free times',
      days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      msTitle: 'Facebook Messenger', msLead: 'Messages to your Facebook Page, on the same webhook URL.', msToken: 'Page access token',
      msSteps: ['In the same Meta app, add the Messenger product', 'Connect your Page and copy its Page access token', 'Set the webhook URL and verify token, subscribe to messages'],
      notifyTitle: 'Notifications', notifyLead: 'Get an alert the moment an order, booking or customer needs you.', tgLink: 'Telegram alerts', tgLinkHint: 'Open this link on your phone and tap Start:', tgLinkNeed: 'Connect a Telegram bot first (below) to receive alerts there.', linked: 'Linked chats', unlink: 'Unlink all', hook: 'Webhooks (n8n, Make, Zapier, Fatoora, Khatm; separate several URLs with spaces)', events: 'Alert me about', ev_order: 'New orders', ev_booking: 'New bookings', ev_handoff: 'Customers who need me', ev_error: 'Assistant errors', testNotify: 'Send a test alert', browserNotify: 'Browser notifications', enableBrowser: 'Turn on browser notifications', sent: 'Sent ✓',
      voiceTitle: 'Voice notes', voiceLead: 'The assistant transcribes voice notes and answers them. Needs an OpenAI-compatible speech-to-text API.', voiceHint: 'Free option: Groq at https://api.groq.com/openai/v1 with model whisper-large-v3-turbo', vision: 'Model can see images', visionHint: 'Turn on if your model supports images (Claude always does)',
      voiceNote: 'Voice note', newOrderAlert: 'New order!', attentionAlert: 'A customer needs you',
      stepNotify: 'Turn on notifications so you never miss an order',
      calSource: 'Bookings are made in', calBuiltin: 'Wakeel itself', mawidUrl: 'Your Mawid booking page URL', mawidNote: 'Wakeel reads services and free times from Mawid and books straight into it. The hours below are not used.',
      username: 'Username', usernameHint: 'Staff only. The owner leaves it empty.',
      gapsTitle: 'Questions the assistant could not answer', gapsLead: 'Write the answer once and the assistant will know it from now on.', answerPh: 'Write the answer…', saveAnswer: 'Save answer', dismiss: 'Dismiss', times: 'times', noGaps: 'No open questions 👌', gapsN: 'unanswered questions',
      rating: 'Average rating (30 days)', ratings_n: 'ratings',
      autoTitle: 'Automatic follow-up', followups: 'Follow up once with customers who did not finish ordering', ratingsOn: 'Ask for a rating after an order is done', summaryOn: 'Daily summary on Telegram or webhook at', ev_payment: 'Online payments', ev_lowRating: 'Low ratings', ev_summary: 'Daily summary',
      payTitle: 'Online payments', payLead: 'The assistant sends a payment link after an order. Stripe confirms payment automatically; with Paymob you mark it paid with one click.', provider_none: 'None', currencyCode: 'Currency (e.g. EGP, SAR, USD)', stripeKey: 'Stripe secret key', stripeHook: 'Stripe webhook signing secret', stripeHookUrl: 'Webhook URL for Stripe (event checkout.session.completed)', paymobSecret: 'Paymob secret key', paymobPublic: 'Paymob public key', paymobIds: 'Integration IDs (comma separated)',
      payLink: 'Send payment link', paid: 'Paid', markPaid: 'Mark paid', totalQ: 'Order total', unpaid: 'Payment link sent',
      teamTitle: 'Team', teamLead: 'Staff sign in with a username and see only conversations and orders, not settings.', name: 'Name', addMember: 'Add member', noTeam: 'No team members yet.', remove: 'Remove',
    },
  };
  Object.assign(STR.ar, MORE.ar);
  Object.assign(STR.en, MORE.en);
  const BASE = location.pathname.replace(/\/[^/]*$/, '');
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
    const res = await fetch(BASE + path, {
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
  const convName = (c) => c.name || (c.channel === 'web' ? `${lang === 'ar' ? 'زائر الموقع' : 'Website visitor'} · ${String(c.externalId).slice(-4)}` : c.externalId);
  const chIcon = (c) => `<span class="ch ${esc(c)}" aria-label="${esc(c)}">${{ whatsapp: 'WA', instagram: 'IG', messenger: 'FB', telegram: 'TG', web: 'WEB', test: 'T' }[c] || '?'}</span>`;

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
      <div class="brand"><img src="favicon.svg" alt="">Wakeel <span class="muted small">وكيل</span></div>${inner}
      <div class="err" id="authErr"></div>
      <div class="row"><button class="btn primary" type="submit" id="authBtn"></button><span class="spacer"></span><button class="btn sm" type="button" id="langBtn">${t('lang')}</button></div>
    </form></div>`;
    $('#langBtn').onclick = () => { lang = lang === 'ar' ? 'en' : 'ar'; safeSet('wk_lang', lang); boot(); };
  }

  function renderSetup() {
    authFrame(`<div class="stack"><h1>${t('setupTitle')}</h1><p class="muted">${t('setupLead')}</p></div>
      <label class="field" for="f-bn">${t('businessName')}<input type="text" id="f-bn" autocomplete="organization"></label>
      <label class="field" for="f-tpl">${t('bizType')} <span class="hint">${t('tplHint')}</span><select id="f-tpl">
        ${(state.session.templates || []).map((k) => `<option value="${k}">${t('tpl_' + k)}</option>`).join('')}<option value="">${t('tplNone')}</option></select></label>
      <label class="field" for="f-pw">${t('password')} <span class="hint">${t('passwordHint')}</span><input type="password" id="f-pw" autocomplete="new-password" minlength="8" required></label>
      ${state.session.setupTokenRequired ? `<label class="field" for="f-st">${t('setupToken')}<input type="password" id="f-st" class="ltr"></label>` : ''}`);
    $('#authBtn').textContent = t('start');
    $('#authForm').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await api('/api/setup', { method: 'POST', body: { password: $('#f-pw').value, businessName: $('#f-bn').value, template: $('#f-tpl').value, lang, setupToken: $('#f-st')?.value } });
        location.hash = '#overview';
        boot();
      } catch (err) { $('#authErr').textContent = err.message; }
    };
    $('#f-bn').focus();
  }

  function renderLogin() {
    authFrame(`<h1>${t('loginTitle')}</h1>
      ${state.session.hasStaff ? `<label class="field" for="f-user">${t('username')} <span class="hint">${t('usernameHint')}</span><input type="text" id="f-user" class="ltr" autocomplete="username"></label>` : ''}
      <label class="field" for="f-pw">${t('password')}<input type="password" id="f-pw" autocomplete="current-password" required></label>`);
    $('#authBtn').textContent = t('login');
    $('#authForm').onsubmit = async (e) => {
      e.preventDefault();
      try { await api('/api/login', { method: 'POST', body: { username: $('#f-user')?.value || '', password: $('#f-pw').value } }); boot(); }
      catch (err) { $('#authErr').textContent = err.message; }
    };
    $('#f-pw').focus();
  }

  // ------------------------------------------------------------------ shell + routing
  const PAGES = ['overview', 'inbox', 'requests', 'knowledge', 'channels', 'ai', 'account'];

  const STAFF_PAGES = ['overview', 'inbox', 'requests', 'account'];
  const myPages = () => (state.session?.role === 'agent' ? STAFF_PAGES : PAGES);

  function renderShell() {
    const navItems = myPages().map((p) => `<a class="nav" href="#${p}" data-page="${p}"><span>${t(p)}</span><span class="badge" data-badge="${p}" hidden></span></a>`).join('');
    app.innerHTML = `<div class="shell">
      <nav class="rail" aria-label="Main">
        <div class="brand"><img src="favicon.svg" alt="">Wakeel</div>
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
    return myPages().includes(h) ? h : 'overview';
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
      const prev = state.lastCounts;
      state.lastCounts = { pending: o.pendingRequests, attention: o.needsAttention, latest: o.latestPendingId };
      if (prev && (o.latestPendingId !== prev.latest && o.pendingRequests >= prev.pending && o.latestPendingId)) alertOwner(t('newOrderAlert'), '#requests');
      else if (prev && o.needsAttention > prev.attention) alertOwner(t('attentionAlert'), '#inbox');
    } catch { /* ignore */ }
  }

  function alertOwner(text, hash) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; g.gain.value = 0.08;
      o.start(); o.stop(ctx.currentTime + 0.18);
    } catch { /* audio blocked */ }
    document.title = '(!) Wakeel';
    setTimeout(() => (document.title = 'Wakeel'), 8000);
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const n = new Notification('Wakeel', { body: text, icon: 'favicon.svg' });
        n.onclick = () => { window.focus(); location.hash = hash; n.close(); };
      }
    } catch { /* not allowed */ }
    toast(text);
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
    const steps = state.session.role === 'agent' ? [] : [
      [o.aiReady, t('stepAI'), '#ai'],
      [o.profileReady, t('stepInfo'), '#knowledge'],
      [anyChannel, t('stepChannel'), '#channels'],
      [o.notifyReady, t('stepNotify'), '#channels'],
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
      ${o.rating || o.openGaps ? `<div class="grid2">
        ${o.rating ? `<div class="card stat"><b>⭐ ${o.rating.avg}</b><span>${t('rating')} · ${o.rating.count} ${t('ratings_n')}</span></div>` : ''}
        ${o.openGaps && state.session.role !== 'agent' ? `<a class="card stat alert" href="#knowledge" style="text-decoration:none;color:inherit"><b>${o.openGaps}</b><span>${t('gapsN')}</span></a>` : ''}
      </div>` : ''}
      <div class="grid2">
        <section class="card"><h2>${t('perDay')}</h2>
          <div class="bars">${o.perDay.map((d, i) => `<div class="bar ${i === 6 ? 'today' : ''}"><small>${d.count}</small><i style="height:${Math.max(2, Math.round((d.count / max) * 110))}px"></i></div>`).join('')}</div>
          <div class="bar-labels">${o.perDay.map((d) => `<span>${dayName(d.day)}</span>`).join('')}</div>
        </section>
        <section class="card"><h2>${t('channelStatus')}</h2>
          <div class="stack">
            ${chRow('whatsapp', 'WhatsApp', ch.whatsapp)}
            ${chRow('instagram', 'Instagram', ch.instagram)}
            ${chRow('messenger', 'Messenger', ch.messenger)}
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
    const list = conversations.filter((c) => !q || convName(c).toLowerCase().includes(q) || (c.lastMessage?.text || '').toLowerCase().includes(q));
    items.innerHTML = list.length ? list.map((c) => `<button class="conv" data-id="${esc(c.id)}" aria-current="${c.id === state.currentConv}">
        ${chIcon(c.channel)}
        <span style="min-width:0"><span class="name" style="display:block">${esc(convName(c))}</span><span class="preview" style="display:block">${esc(c.lastMessage?.text || '')}</span></span>
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
        ${chIcon(c.channel)}<h2>${esc(convName(c))}</h2>
        <span class="pill ${human ? 'warn' : 'good'}">${human ? t('modeHuman') : t('modeBot')}</span>
        <span class="spacer"></span>
        <button class="btn sm" id="modeBtn" type="button">${human ? t('handBack') : t('takeOver')}</button>
        <button class="btn sm danger" id="delBtn" type="button">${t('del')}</button>
      </div>
      <div class="msgs" id="msgs" data-count="${c.messages.length}" data-mode="${c.mode}">
        ${c.messages.map((m) => `<div class="msg ${m.role}">${msgBody(m)}<small>${m.role === 'owner' ? (m.by ? esc(m.by) + ' · ' : (lang === 'ar' ? 'إنت · ' : 'You · ')) : m.role === 'bot' ? (lang === 'ar' ? 'الوكيل · ' : 'Assistant · ') : ''}${time(m.at)}</small></div>`).join('')}
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

  function msgBody(m) {
    if (m.imageUrl) return `<img class="att" src="${esc(BASE ? m.imageUrl.slice(BASE.length).replace(/^\//, '') : m.imageUrl.replace(/^\//, ''))}" alt="${esc(m.text)}">`;
    let out = '';
    if (m.image) out += `<a href="${esc('api/media/' + m.image)}" target="_blank" rel="noopener"><img class="att" src="${esc('api/media/' + m.image)}" alt=""></a>`;
    if (m.audio) out += `<audio class="att" controls preload="none" src="${esc('api/media/' + m.audio)}"></audio>`;
    if (m.text && m.text !== '📷') out += `<div>${esc(m.text)}</div>`;
    return out || esc(m.text);
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
          <td><div class="stack" style="gap:4px"><span class="pill ${pill[r.status]}">${t('st_' + r.status)}</span>${r.payment?.status === 'paid' ? `<span class="pill good">💳 ${t('paid')}</span>` : r.payment ? `<a class="pill warn" href="${esc(r.payment.url)}" target="_blank" rel="noopener">💳 ${t('unpaid')}</a>` : ''}${r.total ? `<span class="small mono">${esc(r.total)}</span>` : ''}</div></td>
          <td><div class="stack" style="gap:6px">
            ${r.status === 'pending' ? `<button class="btn sm primary" data-act="confirmed" data-id="${esc(r.id)}">${t('confirmNotify')}</button>` : ''}
            ${r.status === 'confirmed' ? `<button class="btn sm" data-act="done" data-id="${esc(r.id)}">${t('markDone')}</button>` : ''}
            ${r.status === 'pending' || r.status === 'confirmed' ? `<button class="btn sm danger" data-act="cancelled" data-id="${esc(r.id)}">${t('cancelNotify')}</button>` : ''}
            ${r.type === 'order' && r.status !== 'cancelled' && r.payment?.status !== 'paid' && state.session.role !== 'agent' ? `<button class="btn sm" data-pay="${esc(r.id)}" data-total="${esc(r.total ?? '')}">${t('payLink')}</button>` : ''}
            ${r.payment && r.payment.status !== 'paid' ? `<button class="btn sm" data-paid="${esc(r.id)}">${t('markPaid')}</button>` : ''}
            <a class="btn sm" href="#inbox:${encodeURIComponent(r.conversationId)}">${t('openChat')}</a>
          </div></td></tr>`).join('')}</tbody></table></div>` : `<div class="card empty">${t('noRequests')}</div>`}
    </div>`;
    $$('[data-f]', main).forEach((b) => (b.onclick = () => { state.reqFilter = b.dataset.f; pageRequests(main); }));
    $$('[data-pay]', main).forEach((b) => (b.onclick = () => {
      const d = document.createElement('dialog');
      d.innerHTML = `<form method="dialog" class="stack" style="min-width:260px"><label class="field" for="pay-total">${t('totalQ')}<input type="number" step="0.01" min="0" id="pay-total" value="${esc(b.dataset.total)}" required></label><div class="row"><button class="btn primary" value="yes">${t('payLink')}</button><button class="btn" value="no">${t('cancel')}</button></div></form>`;
      d.style.cssText = 'border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--ink);padding:20px';
      document.body.appendChild(d);
      d.addEventListener('close', async () => {
        const total = Number($('#pay-total', d).value);
        d.remove();
        if (d.returnValue !== 'yes') return;
        try { const out = await api('/api/requests/' + b.dataset.pay, { method: 'PATCH', body: { action: 'paymentLink', total, send: true } }); if (out.warning) toast(out.warning); else toast(t('sent')); pageRequests(main); }
        catch (err) { toast(err.message); }
      });
      d.showModal();
    }));
    $$('[data-paid]', main).forEach((b) => (b.onclick = async () => { await api('/api/requests/' + b.dataset.paid, { method: 'PATCH', body: { action: 'markPaid' } }); pageRequests(main); }));
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
      <div class="page-head"><div><h1>${t('knowledge')}</h1><p>${t('profileLead')}</p></div>
        <div class="row"><select id="tplPick" aria-label="${t('fillTemplate')}">${['restaurant', 'clinic', 'salon', 'store'].map((k) => `<option value="${k}" ${p.businessType === k ? 'selected' : ''}>${t('tpl_' + k)}</option>`).join('')}</select><button class="btn" id="tplBtn" type="button">${t('fillTemplate')}</button></div></div>
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
        <div id="docs" data-x>${knowledge.length ? knowledge.map((k) => `<div class="doc"><div><h3>${esc(k.title)}</h3><p>${esc(k.text)}</p><span class="muted small">${k.length.toLocaleString()} ${t('chars')}</span></div><button class="btn sm danger" data-del="${esc(k.id)}" type="button">${t('del')}</button></div>`).join('') : `<p class="muted">${t('noDocs')}</p>`}</div>
      </section>
      <div id="kExtras" class="stack" style="gap:22px"></div>
    </div>`;
    $('#tplBtn').onclick = () => confirmDialog(t('fillConfirm'), async () => { await api('/api/template', { method: 'POST', body: { template: $('#tplPick').value, lang, overwrite: true } }); pageKnowledge(main); toast(t('saved')); });
    renderKnowledgeExtras($('#kExtras'));
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

  // ------------------------------------------------------------------ catalog, image library, appointments
  async function renderKnowledgeExtras(box) {
    const [{ settings: s }, cat, { library }, { gaps }] = await Promise.all([api('/api/settings'), api('/api/catalog'), api('/api/library'), api('/api/gaps')]);
    const c = s.catalog, cal = s.calendar;
    const catStatus = (x) => x.error ? `<span class="pill bad" title="${esc(x.error)}">${esc(x.error)}</span>` : x.syncedAt ? `<span class="pill good">${x.count} ${t('products_n')}</span> <span class="muted small">${t('lastSync')}: ${time(x.syncedAt)}</span>` : '';
    const tzs = (() => { try { return Intl.supportedValuesOf('timeZone'); } catch { return []; } })();
    box.innerHTML = `
      <section class="card" id="gaps">
        <div><h2>${t('gapsTitle')}</h2><p class="muted small">${t('gapsLead')}</p></div>
        ${gaps.length ? gaps.map((g) => `<form class="stack" data-gap="${esc(g.id)}" style="gap:8px;padding-bottom:12px;border-bottom:1px solid var(--line)">
          <div class="row"><b>${esc(g.question)}</b><span class="pill warn">${g.count} ${t('times')}</span></div>
          <div class="row"><input type="text" placeholder="${t('answerPh')}" aria-label="${t('answerPh')}" style="flex:1;min-width:200px"><button class="btn sm primary" type="submit">${t('saveAnswer')}</button><button class="btn sm" type="button" data-dismiss>${t('dismiss')}</button></div>
        </form>`).join('') : `<p class="muted">${t('noGaps')}</p>`}
      </section>

      <section class="card">
        <div><h2>${t('catalogTitle')}</h2><p class="muted small">${t('catalogLead')}</p></div>
        <div class="grid2">
          <label class="field" for="c-src">${t('source')}<select id="c-src">
            ${[['none', t('srcNone')], ['dukkan', 'Dukkan'], ['woocommerce', 'WooCommerce'], ['shopify', 'Shopify']].map(([v, l]) => `<option value="${v}" ${c.source === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="field" for="c-url">${t('storeUrl')}<input type="text" id="c-url" class="ltr" value="${esc(c.url)}" placeholder="https://shop.example.com"></label>
        </div>
        <p class="muted small" id="c-note">${c.source === 'dukkan' ? t('dukkanNote') : ''}</p>
        <div class="row"><button class="btn primary" id="c-save" type="button">${t('save')}</button><button class="btn" id="c-sync" type="button">${t('syncNow')}</button><span id="c-status">${catStatus(cat)}</span></div>
        <div class="small muted" id="c-sample">${(cat.sample || []).map((x) => esc(x.name)).join(' · ')}</div>
      </section>

      <section class="card">
        <div><h2>${t('libTitle')}</h2><p class="muted small">${t('libLead')}</p></div>
        <div class="row"><input type="text" id="l-name" placeholder="${t('imgNamePh')}" aria-label="${t('imgName')}" style="max-width:240px"><button class="btn" id="l-up" type="button">${t('upload')}</button><input type="file" id="l-file" accept="image/jpeg,image/png,image/webp" hidden></div>
        <div class="lib">${library.length ? library.map((l) => `<figure><img src="${esc(l.url.slice(BASE.length).replace(/^\//, ''))}" alt="${esc(l.name)}"><figcaption><span>${esc(l.name)}</span><button class="btn sm danger" data-lib="${esc(l.id)}" type="button">${t('del')}</button></figcaption></figure>`).join('') : `<p class="muted">${t('noImages')}</p>`}</div>
      </section>

      <section class="card">
        <div><h2>${t('calTitle')}</h2><p class="muted small">${t('calLead')}</p></div>
        <div class="grid2"><label class="field" for="cal-src">${t('calSource')}<select id="cal-src"><option value="builtin" ${cal.source !== 'mawid' ? 'selected' : ''}>${t('calBuiltin')}</option><option value="mawid" ${cal.source === 'mawid' ? 'selected' : ''}>Mawid</option></select></label>
          <label class="field" for="cal-mu" id="cal-mu-f">${t('mawidUrl')}<input type="text" id="cal-mu" class="ltr" value="${esc(cal.mawidUrl || '')}" placeholder="https://book.example.com"></label></div>
        <p class="muted small" id="cal-mnote">${t('mawidNote')}</p>
        <label class="switch"><input type="checkbox" id="cal-on" ${cal.enabled ? 'checked' : ''}>${t('calOn')}</label>
        <div class="grid4">
          <label class="field" for="cal-open">${t('open')}<input type="time" id="cal-open" value="${esc(cal.open)}"></label>
          <label class="field" for="cal-close">${t('close')}<input type="time" id="cal-close" value="${esc(cal.close)}"></label>
          <label class="field" for="cal-slot">${t('slot')}<input type="number" id="cal-slot" min="10" step="5" value="${esc(cal.slotMinutes)}"></label>
          <label class="field" for="cal-tz">${t('tz')}<input type="text" id="cal-tz" class="ltr" list="tzList" value="${esc(cal.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)}"></label>
        </div>
        <datalist id="tzList">${tzs.map((z) => `<option value="${z}">`).join('')}</datalist>
        <div class="field">${t('closedDays')}<div class="days">${t('days').map((d, i) => `<label><input type="checkbox" value="${i}" ${cal.closedDays.map(Number).includes(i) ? 'checked' : ''}>${d}</label>`).join('')}</div></div>
        <label class="field" for="cal-ics">${t('ics')} <span class="hint">${t('icsHint')}</span><input type="text" id="cal-ics" class="ltr" value="${esc(cal.icsUrl)}" placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"></label>
        <div class="row"><button class="btn primary" id="cal-save" type="button">${t('save')}</button><span class="spacer"></span><input type="date" id="cal-day" value="${new Date().toISOString().slice(0, 10)}" aria-label="date"><button class="btn" id="cal-check" type="button">${t('checkDay')}</button></div>
        <div class="slots" id="cal-slots"></div>
      </section>`;

    const saveSettings = (settings) => api('/api/settings', { method: 'PUT', body: { settings } });
    $$('[data-gap]', box).forEach((f) => {
      f.onsubmit = async (e) => {
        e.preventDefault();
        try { await api('/api/gaps/' + f.dataset.gap, { method: 'POST', body: { answer: $('input', f).value } }); toast(t('saved')); renderKnowledgeExtras(box); } catch (err) { toast(err.message); }
      };
      $('[data-dismiss]', f).onclick = async () => { await api('/api/gaps/' + f.dataset.gap, { method: 'DELETE', body: {} }); renderKnowledgeExtras(box); };
    });
    $('#c-src').onchange = () => { $('#c-note').textContent = $('#c-src').value === 'dukkan' ? t('dukkanNote') : ''; };
    $('#c-save').onclick = async () => { try { await saveSettings({ catalog: { source: $('#c-src').value, url: $('#c-url').value } }); toast(t('saved')); setTimeout(() => renderKnowledgeExtras(box), 2500); } catch (e) { toast(e.message); } };
    $('#c-sync').onclick = async (ev) => {
      ev.target.disabled = true;
      try { const r = await api('/api/catalog/sync', { method: 'POST', body: {} }); $('#c-status').innerHTML = catStatus(r); $('#c-sample').textContent = (r.sample || []).map((x) => x.name).join(' · '); }
      catch (e) { toast(e.message); }
      ev.target.disabled = false;
    };
    $('#l-up').onclick = () => { if (!$('#l-name').value.trim()) { $('#l-name').focus(); return toast(t('imgNamePh')); } $('#l-file').click(); };
    $('#l-file').onchange = async () => {
      const f = $('#l-file').files[0];
      if (!f) return;
      const data = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(f); });
      try { await api('/api/library', { method: 'POST', body: { name: $('#l-name').value, mime: f.type, data } }); renderKnowledgeExtras(box); } catch (e) { toast(e.message); }
    };
    $$('[data-lib]', box).forEach((b) => (b.onclick = async () => { await api('/api/library/' + b.dataset.lib, { method: 'DELETE', body: {} }); renderKnowledgeExtras(box); }));
    $('#cal-save').onclick = async () => {
      try {
        await saveSettings({ calendar: {
          source: $('#cal-src').value, mawidUrl: $('#cal-mu').value,
          enabled: $('#cal-on').checked, open: $('#cal-open').value, close: $('#cal-close').value, slotMinutes: Number($('#cal-slot').value) || 30,
          timezone: $('#cal-tz').value, icsUrl: $('#cal-ics').value, closedDays: $$('.days input:checked', box).map((i) => Number(i.value)),
        } });
        toast(t('saved'));
      } catch (e) { toast(e.message); }
    };
    const syncCal = () => { const m = $('#cal-src').value === 'mawid'; $('#cal-mu-f').style.display = m ? '' : 'none'; $('#cal-mnote').style.display = m ? '' : 'none'; };
    $('#cal-src').onchange = syncCal; syncCal();
    $('#cal-check').onclick = async () => {
      try {
        const r = await api('/api/availability?date=' + encodeURIComponent($('#cal-day').value));
        $('#cal-slots').innerHTML = r.slots.length ? r.slots.map((x) => `<span>${esc(x)}</span>`).join('') : `<p class="muted small">${t('noSlots')}${r.reason ? ' · ' + esc(r.reason) : ''}</p>`;
      } catch (e) { toast(e.message); }
    };
  }

  // ------------------------------------------------------------------ channels
  async function pageChannels(main) {
    const [{ settings: s, webhookPath, telegramBot }, { channels: st }] = await Promise.all([api('/api/settings'), api('/api/channels')]);
    const c = s.channels, n = s.notify;
    const origin = location.origin;
    const embed = `<script src="${origin}${BASE}/widget.js" async></script>`;
    const tgLink = telegramBot ? `https://t.me/${telegramBot}?start=${n.linkCode}` : '';
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    const webhook = origin + webhookPath;
    const statusPill = (x) => x.error ? `<span class="pill bad" title="${esc(x.error)}">${t('error')}</span>` : (x.connected || x.configured) ? `<span class="pill good">${x.username ? '@' + esc(x.username) : t('configured')}</span>` : `<span class="pill off">${t('notConnected')}</span>`;
    const inp = (id, label, value, ltr = true) => `<label class="field" for="${id}">${t(label)}<input type="text" id="${id}" class="${ltr ? 'ltr' : ''}" value="${esc(value)}" autocomplete="off" spellcheck="false"></label>`;
    const copyRow = (text, id) => `<div class="copy"><pre id="${id}">${esc(text)}</pre><button class="btn sm" type="button" data-copy="${id}">${t('copy')}</button></div>`;
    const steps = (key) => `<details class="steps"><summary>${lang === 'ar' ? 'إزاي أوصّلها؟' : 'How to connect'}</summary><ol>${t(key).map((x) => `<li>${esc(x)}</li>`).join('')}</ol></details>`;
    main.innerHTML = `<div class="page">
      <div class="page-head"><h1>${t('channels')}</h1></div>
      <section class="card" id="notify">
        <div><h2>${t('notifyTitle')}</h2><p class="muted small">${t('notifyLead')}</p></div>
        <div class="field">${t('tgLink')}
          ${tgLink ? `<span class="hint">${t('tgLinkHint')}</span>${copyRow(tgLink, 'tgLinkUrl')}<div class="row small"><span class="muted">${t('linked')}: ${n.telegramChats.length}</span>${n.telegramChats.length ? `<button class="btn sm danger" id="unlinkBtn" type="button">${t('unlink')}</button>` : ''}</div>` : `<span class="hint">${t('tgLinkNeed')}</span>`}
        </div>
        ${inp('n-hook', 'hook', n.webhookUrl)}
        <div class="field">${t('events')}<div class="checks">${['order', 'booking', 'handoff', 'payment', 'lowRating', 'summary', 'error'].map((e) => `<label><input type="checkbox" data-ev="${e}" ${n.events[e] ? 'checked' : ''}>${t('ev_' + e)}</label>`).join('')}</div></div>
        <div class="row"><button class="btn" id="testNotify" type="button">${t('testNotify')}</button>
          ${perm === 'default' ? `<button class="btn" id="browserNotify" type="button">${t('enableBrowser')}</button>` : perm === 'granted' ? `<span class="pill good">${t('browserNotify')}</span>` : ''}</div>
        <hr style="border:0;border-top:1px solid var(--line);width:100%;margin:2px 0">
        <h3>${t('autoTitle')}</h3>
        <label class="switch"><input type="checkbox" id="au-fu" ${s.followups.enabled ? 'checked' : ''}>${t('followups')}</label>
        <label class="switch"><input type="checkbox" id="au-rt" ${s.ratings.enabled ? 'checked' : ''}>${t('ratingsOn')}</label>
        <div class="row"><label class="switch"><input type="checkbox" id="au-sm" ${s.summary.enabled ? 'checked' : ''}>${t('summaryOn')}</label>
          <select id="au-hour" aria-label="hour" style="width:auto">${[...Array(24)].map((_, h) => `<option value="${h}" ${Number(s.summary.hour) === h ? 'selected' : ''}>${String(h).padStart(2, '0')}:00</option>`).join('')}</select></div>
      </section>
      <section class="card" id="payments">
        <div><h2>${t('payTitle')}</h2><p class="muted small">${t('payLead')}</p></div>
        <div class="grid2">
          <label class="field" for="py-prov">${t('provider')}<select id="py-prov">${[['none', t('provider_none')], ['stripe', 'Stripe'], ['paymob', 'Paymob']].map(([v, l]) => `<option value="${v}" ${s.payments.provider === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          ${inp('py-cur', 'currencyCode', s.payments.currency)}
        </div>
        <div class="stack" data-prov="stripe">
          <div class="grid2">${inp('py-sk', 'stripeKey', s.payments.stripeSecretKey)}${inp('py-wh', 'stripeHook', s.payments.stripeWebhookSecret)}</div>
          <div class="field">${t('stripeHookUrl')}${copyRow(origin + BASE + '/webhooks/stripe', 'stripeHookUrl')}</div>
        </div>
        <div class="stack" data-prov="paymob">
          <div class="grid2">${inp('pm-sk', 'paymobSecret', s.payments.paymobSecretKey)}${inp('pm-pk', 'paymobPublic', s.payments.paymobPublicKey)}</div>
          ${inp('pm-ids', 'paymobIds', s.payments.paymobIntegrationIds)}
        </div>
      </section>
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
      <section class="card"><div class="card-head"><div class="row">${chIcon('messenger')}<h2>${t('msTitle')}</h2></div>${statusPill(st.messenger)}</div>
        <p class="muted small">${t('msLead')}</p>${steps('msSteps')}
        <div class="field">${t('webhookUrl')}${copyRow(webhook, 'msHook')}</div>
        <div class="grid2">${inp('ms-token', 'msToken', c.messenger.pageToken)}${inp('ms-verify', 'verifyToken', c.messenger.verifyToken || c.whatsapp.verifyToken)}</div>
        ${inp('ms-secret', 'appSecret', c.messenger.appSecret)}
        <label class="switch"><input type="checkbox" id="ms-on" ${c.messenger.enabled ? 'checked' : ''}>${t('enable')}</label>
      </section>
      <div class="row" style="position:sticky;bottom:0;padding:12px 0;background:var(--bg)"><button class="btn primary" id="saveCh" type="button">${t('save')}</button></div>
    </div>`;
    $$('[data-copy]', main).forEach((b) => (b.onclick = () => copyText($('#' + b.dataset.copy).textContent, b)));
    const syncPay = () => $$('[data-prov]', main).forEach((el) => (el.style.display = el.dataset.prov === $('#py-prov').value ? '' : 'none'));
    $('#py-prov').onchange = syncPay;
    syncPay();
    $('#saveCh').onclick = async () => {
      const body = { settings: {
        widget: { title: $('#w-title').value, greeting: $('#w-greeting').value, color: $('#w-color').value },
        channels: {
          telegram: { token: $('#tg-token').value, enabled: $('#tg-on').checked },
          whatsapp: { token: $('#wa-token').value, phoneNumberId: $('#wa-phone').value, verifyToken: $('#wa-verify').value, appSecret: $('#wa-secret').value, enabled: $('#wa-on').checked },
          instagram: { pageToken: $('#ig-token').value, verifyToken: $('#ig-verify').value, appSecret: $('#ig-secret').value, enabled: $('#ig-on').checked },
          messenger: { pageToken: $('#ms-token').value, verifyToken: $('#ms-verify').value, appSecret: $('#ms-secret').value, enabled: $('#ms-on').checked },
        },
        notify: { webhookUrl: $('#n-hook').value, events: Object.fromEntries($$('[data-ev]', main).map((i) => [i.dataset.ev, i.checked])) },
        followups: { enabled: $('#au-fu').checked },
        ratings: { enabled: $('#au-rt').checked },
        summary: { enabled: $('#au-sm').checked, hour: Number($('#au-hour').value) },
        payments: { provider: $('#py-prov').value, currency: $('#py-cur').value, stripeSecretKey: $('#py-sk').value, stripeWebhookSecret: $('#py-wh').value, paymobSecretKey: $('#pm-sk').value, paymobPublicKey: $('#pm-pk').value, paymobIntegrationIds: $('#pm-ids').value },
      } };
      try { await api('/api/settings', { method: 'PUT', body }); toast(t('saved')); setTimeout(() => pageChannels(main), 600); } catch (err) { toast(err.message); }
    };
    $('#testNotify').onclick = async (ev) => {
      try { await $('#saveCh').onclick(); await api('/api/notify/test', { method: 'POST', body: {} }); alertOwner(t('sent'), '#channels'); } catch (err) { toast(err.message); }
    };
    if ($('#unlinkBtn')) $('#unlinkBtn').onclick = async () => { await api('/api/notify/unlink', { method: 'POST', body: {} }); pageChannels(main); };
    if ($('#browserNotify')) $('#browserNotify').onclick = async () => { try { await Notification.requestPermission(); } catch { /* ignore */ } pageChannels(main); };
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
          <label class="switch" id="visionField"><input type="checkbox" id="ai-vision" ${ai.vision ? 'checked' : ''}>${t('vision')}</label>
          <hr style="border:0;border-top:1px solid var(--line);width:100%;margin:4px 0">
          <div><h2>${t('voiceTitle')}</h2><p class="muted small">${t('voiceLead')}</p><p class="muted small mono">${esc(t('voiceHint'))}</p></div>
          <div class="grid2"><label class="field" for="tr-base">${t('baseUrl')}<input type="text" id="tr-base" class="ltr" value="${esc(s.transcription.baseUrl)}" placeholder="https://api.groq.com/openai/v1"></label>
            <label class="field" for="tr-model">${t('model')}<input type="text" id="tr-model" class="ltr" value="${esc(s.transcription.model)}" placeholder="whisper-large-v3-turbo"></label></div>
          <label class="field" for="tr-key">${t('apiKey')}<input type="text" id="tr-key" class="ltr" value="${esc(s.transcription.apiKey)}" autocomplete="off" spellcheck="false"></label>
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
      $('#visionField').style.display = isClaude ? 'none' : '';
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
        vision: isClaude ? true : $('#ai-vision').checked,
      }, transcription: { baseUrl: $('#tr-base').value, model: $('#tr-model').value, apiKey: $('#tr-key').value } } };
      try { await api('/api/settings', { method: 'PUT', body }); toast(t('saved')); } catch (err) { toast(err.message); }
    };

    // playground: reuse the test conversation stored on the server
    const msgs = $('#playMsgs');
    const add = (cls, text) => { const d = document.createElement('div'); d.className = 'msg ' + cls; d.textContent = text; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; };
    try {
      const { conversation } = await api('/api/conversations/' + encodeURIComponent('test:owner'));
      conversation.messages.forEach((m) => { const d = add(m.role === 'customer' ? 'customer' : 'bot', ''); d.innerHTML = msgBody(m); });
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
        for (const img of out.images || []) { const d = add('bot', ''); d.innerHTML = `<img class="att" src="${esc(img.url.slice(BASE.length).replace(/^\//, ''))}" alt="${esc(img.name)}">`; }
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
      ${state.session.role === 'agent' ? '' : `<section class="card" id="team"></section>`}
      <p class="muted small">Wakeel · ${t('version')} ${esc(state.session.version)} · MIT</p>
    </div>`;
    if ($('#team')) renderTeam($('#team'));
    $('#pwForm').onsubmit = async (e) => {
      e.preventDefault();
      try { await api('/api/me/password', { method: 'POST', body: { current: $('#pw-cur').value, next: $('#pw-new').value } }); toast(t('saved')); $('#pwForm').reset(); $('#pwErr').textContent = ''; }
      catch (err) { $('#pwErr').textContent = err.message; }
    };
  }

  async function renderTeam(box) {
    const { users } = await api('/api/users');
    box.innerHTML = `<div><h2>${t('teamTitle')}</h2><p class="muted small">${t('teamLead')}</p></div>
      ${users.length ? `<div class="stack">${users.map((u) => `<div class="row"><b>${esc(u.name)}</b><span class="mono small muted">${esc(u.username)}</span><span class="spacer"></span><button class="btn sm danger" data-rm="${esc(u.id)}" type="button">${t('remove')}</button></div>`).join('')}</div>` : `<p class="muted">${t('noTeam')}</p>`}
      <form class="grid4" id="teamForm" style="align-items:end">
        <label class="field" for="tm-name">${t('name')}<input type="text" id="tm-name"></label>
        <label class="field" for="tm-user">${t('username')}<input type="text" id="tm-user" class="ltr" autocomplete="off"></label>
        <label class="field" for="tm-pw">${t('password')}<input type="text" id="tm-pw" class="ltr" autocomplete="off"></label>
        <button class="btn primary" type="submit">${t('addMember')}</button>
      </form><div class="err" id="tmErr"></div>`;
    $('#teamForm').onsubmit = async (e) => {
      e.preventDefault();
      try { await api('/api/users', { method: 'POST', body: { name: $('#tm-name').value, username: $('#tm-user').value, password: $('#tm-pw').value } }); renderTeam(box); }
      catch (err) { $('#tmErr').textContent = err.message; }
    };
    $$('[data-rm]', box).forEach((b) => (b.onclick = async () => { await api('/api/users/' + b.dataset.rm, { method: 'DELETE', body: {} }); renderTeam(box); }));
  }

  boot();
})();
