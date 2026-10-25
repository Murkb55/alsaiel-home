/* ALSAIEL Digital Gateway — controller.
   Visibility policy (first visit, then every 30 days) is decided by the inline script in <head>
   so the overlay never flashes. This file runs the four states:
   1 CLOSED GATE → 2 OPENING → 3 REVEALED WORLD → 4 ENTER WEBSITE, plus skip and manual replay. */
(function () {
  'use strict';
  var KEY = 'alsaiel.gateway.v1';
  var root = document.documentElement, el = document.getElementById('gateway');
  if (!el) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var goBtn = el.querySelector('.gw-go'), skipBtn = el.querySelector('.gw-skip');
  var state = 'idle';          // idle | open | closing
  var pageParts = [], guard = 0;

  function q(sel) { return el.querySelector(sel); }
  function remember() { try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), v: 1 })); } catch (e) {} }
  function setInert(on) {
    if (on) { pageParts = [].slice.call(document.querySelectorAll('header, main, footer, .skip')); }
    pageParts.forEach(function (n) { n.inert = on; if (on) n.setAttribute('aria-hidden', 'true'); else n.removeAttribute('aria-hidden'); });
  }
  function ready() {
    [].slice.call(el.querySelectorAll('.gw-img[data-src]')).forEach(function (im) { im.src = im.getAttribute('data-src'); im.removeAttribute('data-src'); });   // images are only fetched when the gateway is actually shown
    var imgs = [].slice.call(el.querySelectorAll('.gw-img')).map(function (im) {
      return im.decode ? im.decode().catch(function () {}) : Promise.resolve();   // decoded before the transition → no flicker
    });
    var f = (document.fonts && document.fonts.load) ? document.fonts.load('800 1em "Noto Kufi Arabic"', 'الصايل').catch(function () {}) : Promise.resolve();
    var cap = new Promise(function (r) { setTimeout(r, 1200); });
    return Promise.race([Promise.all(imgs.concat([f])), cap]);
  }
  function reset() {
    try { el.getAnimations({ subtree: true }).forEach(function (a) { a.cancel(); }); } catch (e) {}
    el.classList.remove('gw-run'); el.removeAttribute('style');
  }
  /* every animation is best-effort: if a browser rejects one, the others and the close still run */
  function A(node, kf, o) {
    try { return node.animate(kf, Object.assign({ fill: 'forwards', easing: 'cubic-bezier(.6,0,.2,1)' }, o)); }
    catch (e) { return { finished: Promise.resolve() }; }
  }

  function open() {
    if (state === 'open') return;
    state = 'open';
    reset();
    root.classList.add('gw-on', 'gw-wait');
    setInert(true);
    skipBtn.focus({ preventScroll: true });
    ready().then(function () { if (state === 'open') requestAnimationFrame(function () { el.classList.add('gw-run'); }); });
  }

  function finish() {
    clearTimeout(guard); reset();
    root.classList.remove('gw-on', 'gw-wait');
    setInert(false); remember(); state = 'idle';
    var h = document.querySelector('.hero h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }

  function close(mode) {
    if (state !== 'open') return;
    state = 'closing';
    guard = setTimeout(finish, mode === 'skip' || reduce.matches ? 900 : 4800);   // never leave the visitor stuck behind the overlay
    if (reduce.matches || mode === 'skip') {
      root.classList.remove('gw-wait');
      A(el, [{ opacity: 1 }, { opacity: 0 }], { duration: reduce.matches ? 200 : 260, easing: 'ease-out' }).finished.then(finish, finish);
      return;
    }
    var portrait = innerHeight > innerWidth;
    var box = q('.gw-box'), pw = box.getBoundingClientRect().width, pan = portrait ? Math.max(0, Math.round(.78 * pw - innerWidth * .62)) : 0;   // brings the first project panel to the centre of a portrait screen
    var E = 'cubic-bezier(.45,0,.2,1)';

    /* STATE 2 — OPENING (0 → ~1.4s): text leaves, gold light widens, the closed photo dissolves into the world, a gentle approach */
    A(q('.gw-lock'), [{ opacity: 1, transform: getComputedStyle(q('.gw-lock')).transform }, { opacity: 0, transform: getComputedStyle(q('.gw-lock')).transform }], { duration: 380, easing: 'ease-out' });
    A(q('.gw-glow2'), [{ opacity: 0, transform: 'scale(.5)' }, { opacity: 1, transform: 'scale(2.3)', offset: .5 }, { opacity: .85, transform: 'scale(2.7)' }], { duration: 1500, delay: 60, easing: E });
    A(q('.gw-closed'), [{ opacity: 1 }, { opacity: 1, offset: .36 }, { opacity: 0, offset: .66 }, { opacity: 0 }], { duration: 1500, delay: 100, easing: 'linear' });
    A(q('.gw-wash'), [{ opacity: 0 }, { opacity: .78, offset: .5 }, { opacity: 0 }], { duration: 1300, delay: 220, easing: 'ease-in-out' });
    A(q('.gw-glow1'), [{ opacity: .8 }, { opacity: 0 }], { duration: 900, delay: 700, easing: 'ease-out' });
    /* approach toward the gate edge, continuing slowly through the revealed world */
    A(q('.gw-cam'), [{ transform: 'scale(1)' }, { transform: 'scale(1.12)', offset: .45 }, { transform: 'scale(1.2)' }], { duration: 3100, delay: 80, easing: 'cubic-bezier(.35,0,.3,1)' });
    if (pan) A(box, [{ transform: 'translateY(-50%) translateX(0px)' }, { transform: 'translateY(-50%) translateX(' + pan + 'px)' }], { duration: 2000, delay: 700, easing: E });

    /* STATE 3 — REVEALED WORLD (~1.5s → ~2.3s): the light settles and the world is seen */
    A(q('.gw-glow2'), [{ opacity: .9 }, { opacity: 0 }], { duration: 800, delay: 1500, easing: 'ease-out' });

    /* STATE 4 — ENTER WEBSITE (from ~2.3s): the page's own entrance starts under a slow dissolve, no black frame */
    setTimeout(function () { root.classList.remove('gw-wait'); }, 2250);
    A(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 900, delay: 2300, easing: 'ease-out' }).finished.then(finish, finish);
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
