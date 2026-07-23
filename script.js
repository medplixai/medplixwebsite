// ===== Analytics bootstrap: dataLayer + first-touch attribution =====
window.dataLayer = window.dataLayer || [];
function mpxTrack(event, data) { try { window.dataLayer.push(Object.assign({ event: event }, data || {})); } catch (e) {} }
(function captureAttribution() {
  try {
    if (sessionStorage.getItem('mpx_attr')) return;
    var p = new URLSearchParams(location.search), keep = {};
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid'].forEach(function (k) {
      var v = p.get(k); if (v) keep[k] = v.slice(0, 120);
    });
    if (document.referrer) keep.ref = document.referrer.slice(0, 200);
    sessionStorage.setItem('mpx_attr', JSON.stringify(keep));
  } catch (e) {}
})();
function withAttribution(url) {
  try {
    var a = JSON.parse(sessionStorage.getItem('mpx_attr') || '{}');
    var qs = Object.keys(a).filter(function (k) { return k !== 'ref'; })
      .map(function (k) { return k + '=' + encodeURIComponent(a[k]); }).join('&');
    return qs ? url + (url.indexOf('?') > -1 ? '&' : '?') + qs : url;
  } catch (e) { return url; }
}

// ===== Mobile nav toggle =====
const hamburger = document.getElementById('hamburger');
const nav = document.getElementById('nav');
hamburger?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', String(open));
  hamburger.textContent = open ? '✕' : '☰';
});

// ===== Products mega-menu (click on touch / mobile; hover via CSS on desktop) =====
document.querySelectorAll('.nav-item.has-menu > .nav-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const item = btn.parentElement;
    const open = item.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav-item.has-menu')) {
    document.querySelectorAll('.nav-item.has-menu').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.nav-btn')?.setAttribute('aria-expanded', 'false');
    });
  }
});

// ===== Close mobile drawer after clicking a link =====
document.querySelectorAll('.nav a').forEach(a =>
  a.addEventListener('click', () => {
    nav.classList.remove('open');
    // close any open mega menu (desktop + mobile) so the click navigates cleanly
    document.querySelectorAll('.nav-item.has-menu').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.nav-btn')?.setAttribute('aria-expanded', 'false');
    });
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (hamburger) { hamburger.setAttribute('aria-expanded', 'false'); hamburger.textContent = '☰'; }
  })
);

// On desktop the mega opens on hover; after clicking a product, briefly suppress
// the hover so the menu dismisses and you actually see the section you jumped to.
document.querySelectorAll('.mega-products .mega-card, .mega-bazaar a').forEach(a =>
  a.addEventListener('click', () => {
    var menu = a.closest('.nav-item.has-menu');
    if (!menu) return;
    menu.classList.add('suppress-hover');
    setTimeout(function(){ menu.classList.remove('suppress-hover'); }, 600);
  })
);

// ===== Header shadow on scroll =====
const header = document.getElementById('header');
const setHeaderState = () => {
  header.style.boxShadow = window.scrollY > 8 ? '0 6px 24px -16px rgba(15,44,77,.35)' : 'none';
  header.classList.toggle('scrolled', window.scrollY > 40);
};
window.addEventListener('scroll', setHeaderState, { passive: true });
setHeaderState();

// ===== Lead form: AJAX submit to Web3Forms (leads emailed to you) =====
const form = document.getElementById('leadForm');
const note = document.getElementById('formNote');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;

  const btn = form.querySelector('button[type="submit"]');
  const original = btn.innerHTML;
  const key = form.querySelector('input[name="access_key"]').value;
  note?.classList.remove('error');

  // If the access key isn't configured yet, show a graceful local success
  // so the form is never "broken" on the live site. Replace the key in index.html to go live.
  if (!key || key === 'YOUR_WEB3FORMS_ACCESS_KEY') {
    showSuccess();
    return;
  }

  btn.disabled = true;
  btn.innerHTML = 'Sending…';
  try {
    const res = await fetch(form.action, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new FormData(form)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showSuccess();
    } else {
      throw new Error(data.message || 'Submission failed');
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = original;
    if (note) {
      note.textContent = 'Something went wrong. Please call us at 95158 31777 or try again.';
      note.classList.add('error');
    }
  }
});

function showSuccess() {
  form.innerHTML =
    '<div class="form-success">' +
      '<div class="fs-ico">✅</div>' +
      '<h3>Thank you!</h3>' +
      '<p>Your demo request is in. Our team will reach out within 24 hours.</p>' +
      '<p style="margin-top:10px"><a class="cta-call" href="https://wa.me/919515831777?text=Hi%20Medplix%2C%20I%20want%20a%20free%20demo%20for%20my%20facility." target="_blank" rel="noopener" style="color:#0d8a78;font-weight:700">Or message us on WhatsApp →</a></p>' +
    '</div>';
}

// ===== Animated typed keyword in hero headline (eka.care style) =====
(function(){
  var el = document.getElementById('typeWord');
  if (!el) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var words = ['Hospitals', 'Clinics', 'Labs', 'Pharmacies', 'Diagnostics'];
  var w = 0, i = 0, deleting = false;
  function tick(){
    var word = words[w];
    el.textContent = word.slice(0, i);
    if (!deleting && i < word.length) { i++; setTimeout(tick, 70); }
    else if (!deleting && i === word.length) { deleting = true; setTimeout(tick, 1600); }
    else if (deleting && i > 0) { i--; setTimeout(tick, 38); }
    else { deleting = false; w = (w + 1) % words.length; setTimeout(tick, 280); }
  }
  el.textContent = '';
  setTimeout(tick, 900);
})();

// ===== Product gallery tabs =====
(function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.gtab'));
  function activate(tab, focus) {
    var key = tab.getAttribute('data-shot');
    tabs.forEach(function (t) {
      var on = (t === tab);
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    document.querySelectorAll('.shot').forEach(function (s) { s.classList.toggle('active', s.getAttribute('data-shot') === key); });
    if (focus) tab.focus();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { activate(tab, false); });
    tab.addEventListener('keydown', function (e) {
      var dir = (e.key === 'ArrowRight') ? 1 : (e.key === 'ArrowLeft') ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      activate(tabs[(i + dir + tabs.length) % tabs.length], true);
    });
  });
})();

// ===== Scroll reveal (fade-up on enter) =====
(function () {
  var sel = '.sec-head, .eco-card, .app-card, .price-card, .feature-block, .owner-copy, .owner-orbit, ' +
            '.chat-card, .ac-feature, .band-item, .addon, .bazaar-pill, .faq, .gallery, .cta-form, .cta-copy';
  var els = Array.prototype.slice.call(document.querySelectorAll(sel));
  // also pick up every element that carries .reveal directly in the markup
  Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (el) {
    if (els.indexOf(el) === -1) els.push(el);
  });
  if (!('IntersectionObserver' in window) || !els.length) {
    els.forEach(function (el) { el.classList.add('reveal', 'in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  els.forEach(function (el) {
    if (el.classList.contains('reveal') && el.classList.contains('in')) return;
    el.classList.add('reveal');
    // light stagger by position among siblings
    var idx = Array.prototype.indexOf.call(el.parentNode.children, el);
    el.style.transitionDelay = Math.min(idx, 6) * 60 + 'ms';
    // already in view on load → show immediately (no flash, same tick)
    if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in');
    else io.observe(el);
  });
})();

// ===== Welcome / role-picker modal =====
(function () {
  var modal = document.getElementById('roleModal');
  if (!modal) return;
  var dialog = modal.querySelector('.role-dialog');
  var header = document.getElementById('header');
  var main = document.getElementById('main');
  var SKEY = 'medplix_role_v1';   // suppression flag (per tab session)
  var RKEY = 'medplix_role';      // last chosen role
  var DKEY = 'medplix_demo_v1';   // demo-popup (50s) suppression flag (per tab session)
  var ROLES = {
    // selecting a product takes the visitor to its dedicated detail page
    hospital: { page: 'product-hms.html',      biz: 'Hospital' },               // Medplix HMS
    clinic:   { page: 'product-clinic.html',   biz: 'Clinic' },                 // Medplix Clinic
    lab:      { page: 'product-labs.html',     biz: 'Laboratory / Diagnostics' }, // Medplix Labs
    pharmacy: { page: 'product-pharmacy.html', biz: 'Pharmacy' }                // Medplix Pharmacy
  };
  var lastFocused = null, isClosing = false, openTimer = null, demoTimer = null, fallbackSeen = false, fallbackDemoSeen = false, storageOK = true;

  function safeGet(k){ try { return sessionStorage.getItem(k); } catch (e) { storageOK = false; return null; } }
  function safeSet(k, v){ try { sessionStorage.setItem(k, v); } catch (e) { storageOK = false; } }
  function seen(){ return fallbackSeen || (storageOK && !!safeGet(SKEY)); }
  function storedRole(){ try { var v = JSON.parse(safeGet(SKEY) || 'null'); return v && v.role; } catch (e) { return null; } }
  function markSeen(role){ fallbackSeen = true; safeSet(SKEY, JSON.stringify({ role: role || null, ts: Date.now() })); }
  function seenDemo(){ return fallbackDemoSeen || (storageOK && !!safeGet(DKEY)); }
  function markSeenDemo(){ fallbackDemoSeen = true; safeSet(DKEY, '1'); }
  function validRole(r){ return !!r && Object.prototype.hasOwnProperty.call(ROLES, r); }

  function tabbables(){
    return Array.prototype.slice.call(dialog.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'))
      .filter(function (el) { return el.offsetParent !== null; });
  }
  function lockScroll(){
    var root = document.documentElement;
    root._pr = root.style.paddingRight; root._ov = root.style.overflow;
    var sw = window.innerWidth - root.clientWidth;
    if (sw > 0) root.style.paddingRight = sw + 'px';
    root.classList.add('role-lock');
  }
  function unlockScroll(){
    var root = document.documentElement;
    root.classList.remove('role-lock');
    root.style.paddingRight = root._pr || '';
    root.style.overflow = root._ov || '';
  }
  function setInert(on){
    [header, main].forEach(function (el) {
      if (!el) return;
      if (on) { el.setAttribute('aria-hidden', 'true'); try { el.inert = true; } catch (e) {} }
      else { el.removeAttribute('aria-hidden'); try { el.inert = false; } catch (e) {} }
    });
  }

  function openModal(force){
    if (!force && seen()) return;
    if (!modal.hasAttribute('hidden') && modal.classList.contains('open')) return;
    lastFocused = document.activeElement;
    lockScroll();
    modal.removeAttribute('hidden');
    dialog.classList.remove('lead-mode'); dialog.setAttribute('aria-labelledby', 'roleModalTitle');    // always open on the chooser view
    var _lf = modal.querySelector('.role-lead-iframe'); if (_lf) _lf.src = 'about:blank';
    void dialog.offsetWidth;                 // reflow so the entrance transition runs (skipped under reduced-motion)
    modal.classList.add('open');
    setInert(true);
    var first = dialog.querySelector('.role-tile');
    if (first) first.focus({ preventScroll: true });
    markSeen(storedRole());                  // auto-open counts as "seen"
  }
  function closeModal(){
    if (isClosing || modal.hasAttribute('hidden')) return;
    isClosing = true;
    try {
      modal.classList.remove('open');
      setInert(false);
      unlockScroll();
      var f = (lastFocused && lastFocused.focus) ? lastFocused : document.body;
      try { f.focus({ preventScroll: true }); } catch (e) {}
      markSeen(storedRole());
      markSeenDemo();                          // explicit dismissal = opt-out of the 50s demo popup too
      if (demoTimer) { clearTimeout(demoTimer); demoTimer = null; }
    } finally {
      setTimeout(function () { modal.setAttribute('hidden', ''); isClosing = false; }, 220);
    }
  }
  function preselect(biz){
    var sel = document.querySelector('select[name="business_type"]');
    if (!sel) return;
    sel.value = biz;
    if (sel.value !== biz) return;           // option string didn't match — bail, leave placeholder
    sel.dispatchEvent(new Event('input', { bubbles: true }));
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function route(role){
    var r = ROLES[role];
    if (!r) return;
    safeSet(RKEY, role);                     // remember choice
    markSeen(role);                          // don't re-pop on return
    if (window.dataLayer) { try { window.dataLayer.push({ event: 'role_select', role: role }); } catch (e) {} }
    window.location.href = r.page;           // go to the product detail page (used by ?role= deep-link)
  }
  // Show the CRM demo/lead form inside the popup for the chosen role → lead goes to the CRM
  function showLead(role, srcTag, note){
    var r = ROLES[role];
    if (!r) return;
    safeSet(RKEY, role);
    markSeen(role);                          // don't re-pop on return
    if (window.dataLayer) { try { window.dataLayer.push({ event: 'role_select', role: role, mode: 'popup_lead' }); } catch (e) {} }
    var frame = modal.querySelector('.role-lead-iframe');
    if (frame) { frame.src = withAttribution('https://crm.medplix.ai/?lead&role=' + encodeURIComponent(role) + '&src=' + (srcTag || 'popup') + (note ? '&note=' + encodeURIComponent(String(note).slice(0, 120)) : '')); if (window.mpxWatchCrmIframe) window.mpxWatchCrmIframe(frame); }
    var rt = modal.querySelector('[data-lead-role]'); if (rt) rt.textContent = r.biz;
    var ex = modal.querySelector('[data-lead-explore]'); if (ex) ex.setAttribute('href', r.page);
    var wl = modal.querySelector('.role-lead-call a[href^="https://wa.me"]');
    if (wl) wl.href = 'https://wa.me/919515831777?text=' + encodeURIComponent('Hi Medplix, I run a ' + r.biz + ' and want a free demo.');
    dialog.classList.remove('quiz-mode');
    dialog.classList.add('lead-mode'); dialog.setAttribute('aria-labelledby', 'roleLeadTitle');
    var back = modal.querySelector('[data-role-back]'); if (back) { try { back.focus(); } catch (e) {} }
  }

  // Demo lead-capture popup (fires ~50s after load): open the modal straight to the CRM demo form
  function openDemo(){
    if (seenDemo() || storedRole()) return;                 // skip if already shown, or a role was already chosen
    if (modal.classList.contains('open')) return;           // don't interrupt an already-open modal
    var ae = document.activeElement;                        // typing in the CRM iframe (demo/support form)? don't yank it away
    if (ae && ae.tagName === 'IFRAME') return;
    var chat = document.getElementById('chatWin');          // chatting with the AI assistant? don't interrupt
    if (chat && !chat.hidden) return;
    markSeenDemo();
    openModal(true);                                        // force-open (bypasses the role-picker 'seen')
    var frame = modal.querySelector('.role-lead-iframe');
    if (frame) { frame.src = withAttribution('https://crm.medplix.ai/?lead&src=popup-50s'); if (window.mpxWatchCrmIframe) window.mpxWatchCrmIframe(frame); }
    var rt = modal.querySelector('[data-lead-role]'); if (rt) rt.textContent = 'free';
    var onHome = /(^|\/)(index\.html)?$/.test(location.pathname);
    var ex = modal.querySelector('[data-lead-explore]'); if (ex) ex.setAttribute('href', (onHome ? '' : 'index.html') + '#products');
    var wl = modal.querySelector('.role-lead-call a[href^="https://wa.me"]');
    if (wl) wl.href = 'https://wa.me/919515831777?text=' + encodeURIComponent('Hi Medplix, I want a free demo for my facility.');
    dialog.classList.add('lead-mode'); dialog.setAttribute('aria-labelledby', 'roleLeadTitle');
    var back = modal.querySelector('[data-role-back]'); if (back) { try { back.focus(); } catch (e) {} }
  }

  // Global hook: the AI agent (chat widget) can open the demo form prefilled
  window.mpxOpenLead = function (role, note) {
    try {
      var r = ROLES[role] ? role : 'clinic';
      openModal(true);
      dialog.classList.remove('quiz-mode');
      showLead(r, 'chat-agent', note || '');
    } catch (e) {}
  };

  // ---- Plan Finder quiz: 2 enum questions → deterministic plan estimate (published prices only) ----
  var PLANS = {
    hospital: { name: 'Medplix HMS — Complete Hospital Suite', base: 1250 },
    clinic:   { name: 'Medplix Clinic', base: 499 },
    lab:      { name: 'Medplix Labs (LIS)', base: 499 },
    pharmacy: { name: 'Medplix Pharmacy', base: 499 }
  };
  var SIZEQ = {
    hospital: { q: 'How big is your hospital?', opts: ['Under 10 beds', '10–50 beds', '50+ beds'] },
    clinic:   { q: 'How many branches do you run?', opts: ['1', '2–3', '4+'] },
    lab:      { q: 'How many branches do you run?', opts: ['1', '2–3', '4+'] },
    pharmacy: { q: 'How many branches do you run?', opts: ['1', '2–3', '4+'] }
  };
  var quizRole = null, quizSize = null;
  var inr = function (n) { return '₹' + n.toLocaleString('en-IN'); };
  function showQuiz(role){
    var r = ROLES[role], p = PLANS[role], sq = SIZEQ[role];
    if (!r || !p) { showLead(role); return; }
    quizRole = role; quizSize = null;
    safeSet(RKEY, role); markSeen(role);
    if (window.dataLayer) { try { window.dataLayer.push({ event: 'role_select', role: role, mode: 'popup_quiz' }); } catch (e) {} }
    var biz = modal.querySelector('[data-quiz-biz]'); if (biz) biz.textContent = r.biz;
    var q1 = modal.querySelector('[data-quiz-q1]'); if (q1) q1.textContent = sq.q;
    var opts1 = modal.querySelector('[data-quiz-opts1]');
    if (opts1) {
      opts1.innerHTML = '';
      sq.opts.forEach(function (label) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'role-quiz-opt'; b.textContent = label;
        b.addEventListener('click', function () {
          quizSize = label;
          modal.querySelector('[data-quiz-step="1"]').hidden = true;
          modal.querySelector('[data-quiz-step="2"]').hidden = false;
        });
        opts1.appendChild(b);
      });
    }
    modal.querySelector('[data-quiz-step="1"]').hidden = false;
    modal.querySelector('[data-quiz-step="2"]').hidden = true;
    modal.querySelector('.role-quiz-result').hidden = true;
    dialog.classList.remove('lead-mode');
    dialog.classList.add('quiz-mode');
  }
  function quizResult(logins){
    var r = ROLES[quizRole], p = PLANS[quizRole];
    if (!r || !p) return;
    var total = p.base + logins * 299;
    var from = logins >= 3;
    var lines = '<div>' + p.name.split(' — ')[0] + ' base — ' + inr(p.base) + '/mo</div>';
    if (logins > 0) lines += '<div>' + (from ? '3+' : '2') + ' extra logins × ₹299 — ' + (from ? 'from ' : '') + inr(logins * 299) + '/mo</div>';
    modal.querySelector('[data-quiz-plan]').textContent = 'Your plan: ' + p.name;
    modal.querySelector('[data-quiz-lines]').innerHTML = lines;
    modal.querySelector('[data-quiz-total]').textContent = '≈ ' + (from ? 'from ' : '') + inr(total) + '/month';
    var waMsg = 'Hi Medplix, I run a ' + (quizSize || '') + ' ' + r.biz.toLowerCase() + (logins ? ' and need ' + (from ? '3+' : '1–2') + ' extra logins' : '') + ' — interested in ' + p.name.split(' — ')[0] + ' (' + inr(total) + '/mo). Please share demo details.';
    var wa = modal.querySelector('[data-quiz-wa]');
    if (wa) wa.href = 'https://wa.me/919515831777?text=' + encodeURIComponent(waMsg);
    modal.querySelector('[data-quiz-step="2"]').hidden = true;
    modal.querySelector('.role-quiz-result').hidden = false;
    markSeenDemo();
    mpxTrack('quiz_complete', { role: quizRole, size: quizSize, logins: logins });
    quizNote = 'Quiz: ' + r.biz + ', ' + (quizSize || '?') + (logins ? ', ' + (from ? '3+' : '1–2') + ' extra logins' : '') + ', est ' + inr(total) + '/mo';
  }
  var quizNote = '';
  dialog.addEventListener('click', function (e) {
    var lg = e.target.closest('[data-logins]');
    if (lg) { quizResult(parseInt(lg.dataset.logins, 10)); return; }
    if (e.target.closest('[data-quiz-trial]')) { dialog.classList.remove('quiz-mode'); showLead(quizRole, 'quiz', quizNote); return; }
    if (e.target.closest('[data-quiz-skip]')) { dialog.classList.remove('quiz-mode'); showLead(quizRole, 'quiz-skip'); return; }
    if (e.target.closest('[data-quiz-back]')) { dialog.classList.remove('quiz-mode'); dialog.setAttribute('aria-labelledby', 'roleModalTitle'); return; }
  });

  // An engaged (hot) AI-chat conversation counts as demo engagement — never fire the timed popup over it
  document.addEventListener('mpx:hot-intent', function () {
    markSeenDemo();
    if (demoTimer) { clearTimeout(demoTimer); demoTimer = null; }
  });

  // wiring — role tiles show the CRM lead form in the popup; back returns to the chooser
  dialog.addEventListener('click', function (e) {
    if (e.target.closest('[data-lead-explore]')) { closeModal(); return; }  // release scroll lock; link then navigates/smooth-scrolls
    var tile = e.target.closest('.role-tile');
    if (tile && tile.dataset.role) { showQuiz(tile.dataset.role); return; }
    if (e.target.closest('[data-role-back]')) {
      dialog.classList.remove('lead-mode'); dialog.setAttribute('aria-labelledby', 'roleModalTitle');
      var f = modal.querySelector('.role-lead-iframe'); if (f) f.src = 'about:blank';
    }
  });
  // close affordances (backdrop closes only on itself)
  modal.querySelectorAll('[data-role-close]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (el.classList.contains('role-backdrop') && e.target !== el) return;
      closeModal();
    });
  });
  // focus trap + Esc
  dialog.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.stopPropagation(); closeModal(); return; }
    if (e.key === 'Tab') {
      var items = tabbables();
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  // manual re-openers (buttons, not .nav a) — close drawer/mega first, then force-open
  document.querySelectorAll('[data-open-rolepicker]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      var nav = document.getElementById('nav');
      if (nav) nav.classList.remove('open');
      document.querySelectorAll('.nav-item.has-menu').forEach(function (i) { i.classList.remove('open'); });
      openModal(true);
    });
  });

  // Engagement suppression — a visitor who clicks any "Book a demo" CTA (or opens
  // the role picker themselves) has already self-selected; cancel the timed popups.
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('a[href*="#demo"], [data-open-rolepicker]') : null;
    if (!el) return;
    markSeen(storedRole());
    markSeenDemo();
    if (openTimer) { clearTimeout(openTimer); openTimer = null; }
    if (demoTimer) { clearTimeout(demoTimer); demoTimer = null; }
  }, true);
  // If the demo form scrolls into view, the visitor found it on their own — no popup needed.
  (function () {
    var demoSec = document.getElementById('demo');
    if (!demoSec || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        markSeenDemo();
        if (demoTimer) { clearTimeout(demoTimer); demoTimer = null; }
        io.disconnect();
      });
    }, { threshold: 0.25 });
    io.observe(demoSec);
  })();

  // init
  function init(){
    var roleParam = null;
    try { roleParam = new URLSearchParams(location.search).get('role'); } catch (e) {}
    if (validRole(roleParam)) { markSeen(roleParam); route(roleParam); return; }   // ?role= deep-link
    if (location.hash && location.hash.length > 1) { markSeen(null); return; }      // any anchor deep-link = intent
    if (!document.documentElement.classList.contains('js')) return;
    // 1) Role-picker welcome popup — at 20s, or once the visitor scrolls ~35% of the page,
    //    whichever comes first (once per tab session). Scroll depth = engaged reader; timer = fallback.
    if (!seen()) {
      var onDepth = function () {
        var doc = document.documentElement;
        var max = doc.scrollHeight - window.innerHeight;
        if (max > 0 && (window.scrollY || doc.scrollTop || 0) / max >= 0.35) openPicker();
      };
      var openPicker = function () {
        if (openTimer) { clearTimeout(openTimer); openTimer = null; }
        window.removeEventListener('scroll', onDepth);
        if (!seen() && !modal.classList.contains('open')) openModal(false);
      };
      window.addEventListener('scroll', onDepth, { passive: true });
      openTimer = setTimeout(openPicker, 20000);
    }
    // 2) Demo lead-capture popup — 75 seconds after load (once per session; skipped if a role was
    //    chosen, the visitor dismissed the first popup, reached the #demo form, or is otherwise engaged)
    if (!seenDemo()) {
      demoTimer = setTimeout(function () { demoTimer = null; openDemo(); }, 75000);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

// ===== AI chat assistant (knowledge-base; upgradeable to a real LLM / Medplix AI Connect) =====
(function () {
  var fab = document.getElementById('chatFab'), win = document.getElementById('chatWin');
  if (!fab || !win) return;
  var body = document.getElementById('chatBody'), quick = document.getElementById('chatQuick');
  var form = document.getElementById('chatForm'), input = document.getElementById('chatText');
  var closeBtn = document.getElementById('chatClose');
  var started = false;

  // Knowledge base: each entry has keywords (k), a reply (r), and follow-up chips.
  var KB = [
    { k: ['hi', 'hello', 'hey', 'hii', 'namaste', 'good morning', 'good evening'], r: "Hi! 👋 I'm the Medplix AI assistant. Ask me about our products, pricing or features — or book a demo.", c: ['Pricing', 'Products', 'Book a demo'] },
    { k: ['what is medplix', 'about medplix', 'what is this', 'what do you do', 'tell me about', 'what is', 'platform', 'overview'], r: "Medplix.AI runs your whole healthcare business — hospital, clinic, lab or pharmacy — on one connected, AI-powered system: OPD, IPD, lab, pharmacy, billing, HR, marketing and an owner dashboard.", c: ['Products', 'Pricing', 'Book a demo'] },
    { k: ['product', 'products', 'software', 'which one', 'options', 'modules'], r: "We have 4 products:<br>• <a href='product-hms.html'>Medplix HMS</a> — full hospital<br>• <a href='product-clinic.html'>Medplix Clinic</a> — clinics<br>• <a href='product-labs.html'>Medplix Labs</a> — labs (LIS)<br>• <a href='product-pharmacy.html'>Medplix Pharmacy</a> — pharmacies", c: ['Pricing', 'Book a demo'] },
    { k: ['price', 'pricing', 'cost', 'how much', 'plan', 'plans', 'rate', 'charges', 'fee', 'rupees', 'monthly'], r: "Simple flat pricing (excl. GST, billed annually):<br>• <b>Clinic / Labs / Pharmacy</b> — ₹499/month<br>• <b>Complete Hospital Suite (HMS)</b> — ₹1,250/month<br>Add-on logins ₹299/mo · AI Connect ₹499/mo. <a href='#pricing'>See all plans →</a>", c: ['Free trial?', 'Book a demo'] },
    { k: ['hms', 'hospital', 'ipd', 'icu', ' ot', 'full hospital', 'multi specialty'], r: "<a href='product-hms.html'>Medplix HMS</a> runs your entire hospital — OPD, IPD, ICU, OT, lab, pharmacy, billing, HR & owner dashboard. <b>₹1,250/month</b>.", c: ['View HMS', 'Book a demo'] },
    { k: ['clinic', 'doctor', 'opd', 'appointment', 'prescription', 'daycare'], r: "<a href='product-clinic.html'>Medplix Clinic</a> — appointments, EMR, e-prescriptions, billing, lab, pharmacy & daycare for paperless clinics. <b>₹499/month</b>.", c: ['View Clinic', 'Book a demo'] },
    { k: ['lab', 'labs', 'lis', 'diagnostic', 'sample', 'report', 'pathology'], r: "<a href='product-labs.html'>Medplix Labs</a> — a complete LIS: lab billing, sample tracking, auto reports, home collection & referrals. <b>₹499/month</b>.", c: ['View Labs', 'Book a demo'] },
    { k: ['pharmacy', 'medicine', 'inventory', 'stock', 'pos', 'batch', 'expiry', 'chemist'], r: "<a href='product-pharmacy.html'>Medplix Pharmacy</a> — POS billing, inventory, batch & expiry tracking, supplier management & GST accounting. <b>₹499/month</b>.", c: ['View Pharmacy', 'Book a demo'] },
    { k: ['feature', 'features', 'what can it do', 'capabilities', 'include', 'functionality'], r: "Medplix covers OPD/IPD/ICU/OT, EMR, lab (LIS), pharmacy POS, billing & GST, HR & payroll, marketing/CRM, an owner dashboard with leakage alerts, and AI Connect.", c: ['Pricing', 'Book a demo'] },
    { k: ['demo', 'trial', 'try', 'free', 'test', 'get started', 'sign up', 'signup', 'start'], r: "You can <b>try free for 1 month</b> — no card required. Want me to set up a free demo? Our team reaches out within 24 hours.", c: ['Book a demo', 'WhatsApp us'] },
    { k: ['ai connect', 'ai ', 'claude', 'chatgpt', 'mcp', 'owner ai', 'connect data'], r: "Medplix AI Connect securely links your data to Claude, ChatGPT or in-app Owner AI (read-only, tenant-isolated) so you can ask 'which branch is in loss?' in plain language. ₹499/mo add-on. <a href='#ai-connect'>Learn more →</a>", c: ['Pricing', 'Book a demo'] },
    { k: ['secure', 'security', 'safe', 'data', 'privacy', 'backup', 'cloud'], r: "Yes — cloud-based with tenant-isolated, owner-only data, role-based access, audit logs and secure backups. AI Connect is read-only. <a href='privacy.html'>Privacy policy →</a>", c: ['Book a demo'] },
    { k: ['contact', 'phone', 'call', 'number', 'email', 'reach', 'talk', 'support', 'whatsapp'], r: "📞 <a href='tel:+919515831777'>95158 31777</a><br>✉️ <a href='mailto:support@medplix.ai'>support@medplix.ai</a><br>Or chat on <a href='https://wa.me/919515831777' target='_blank' rel='noopener'>WhatsApp</a>.", c: ['Book a demo'] },
    { k: ['login', 'logins', 'user', 'users', 'additional', 'seats', 'staff login'], r: "Each plan includes role logins (Doctor, Reception, Pharmacy, Lab, Owner, HR…). Extra Desktop/Mobile logins are <b>₹299/month</b> each.", c: ['Pricing', 'Book a demo'] },
    { k: ['branch', 'branches', 'multi branch', 'multiple', 'chain', 'locations'], r: "Yes — Medplix scales from a single location to multi-branch chains, with centralised owner control and branch-wise reporting.", c: ['Pricing', 'Book a demo'] },
    { k: ['bazaar', 'wholesale', 'procurement', 'purchase', 'supplier'], r: "Medplix Bazaar lets you buy medicines, surgicals, furniture & equipment at the best wholesale price — compared across verified suppliers, right from your dashboard.", c: ['Products', 'Book a demo'] },
    { k: ['gst', 'accounting', 'tax', 'billing'], r: "Yes — billing is fully GST-ready with auto accounting, dues and statutory reports for your CA.", c: ['Pricing', 'Book a demo'] },
    { k: ['thanks', 'thank', 'ok ', 'okay', 'great', 'cool', 'nice', 'good'], r: "You're welcome! 😊 Anything else — pricing, products, or a demo?", c: ['Pricing', 'Book a demo'] }
  ];
  var FALLBACK = "I'm not totally sure about that 🤔 — but our team can help right away. Want a quick demo, or shall I connect you on WhatsApp?";
  var VIEW = { 'view hms': 'product-hms.html', 'view clinic': 'product-clinic.html', 'view labs': 'product-labs.html', 'view pharmacy': 'product-pharmacy.html' };

  function addMsg(html, who) { var d = document.createElement('div'); d.className = 'chat-msg ' + who; d.innerHTML = html; body.appendChild(d); body.scrollTop = body.scrollHeight; return d; }
  function typing() { var t = document.createElement('div'); t.className = 'chat-typing'; t.innerHTML = '<i></i><i></i><i></i>'; body.appendChild(t); body.scrollTop = body.scrollHeight; return t; }
  function setChips(arr) { quick.innerHTML = ''; (arr || []).forEach(function (label) { var b = document.createElement('button'); b.type = 'button'; b.className = 'chat-chip'; b.textContent = label; b.addEventListener('click', function () { send(label); }); quick.appendChild(b); }); }

  // Reply engine — replace getReply() with a fetch() to your LLM / Medplix AI Connect endpoint to go fully AI.
  function getReply(q) {
    var t = ' ' + q.toLowerCase() + ' ', best = null, score = 0;
    KB.forEach(function (e) { var s = 0; e.k.forEach(function (k) { if (t.indexOf(k) > -1) s += k.length; }); if (s > score) { score = s; best = e; } });
    if (best && score > 0) return { r: best.r, c: best.c || ['Pricing', 'Products', 'Book a demo'] };
    return { r: FALLBACK, c: ['Book a demo', 'WhatsApp us'] };
  }
  function botSay(q) {
    var t = typing();
    setTimeout(function () {
      t.remove();
      if (q === '__greet') { addMsg("Hi! 👋 I'm the Medplix AI assistant. Ask me about our products, pricing, features — or book a demo.", 'bot'); setChips(['Pricing', 'Products', 'Is my data secure?', 'Book a demo']); return; }
      var res = getReply(q); addMsg(res.r, 'bot'); setChips(res.c);
    }, 480 + Math.random() * 360);
  }
  // Perform the actions the AI agent asked for (open the demo form, WhatsApp,
  // scroll to a section, confirm a submitted lead). Each is user-visible.
  function runActions(actions) {
    actions.slice(0, 4).forEach(function (a, i) {
      if (!a || !a.type) return;
      setTimeout(function () {
        try {
          if (a.type === 'open_demo_form') {
            addMsg('📋 Opening your demo form…', 'bot');
            mpxTrack('chat_agent_open_demo');
            closeChat();
            if (window.mpxOpenLead) window.mpxOpenLead(a.role, a.note);
            else { document.documentElement.style.scrollBehavior = 'smooth'; location.hash = '#demo'; }
          } else if (a.type === 'open_whatsapp') {
            mpxTrack('chat_agent_whatsapp');
            window.open(a.url, '_blank', 'noopener');
          } else if (a.type === 'go_to_section') {
            var el = document.getElementById(a.section);
            if (el) {
              mpxTrack('chat_agent_navigate', { section: a.section });
              closeChat();
              document.documentElement.style.scrollBehavior = 'smooth';
              el.scrollIntoView({ block: 'start' });
            }
          } else if (a.type === 'lead_submitted') {
            mpxTrack('chat_agent_lead');
            var d = document.createElement('div');
            d.className = 'chat-msg bot chat-cta';
            d.innerHTML = '<a class="chat-wa-btn" target="_blank" rel="noopener" href="' + a.whatsapp_url + '">💬 Confirm on WhatsApp</a>';
            body.appendChild(d); body.scrollTop = body.scrollHeight;
          }
        } catch (e) {}
      }, 400 * i);
    });
  }

  // Real AI replies via /api/chat (Claude, server-side key). Falls back to the
  // local KB bot if the endpoint is unavailable (no key configured, error, timeout).
  var history = [];
  function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>'); }
  function askAI(q) {
    var t = typing();
    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 20000) : null;
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-10) }),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) { if (!r.ok) throw new Error('api ' + r.status); return r.json(); })
      .then(function (data) {
        if (timer) clearTimeout(timer);
        var reply = (data && data.reply) ? String(data.reply) : '';
        if (!reply) throw new Error('empty');
        t.remove();
        history.push({ role: 'assistant', content: reply });
        if (history.length > 12) history = history.slice(-12);
        addMsg(escapeHtml(reply), 'bot');
        mpxTrack('chat_ai_reply');
        if (data.intent === 'hot') {
          // Hot lead: offer a one-tap WhatsApp handoff carrying the AI-composed summary
          var waText = (data.wa && String(data.wa).slice(0, 200)) || 'Hi Medplix, I want a free demo for my facility.';
          var cta = document.createElement('div');
          cta.className = 'chat-msg bot chat-cta';
          cta.innerHTML = '<a class="chat-wa-btn" target="_blank" rel="noopener" href="https://wa.me/919515831777?text=' + encodeURIComponent(waText) + '">💬 Continue on WhatsApp</a>';
          body.appendChild(cta); body.scrollTop = body.scrollHeight;
          setChips(['Book a demo', 'Pricing']);
          mpxTrack('chat_hot_intent');
          try { document.dispatchEvent(new CustomEvent('mpx:hot-intent', { detail: { note: data.note || '' } })); } catch (e) {}
        } else {
          setChips(['Pricing', 'Book a demo', 'WhatsApp us']);
        }
        if (data.actions && data.actions.length) runActions(data.actions);
      })
      .catch(function () {
        if (timer) clearTimeout(timer);
        t.remove();
        var res = getReply(q); addMsg(res.r, 'bot'); setChips(res.c);
      });
  }
  function send(text) {
    text = (text || '').trim(); if (!text) return;
    var low = text.toLowerCase();
    if (VIEW[low]) { addMsg(text, 'user'); window.location.href = VIEW[low]; return; }
    if (low === 'book a demo') { addMsg(text, 'user'); setChips([]); var td = typing(); setTimeout(function () { td.remove(); addMsg("Great! Taking you to the demo form 👇 Fill it in and our team calls within 24 hours.", 'bot'); setTimeout(function () { closeChat(); document.documentElement.style.scrollBehavior = 'smooth'; location.hash = '#demo'; }, 900); }, 480); return; }
    if (low.indexOf('whatsapp') > -1 && low.length < 14) { addMsg(text, 'user'); window.open('https://wa.me/919515831777?text=Hi%20Medplix%2C%20I%20want%20to%20know%20more%20about%20Medplix.AI%20for%20my%20facility.', '_blank', 'noopener'); var tw = typing(); setTimeout(function () { tw.remove(); addMsg("Opening WhatsApp… 💬 You can also call <a href='tel:+919515831777'>95158 31777</a>.", 'bot'); setChips(['Pricing', 'Book a demo']); }, 400); return; }
    addMsg(text, 'user'); setChips([]);
    history.push({ role: 'user', content: text.slice(0, 1200) });
    askAI(text);
  }
  function openChat() { win.hidden = false; document.body.classList.add('chat-open'); fab.setAttribute('aria-expanded', 'true'); if (!started) { started = true; botSay('__greet'); } setTimeout(function () { input.focus(); }, 120); }
  function closeChat() { win.hidden = true; document.body.classList.remove('chat-open'); fab.setAttribute('aria-expanded', 'false'); }

  fab.addEventListener('click', openChat);
  closeBtn.addEventListener('click', closeChat);
  form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); input.value = ''; });
  win.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeChat(); });
})();

// ===== Footer year (keeps copyright current) =====
const yearEl = document.querySelector('.foot-bottom span');
if (yearEl) yearEl.textContent = yearEl.textContent.replace('2026', new Date().getFullYear());

// ===== Launch instrumentation: attribution passthrough, funnel events, CRM iframe watchdog =====
(function () {
  // CRM iframe watchdog: if a form doesn't load within 8s, offer direct contact instead
  function watch(f) {
    if (!f || f._mpxWatched) return; f._mpxWatched = true;
    var done = false;
    f.addEventListener('load', function () { if ((f.getAttribute('src') || '').indexOf('crm.medplix.ai') > -1) done = true; });
    setTimeout(function () {
      if (done || (f.getAttribute('src') || '').indexOf('crm.medplix.ai') === -1) return;
      var fb = document.createElement('div');
      fb.className = 'crm-fallback';
      fb.innerHTML = '<h3>Form is taking a moment to load</h3>' +
        '<p>You can reach us right now instead:</p>' +
        '<div class="crm-fallback-actions">' +
        '<a class="btn btn-primary" href="https://wa.me/919515831777?text=Hi%20Medplix%2C%20I%20want%20a%20free%20demo%20for%20my%20facility." target="_blank" rel="noopener">💬 WhatsApp us</a>' +
        '<a class="btn btn-outline" href="tel:+919515831777">📞 Call 95158 31777</a>' +
        '<a class="btn btn-outline" href="mailto:support@medplix.ai">✉️ Email us</a></div>' +
        '<button type="button" class="crm-retry">Try the form again →</button>';
      f.style.display = 'none';
      f.parentNode.appendChild(fb);
      fb.querySelector('.crm-retry').addEventListener('click', function () {
        fb.remove(); f.style.display = '';
        var s = f.src; f.src = 'about:blank'; setTimeout(function () { f.src = s; }, 50);
      });
      mpxTrack('crm_iframe_timeout');
    }, 8000);
  }
  window.mpxWatchCrmIframe = watch;

  // static CRM iframes (#demo lead form, support portal): attribution + watchdog
  document.querySelectorAll('iframe[src*="crm.medplix.ai"]').forEach(function (f) {
    f.src = withAttribution(f.src);
    watch(f);
  });

  // Hot chat leads: tag the demo form with the AI's lead note so the CRM sees why they came
  document.addEventListener('mpx:hot-intent', function (e) {
    var f = document.querySelector('#demo iframe');
    var note = e.detail && e.detail.note;
    if (!f || !note || f._mpxNoted) return;
    if (document.activeElement === f) return;   // never reload a form being filled
    f._mpxNoted = true;
    f.src = withAttribution('https://crm.medplix.ai/?lead&src=chat&note=' + encodeURIComponent(String(note).slice(0, 120)));
  });

  // funnel events
  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;
    var wa = e.target.closest('a[href^="https://wa.me"]');
    if (wa) mpxTrack('whatsapp_click');
    if (e.target.closest('a[href^="tel:"]')) mpxTrack('call_click');
    var pill = e.target.closest('.heroprod-pill');
    if (pill) mpxTrack('hero_product_click', { product: (pill.textContent || '').trim() });
  }, true);
  if ('IntersectionObserver' in window) {
    [['demo', 'demo_view'], ['pricing', 'pricing_view']].forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      if (!el) return;
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { mpxTrack(pair[1]); io.disconnect(); } });
      }, { threshold: 0.25 });
      io.observe(el);
    });
  }
})();

