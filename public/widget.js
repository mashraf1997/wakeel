/* Wakeel website chat widget. Embed with:
   <script src="https://YOUR-WAKEEL-DOMAIN/widget.js" async></script> */
(function () {
  'use strict';
  if (window.__wakeelLoaded) return;
  window.__wakeelLoaded = true;

  var script = document.currentScript || document.querySelector('script[src*="widget.js"]');
  var BASE = script.src.replace(/\/widget\.js(\?.*)?$/, ''); // includes /b/<slug> in agency mode
  var KEY = 'wakeel_visitor';
  var visitor;
  try { visitor = localStorage.getItem(KEY); } catch (e) { /* storage blocked */ }
  if (!visitor) {
    visitor = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(16).slice(2, 10));
    try { localStorage.setItem(KEY, visitor); } catch (e) { /* ignore */ }
  }

  var host = document.createElement('div');
  // Right-to-left sites (Arabic, Hebrew...) get the bubble on the left, where readers expect it.
  var rtl = (document.documentElement.dir || document.body.dir || '').toLowerCase() === 'rtl';
  host.style.cssText = 'position:fixed;z-index:2147483000;bottom:20px;' + (rtl ? 'left:20px;' : 'right:20px;');
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: 'open' });

  var css = [
    ':host{all:initial}',
    '*{box-sizing:border-box;font-family:"Segoe UI","Noto Sans Arabic",Tahoma,system-ui,sans-serif}',
    '.fab{width:58px;height:58px;border-radius:50%;border:0;cursor:pointer;background:var(--c);color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.22);display:grid;place-items:center}',
    '.fab:focus-visible,button:focus-visible{outline:3px solid #fff;outline-offset:2px}',
    '.panel{position:absolute;bottom:72px;' + (rtl ? 'left:0;' : 'right:0;') + 'width:min(370px,calc(100vw - 32px));height:min(540px,calc(100vh - 110px));background:#fff;color:#14211E;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden}',
    '.panel.open{display:flex}',
    '.head{background:var(--c);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px;font-weight:700;font-size:15px}',
    '.head span{flex:1}',
    '.x{background:none;border:0;color:#fff;font-size:22px;cursor:pointer;line-height:1}',
    '.msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;background:#F4F6F5}',
    '.m{max-width:82%;padding:8px 12px;border-radius:14px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word}',
    '.them{align-self:flex-start;background:#fff;border:1px solid #DCE3E1}',
    '.me{align-self:flex-end;background:var(--c);color:#fff}',
    '.typing{opacity:.6}',
    '.m img{display:block;max-width:100%;border-radius:10px}',
    'form{display:flex;gap:8px;padding:10px;border-top:1px solid #DCE3E1;background:#fff}',
    'textarea{flex:1;resize:none;border:1px solid #DCE3E1;border-radius:10px;padding:9px 11px;font-size:14px;height:42px;max-height:110px;color:#14211E;background:#fff}',
    'textarea:focus{outline:none;border-color:var(--c)}',
    '.send{border:0;border-radius:10px;background:var(--c);color:#fff;padding:0 14px;cursor:pointer;font-weight:700;font-size:14px}',
    '.send[disabled]{opacity:.5}',
    '.foot{font-size:11px;text-align:center;color:#8A9894;padding:0 0 6px;background:#fff}',
  ].join('');

  root.innerHTML =
    '<style>' + css + '</style>' +
    '<div class="panel" role="dialog" aria-label="Chat">' +
    '<div class="head"><span id="title">Chat</span><button class="x" type="button" aria-label="Close">×</button></div>' +
    '<div class="msgs" id="msgs" aria-live="polite"></div>' +
    '<form id="f"><textarea id="t" dir="auto" rows="1" aria-label="Message"></textarea><button class="send" type="submit">➤</button></form>' +
    '<div class="foot">Wakeel</div>' +
    '</div>' +
    '<button class="fab" type="button" aria-label="Open chat"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg></button>';

  var panel = root.querySelector('.panel');
  var msgs = root.getElementById('msgs');
  var box = root.getElementById('t');
  var sendBtn = root.querySelector('.send');
  var greeting = '';
  var lastCount = -1;
  var pollTimer = null;
  var busy = false;

  host.style.setProperty('--c', '#0F766E');

  fetch(BASE + '/api/widget/config').then(function (r) { return r.json(); }).then(function (cfg) {
    root.getElementById('title').textContent = cfg.title || 'Chat';
    greeting = cfg.greeting || '';
    if (cfg.color) host.style.setProperty('--c', cfg.color);
  }).catch(function () {});

  function bubble(cls, text, image) {
    var d = document.createElement('div');
    d.className = 'm ' + cls;
    d.dir = 'auto';
    if (image) {
      var img = document.createElement('img');
      img.src = /^https?:/.test(image) ? image : new URL(BASE).origin + image;
      img.alt = '';
      img.onload = function () { msgs.scrollTop = msgs.scrollHeight; };
      d.appendChild(img);
    } else {
      d.textContent = text;
    }
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  function load() {
    return fetch(BASE + '/api/widget/messages?visitor=' + encodeURIComponent(visitor))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var list = data.messages || [];
        if (busy || list.length === lastCount) return;
        lastCount = list.length;
        msgs.innerHTML = '';
        if (greeting) bubble('them', greeting);
        list.forEach(function (m) { bubble(m.from, m.text, m.image); });
      }).catch(function () {});
  }

  function toggle(open) {
    panel.classList.toggle('open', open);
    clearInterval(pollTimer);
    if (open) {
      if (lastCount === -1 && greeting) bubble('them', greeting);
      load();
      pollTimer = setInterval(load, 4000);
      setTimeout(function () { box.focus(); }, 50);
    }
  }

  root.querySelector('.fab').onclick = function () { toggle(!panel.classList.contains('open')); };
  root.querySelector('.x').onclick = function () { toggle(false); };

  box.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); root.getElementById('f').requestSubmit(); }
  });

  root.getElementById('f').addEventListener('submit', function (e) {
    e.preventDefault();
    var text = box.value.trim();
    if (!text || busy) return;
    busy = true;
    sendBtn.disabled = true;
    box.value = '';
    bubble('me', text);
    var typing = bubble('them typing', '…');
    fetch(BASE + '/api/widget/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ visitor: visitor, text: text }),
    }).then(function (r) { return r.json(); }).then(function (data) {
      typing.remove();
      (data.images || []).forEach(function (img) { bubble('them', '', img.url); });
      if (data.reply) bubble('them', data.reply);
      else if (data.error) bubble('them', data.error);
    }).catch(function () {
      typing.textContent = '⚠︎';
    }).then(function () {
      busy = false;
      sendBtn.disabled = false;
      lastCount = -2; // force refresh on next poll
      load();
    });
  });
})();
