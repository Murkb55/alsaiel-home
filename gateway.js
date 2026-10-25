/* ALSAIEL Digital Gateway — controller.
   Visibility policy (first visit, then every 30 days) is decided by the inline script in <head>
   so the overlay never flashes. This file runs the sequence, the exit, skip, and manual replay. */
(function () {
  'use strict';
  var KEY = 'alsaiel.gateway.v1';
  var root = document.documentElement, el = document.getElementById('gateway');
  if (!el) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var goBtn = el.querySelector('.gw-go'), skipBtn = el.querySelector('.gw-skip');
  var state = 'idle';          // idle | open | closing
  var pageParts = [];

  /* review aid: ?gw=monument | minimal switches the visual tone */
  var tone = new URLSearchParams(location.search).get('gw');
  if (tone === 'monument' || tone === 'minimal') el.setAttribute('data-gw', tone);

  /* a few drifting light specks (CSS-animated, transform/opacity only) */
  var dust = el.querySelector('.gw-dust');
  if (dust && !dust.children.length) {
    var seed = 7, rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (var i = 0; i < 14; i++) {
      var s = document.createElement('i');
      s.style.cssText = 'left:' + (8 + rnd() * 84).toFixed(1) + '%;top:' + (40 + rnd() * 55).toFixed(1) + '%;--d:' + (7 + rnd() * 6).toFixed(1) + 's;--l:' + (rnd() * 5).toFixed(1) + 's;--x:' + (rnd() * 40 - 20).toFixed(0) + 'px';
      dust.appendChild(s);
    }
  }

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

  function open() {
    if (state === 'open') return;
    state = 'open';
    el.getAnimations({ subtree: true }).forEach(function (a) { a.cancel(); });
    el.classList.remove('gw-run'); el.removeAttribute('style');
    root.classList.add('gw-on', 'gw-wait');
    setInert(true);
    skipBtn.focus({ preventScroll: true });
    fontsReady().then(function () { if (state === 'open') requestAnimationFrame(function () { el.classList.add('gw-run'); }); });
  }

  function A(node, kf, o) { return node.animate(kf, Object.assign({ fill: 'forwards', easing: 'cubic-bezier(.7,0,.2,1)' }, o)); }

  function finish() {
    el.getAnimations({ subtree: true }).forEach(function (a) { a.cancel(); });
    el.classList.remove('gw-run'); el.removeAttribute('style');
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
    var text = [].slice.call(el.querySelectorAll('.gw-name,.gw-latin,.gw-tag,.gw-actions'));
    var svg = el.querySelector('.gw-gate svg');
    text.forEach(function (n) { A(n, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-10px)' }], { duration: 320, easing: 'ease-out' }); });
    [].slice.call(el.querySelectorAll('.gw-fr')).forEach(function (f, i) {              // frames rush past the camera
      A(f, [{ transform: 'scale(1)', opacity: .6 }, { transform: 'scale(2.6)', opacity: 0 }], { duration: 760, delay: 60 + i * 90, easing: 'cubic-bezier(.4,0,.9,.5)' });
    });
    A(el.querySelector('.gw-core'), [{ opacity: 1 }, { opacity: 1, transform: 'scale(1.35)' }], { duration: 700, delay: 100 });
    svg.style.transformOrigin = '50% 52%';
    A(svg, [{ transform: 'scale(1)' }, { transform: 'scale(2.7)' }], { duration: 1100, delay: 100, easing: 'cubic-bezier(.55,.05,.85,.4)' });
    A(el.querySelector('.gw-bloom'), [{ opacity: 0 }, { opacity: .8 }], { duration: 450, delay: 480, easing: 'ease-in' });
    setTimeout(function () { root.classList.remove('gw-wait'); }, 760);       // hero entrance starts under the fading overlay
    A(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 420, delay: 820, easing: 'ease-out' }).finished.then(finish, finish);
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
