/* ALSAIEL Digital Gateway — controller.
   Visibility policy (first visit, then every 30 days) is decided by the inline script in <head>
   so the overlay never flashes. This file runs the sequence, the exit, skip, and manual replay. */
(function () {
  'use strict';
  var KEY = 'alsaiel.gateway.v1';
  var root = document.documentElement, el = document.getElementById('gateway');
  if (!el) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var layers = [].slice.call(el.querySelectorAll('.gw-layer'));
  var goBtn = el.querySelector('.gw-go'), skipBtn = el.querySelector('.gw-skip');
  var state = 'idle';          // idle | open | closing
  var pageParts = [];

  /* the slit stays centred: portrait screens crop the scene around it */
  function fit() { var vb = innerHeight > innerWidth ? '300 0 520 900' : '0 0 1600 900'; layers.forEach(function (s) { s.setAttribute('viewBox', vb); }); }
  fit(); addEventListener('resize', fit);

  function remember() { try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), v: 1 })); } catch (e) {} }
  function setInert(on) {
    if (on) { pageParts = [].slice.call(document.querySelectorAll('header, main, footer, .skip')); }
    pageParts.forEach(function (n) { n.inert = on; if (on) n.setAttribute('aria-hidden', 'true'); else n.removeAttribute('aria-hidden'); });
  }
  function fontsReady() {
    var t = new Promise(function (r) { setTimeout(r, 900); });
    var f = (document.fonts && document.fonts.load) ? document.fonts.load('800 1em "Noto Kufi Arabic"', 'الصايل') : Promise.resolve();
    return Promise.race([f.catch(function () {}), t]);
  }
  function reset() {
    el.getAnimations({ subtree: true }).forEach(function (a) { a.cancel(); });
    el.classList.remove('gw-run'); el.removeAttribute('style');
  }

  function open() {
    if (state === 'open') return;
    state = 'open';
    reset();
    root.classList.add('gw-on', 'gw-wait');
    setInert(true);
    skipBtn.focus({ preventScroll: true });
    fontsReady().then(function () { if (state === 'open') requestAnimationFrame(function () { el.classList.add('gw-run'); }); });
  }

  function A(node, kf, o) { return node.animate(kf, Object.assign({ fill: 'forwards', easing: 'cubic-bezier(.6,0,.2,1)' }, o)); }

  function finish() {
    reset();
    root.classList.remove('gw-on', 'gw-wait');
    setInert(false); remember(); state = 'idle';
    var h = document.querySelector('.hero h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }

  function close(mode) {
    if (state !== 'open') return;
    state = 'closing';
    if (reduce.matches || mode === 'skip') {
      root.classList.remove('gw-wait');
      A(el, [{ opacity: 1 }, { opacity: 0 }], { duration: reduce.matches ? 200 : 260, easing: 'ease-out' }).finished.then(finish, finish);
      return;
    }
    /* 03 opening → 04 expanding → 05 transition */
    A(el.querySelector('.gw-lock'), [{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: 'ease-out' });
    var kfL = [{ transform: 'translateX(0)' }, { transform: 'translateX(calc(var(--gw-mid) * -1))', offset: .5 }, { transform: 'translateX(calc(var(--gw-end) * -1))' }];
    var kfR = [{ transform: 'translateX(0)' }, { transform: 'translateX(var(--gw-mid))', offset: .5 }, { transform: 'translateX(var(--gw-end))' }];
    A(el.querySelector('.gw-slabL'), kfL, { duration: 1500, delay: 80, easing: 'cubic-bezier(.5,0,.3,1)' });
    A(el.querySelector('.gw-slabR'), kfR, { duration: 1500, delay: 80, easing: 'cubic-bezier(.5,0,.3,1)' });
    A(el.querySelector('.gw-cam'), [{ transform: 'scale(1)' }, { transform: 'scale(1.45)' }], { duration: 1600, delay: 80, easing: 'cubic-bezier(.55,.05,.4,1)' });
    A(el.querySelector('.gw-veil'), [{ opacity: 1 }, { opacity: 0 }], { duration: 500, delay: 60, easing: 'ease-out' });
    A(el.querySelector('.gw-bloom'), [{ opacity: 0 }, { opacity: .9, offset: .55 }, { opacity: .55 }], { duration: 800, delay: 800, easing: 'ease-in-out' });
    setTimeout(function () { root.classList.remove('gw-wait'); }, 1250);       // hero entrance starts under the fading overlay
    A(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 650, delay: 1350, easing: 'ease-out' }).finished.then(finish, finish);
  }

  goBtn.addEventListener('click', function () { close('enter'); });
  skipBtn.addEventListener('click', function () { close('skip'); });
  document.addEventListener('keydown', function (e) {
    if (state !== 'open') return;
    if (e.key === 'Escape') { e.preventDefault(); close('skip'); }
    if (e.key === 'Tab') {                                                   // keep focus inside the dialog
      var f = [goBtn, skipBtn]; var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      else if (i < 0) { e.preventDefault(); f[0].focus(); }
    }
  });
  [].slice.call(document.querySelectorAll('.gw-replay')).forEach(function (b) {
    b.addEventListener('click', function () { window.scrollTo(0, 0); open(); });
  });

  if (root.classList.contains('gw-on')) { state = 'idle'; open(); }
  window.AlsaielGateway = { open: open, skip: function () { close('skip'); } };
})();
