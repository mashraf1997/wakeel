/* Wakeel agency console: one server, many businesses. */
(function () {
  'use strict';
  const STR = {
    ar: {
      title: 'لوحة الوكالة', lead: 'كل عملاءك على سيرفر واحد. كل بيزنس ليه لوحة تحكم وقنوات وبيانات منفصلة.', login: 'دخول', password: 'كلمة سر الوكالة',
      add: 'إضافة بيزنس', name: 'اسم البيزنس', slug: 'اسم الرابط', slugHint: 'حروف إنجليزي صغيرة وأرقام وشرطة، مثلاً nile-pizza', clientPw: 'كلمة سر لصاحب البيزنس', clientPwHint: 'اختياري، 8 حروف على الأقل. لو سبتها فاضية صاحب البيزنس هيعملها أول ما يفتح.', type: 'نوع البيزنس', none: 'بدون قالب',
      tpl_restaurant: 'مطعم أو كافيه', tpl_clinic: 'عيادة', tpl_salon: 'صالون أو سبا', tpl_store: 'متجر أونلاين', create: 'إنشاء',
      main: 'البيزنس الرئيسي', open: 'افتح لوحة التحكم', archive: 'أرشفة', archiveQ: 'هيقف تشغيل البيزنس ده، والبيانات هتفضل محفوظة على السيرفر. تكمّل؟',
      convs: 'محادثات', pending: 'طلبات مستنية', attention: 'محتاجة تدخل', msgs: 'رسائل آخر 7 أيام', notSetUp: 'لسه ماتظبطش', logout: 'خروج', lang: 'English', empty: 'مفيش قنوات متوصلة',
    },
    en: {
      title: 'Agency console', lead: 'All your clients on one server. Each business has its own dashboard, channels and data.', login: 'Sign in', password: 'Agency password',
      add: 'Add a business', name: 'Business name', slug: 'Link name', slugHint: 'lowercase letters, digits and dashes, e.g. nile-pizza', clientPw: 'Password for the owner', clientPwHint: 'Optional, 8+ characters. Leave empty and the owner sets it on first visit.', type: 'Business type', none: 'No template',
      tpl_restaurant: 'Restaurant or café', tpl_clinic: 'Clinic', tpl_salon: 'Salon or spa', tpl_store: 'Online store', create: 'Create',
      main: 'Main business', open: 'Open dashboard', archive: 'Archive', archiveQ: 'This stops serving the business. Its data stays on the server. Continue?',
      convs: 'conversations', pending: 'pending requests', attention: 'need attention', msgs: 'messages, last 7 days', notSetUp: 'Not set up yet', logout: 'Sign out', lang: 'العربية', empty: 'No channels connected',
    },
  };
  let lang = (() => { try { return localStorage.getItem('wk_lang') || 'ar'; } catch { return 'ar'; } })();
  const t = (k) => STR[lang][k] ?? k;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const app = $('#app');
  const toast = (m) => { const el = $('#toast'); el.textContent = m; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); };

  async function api(path, opts = {}) {
    const res = await fetch(path, { method: opts.method || 'GET', headers: opts.body ? { 'content-type': 'application/json' } : {}, body: opts.body ? JSON.stringify(opts.body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(data.error || `HTTP ${res.status}`); e.status = res.status; throw e; }
    return data;
  }

  function setLang() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }

  async function boot() {
    setLang();
    try { render((await api('/api/agency/tenants')).tenants); }
    catch (e) { if (e.status === 401) renderLogin(); else app.innerHTML = `<div class="auth"><p>${esc(e.message)}</p></div>`; }
  }

  function renderLogin() {
    app.innerHTML = `<div class="auth"><form class="card" id="f"><div class="brand"><img src="/favicon.svg" alt="">Wakeel</div><h1>${t('title')}</h1>
      <label class="field" for="pw">${t('password')}<input type="password" id="pw" autocomplete="current-password"></label><div class="err" id="err"></div>
      <div class="row"><button class="btn primary" type="submit">${t('login')}</button></div></form></div>`;
    $('#f').onsubmit = async (e) => { e.preventDefault(); try { await api('/api/agency/login', { method: 'POST', body: { password: $('#pw').value } }); boot(); } catch (err) { $('#err').textContent = err.message; } };
    $('#pw').focus();
  }

  function render(list) {
    app.innerHTML = `<div class="page">
      <div class="page-head"><div class="row"><img src="/favicon.svg" alt="" width="34"><div><h1>${t('title')}</h1><p>${t('lead')}</p></div></div>
        <div class="row"><button class="btn sm" id="langBtn" type="button">${t('lang')}</button><button class="btn sm" id="out" type="button">${t('logout')}</button></div></div>
      <div class="grid2">${list.map((x) => `<section class="card">
        <div class="card-head"><div><h2>${esc(x.name || x.slug || t('main'))}</h2><span class="muted small mono">${esc(location.origin + x.path)}</span></div>
          ${x.needsAttention || x.pendingRequests ? `<span class="pill warn">${x.pendingRequests + x.needsAttention}</span>` : ''}</div>
        ${x.setUp ? '' : `<span class="pill off">${t('notSetUp')}</span>`}
        <div class="grid2 small"><span><b>${x.messages7d}</b> ${t('msgs')}</span><span><b>${x.conversations}</b> ${t('convs')}</span><span><b>${x.pendingRequests}</b> ${t('pending')}</span><span><b>${x.needsAttention}</b> ${t('attention')}</span></div>
        <div class="row small">${x.channels.length ? x.channels.map((c) => `<span class="ch ${c}">${{ whatsapp: 'WA', instagram: 'IG', messenger: 'FB', telegram: 'TG' }[c]}</span>`).join('') : `<span class="muted">${t('empty')}</span>`}</div>
        <div class="row"><a class="btn primary" href="${esc(x.path)}" target="_blank" rel="noopener">${t('open')}</a>${x.slug ? `<button class="btn danger" data-arch="${esc(x.slug)}" type="button">${t('archive')}</button>` : ''}</div>
      </section>`).join('')}</div>
      <form class="card" id="add" style="max-width:640px">
        <h2>${t('add')}</h2>
        <div class="grid2"><label class="field" for="a-name">${t('name')}<input type="text" id="a-name"></label>
          <label class="field" for="a-slug">${t('slug')} <span class="hint">${t('slugHint')}</span><input type="text" id="a-slug" class="ltr" pattern="[a-z0-9-]+"></label></div>
        <div class="grid2"><label class="field" for="a-tpl">${t('type')}<select id="a-tpl"><option value="">${t('none')}</option>${['restaurant', 'clinic', 'salon', 'store'].map((k) => `<option value="${k}">${t('tpl_' + k)}</option>`).join('')}</select></label>
          <label class="field" for="a-pw">${t('clientPw')} <span class="hint">${t('clientPwHint')}</span><input type="text" id="a-pw" class="ltr" autocomplete="off"></label></div>
        <div class="err" id="a-err"></div>
        <div class="row"><button class="btn primary" type="submit">${t('create')}</button></div>
      </form>
    </div>`;
    $('#langBtn').onclick = () => { lang = lang === 'ar' ? 'en' : 'ar'; try { localStorage.setItem('wk_lang', lang); } catch { /* ignore */ } boot(); };
    $('#out').onclick = async () => { await api('/api/agency/logout', { method: 'POST', body: {} }); boot(); };
    $('#a-name').oninput = () => {
      if (!$('#a-slug').dataset.touched) $('#a-slug').value = $('#a-name').value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    };
    $('#a-slug').oninput = () => { $('#a-slug').dataset.touched = '1'; };
    $('#add').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await api('/api/agency/tenants', { method: 'POST', body: { name: $('#a-name').value, slug: $('#a-slug').value, template: $('#a-tpl').value, password: $('#a-pw').value, lang } });
        boot();
      } catch (err) { $('#a-err').textContent = err.message; }
    };
    document.querySelectorAll('[data-arch]').forEach((b) => (b.onclick = async () => {
      {
        const d = document.createElement('dialog');
        d.innerHTML = `<form method="dialog" class="stack"><p>${esc(t('archiveQ'))}</p><div class="row"><button class="btn danger" value="yes">${t('archive')}</button><button class="btn" value="no">✕</button></div></form>`;
        d.style.cssText = 'border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--ink);padding:20px';
        document.body.appendChild(d);
        d.addEventListener('close', async () => { if (d.returnValue === 'yes') { await api('/api/agency/tenants/' + b.dataset.arch, { method: 'DELETE', body: {} }); boot(); } d.remove(); });
        d.showModal();
      }
    }));
  }

  boot();
})();
