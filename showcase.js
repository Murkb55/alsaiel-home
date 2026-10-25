/* ALSAIEL — Live Project Showcase controller.
   Desktop: a pinned product stage driven by NATIVE scrolling (no scroll hijack): scroll progress selects the project and its screen;
   rail, arrows, arrow keys and the screen buttons jump to any state.
   Elsewhere (mobile, reduced motion, short screens, no JS): plain chapters with swipeable screens. */
(function () {
  'use strict';
  var root = document.documentElement;
  var sec = document.getElementById('reel'); if (!sec) return;
  var pin = document.getElementById('sc-pin'), beam = document.getElementById('sc-beam');
  var projs = [].slice.call(sec.querySelectorAll('.sc-proj')), tabs = [].slice.call(sec.querySelectorAll('.sc-tab'));
  var prev = document.getElementById('sc-prev'), next = document.getElementById('sc-next'), count = document.getElementById('sc-count'), live = document.getElementById('sc-live');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)'), fine = matchMedia('(pointer: fine)');
  var N = projs.length, names = ['تهيّأ', 'دال', 'وَقْع'], accents = ['#4FB8A8', '#5FA3B8', '#D9B679'];
  var pinned = false, cur = -1, shot = projs.map(function () { return -1; }), derived = '';
  var shotsOf = projs.map(function (p) { return [].slice.call(p.querySelectorAll('.sc-shots img, .fr')); });
  var viewsOf = projs.map(function (p) { return [].slice.call(p.querySelectorAll('.sc-view')); });

  /* ---------- screens inside a project ---------- */
  function setShot(i, k) {
    var list = shotsOf[i], n = list.length; if (!n || k === shot[i]) return;
    var was = shot[i]; shot[i] = k;
    var stack = projs[i].querySelector('.fr-stack');
    list.forEach(function (el, j) {
      if (stack) { el.setAttribute('data-pos', String((j - k + n) % n)); return; }          // WAQA: frames step forward
      el.classList.toggle('on', j === k);
      el.classList.toggle('was', j === was && j !== k);                                   // DALL: the previous screen stays beneath the wipe
    });
    viewsOf[i].forEach(function (b, j) { b.setAttribute('aria-pressed', j === k ? 'true' : 'false'); });
  }
  viewsOf.forEach(function (vs, i) { vs.forEach(function (b, k) { b.addEventListener('click', function () { setShot(i, k); }); }); });
  projs.forEach(function (p, i) {
    var click = p.querySelector('.fr-click');
    if (click) click.addEventListener('click', function () { setShot(i, (shot[i] + 1) % shotsOf[i].length); });
  });

  /* ---------- projects ---------- */
  function setProject(i) {
    if (i === cur) return;
    var old = cur; cur = i;
    projs.forEach(function (p, k) {
      p.classList.toggle('on', k === i);
      p.classList.toggle('out', k === old && old !== i);
      if (k !== i && p.classList.contains('out') && k !== old) p.classList.remove('out');
      if (pinned) { p.inert = k !== i; if (k === i) p.removeAttribute('aria-hidden'); else p.setAttribute('aria-hidden', 'true'); }
    });
    setTimeout(function () { projs.forEach(function (p, k) { if (k !== cur) p.classList.remove('out'); }); }, 950);
    tabs.forEach(function (t, k) { t.setAttribute('aria-current', k === i ? 'true' : 'false'); });
    pin.style.setProperty('--acc', accents[i]);
    if (count) count.textContent = (i + 1) + ' / ' + N;
    if (prev) prev.disabled = i === 0; if (next) next.disabled = i === N - 1;
    if (live) live.textContent = 'المشروع ' + (i + 1) + ' من ' + N + ': ' + names[i];
  }

  /* ---------- scroll mapping (pinned) ---------- */
  function segTop(k) { var total = sec.offsetHeight - innerHeight; return sec.getBoundingClientRect().top + scrollY + total * k / N; }
  function update() {
    if (!pinned) return;
    var total = sec.offsetHeight - innerHeight, y = -sec.getBoundingClientRect().top;
    var t = Math.max(0, Math.min(.9999, y / total)), p = Math.min(N - 1, Math.floor(t * N)), within = t * N - p;
    var k = Math.min(shotsOf[p].length - 1, Math.floor(within * shotsOf[p].length));
    var key = p + ':' + k;
    if (key !== derived) { derived = key; setProject(p); setShot(p, k); }           // manual choices persist until scrolling changes the state
    tabs.forEach(function (tb, j) { tb.style.setProperty('--p', j < p ? 1 : j === p ? within.toFixed(3) : 0); });
  }
  function goTo(i) {
    i = Math.max(0, Math.min(N - 1, i));
    var behavior = reduce.matches ? 'auto' : 'smooth';
    if (pinned) scrollTo({ top: Math.round(segTop(i) + (sec.offsetHeight - innerHeight) / N * .08), behavior: behavior });
    else projs[i].scrollIntoView({ behavior: behavior, block: 'start' });
  }
  tabs.forEach(function (t, i) { t.addEventListener('click', function () { goTo(i); }); });
  if (prev) prev.addEventListener('click', function () { goTo(cur - 1); });
  if (next) next.addEventListener('click', function () { goTo(cur + 1); });
  sec.addEventListener('keydown', function (e) {                                       // RTL: ArrowLeft goes forward
    if (!pinned || e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(cur + 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(cur - 1); }
  });
  var tick = 0;
  addEventListener('scroll', function () { if (tick) return; tick = requestAnimationFrame(function () { tick = 0; update(); }); }, { passive: true });

  /* ---------- layout choice ---------- */
  function layout() {
    var want = !reduce.matches && innerWidth > 960 && innerHeight >= 640 && CSS.supports('position', 'sticky');
    if (want === pinned && cur !== -1) { update(); return; }
    pinned = want; sec.classList.toggle('pinned', want);
    cur = -1; derived = ''; shot = projs.map(function () { return -1; });
    projs.forEach(function (p, i) { p.classList.remove('on', 'out'); p.inert = false; p.removeAttribute('aria-hidden'); if (!want) { p.classList.remove('seen'); } setShot(i, 0); });
    if (want) { update(); if (cur === -1) setProject(0); }
    else { setProject(0); observeSeen(); }
  }
  addEventListener('resize', layout);
  if (reduce.addEventListener) reduce.addEventListener('change', layout);

  /* ---------- stacked mode: reveal each chapter as it enters, mark the rail ---------- */
  var io = null;
  function observeSeen() {
    if (io) io.disconnect();
    if (!('IntersectionObserver' in window) || reduce.matches) { projs.forEach(function (p) { p.classList.add('seen'); }); return; }
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('seen');
        if (!pinned) { var i = projs.indexOf(e.target); if (e.intersectionRatio > .35) setProject(i); }
      });
    }, { threshold: [.15, .4], rootMargin: '0px 0px -10% 0px' });
    projs.forEach(function (p) { io.observe(p); });
  }
  if ('IntersectionObserver' in window && beam) {
    new IntersectionObserver(function (es, o) { es.forEach(function (e) { if (e.isIntersecting) { beam.classList.add('in'); o.disconnect(); } }); }, { threshold: .1 }).observe(beam);
  } else if (beam) { beam.classList.add('in'); }

  /* ---------- limited pointer parallax on the layered TAHAYYA scene ---------- */
  var lays = [].slice.call(sec.querySelectorAll('.sv-t .lay')), raf = 0, px = 0, py = 0;
  if (lays.length) {
    sec.addEventListener('pointermove', function (e) {
      if (!pinned || reduce.matches || !fine.matches) return;
      px = e.clientX / innerWidth - .5; py = e.clientY / innerHeight - .5; if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        lays.forEach(function (l) { var d = +l.getAttribute('data-depth') || 10; l.style.setProperty('--px', (px * d).toFixed(1) + 'px'); l.style.setProperty('--py', (py * d).toFixed(1) + 'px'); });
      });
    }, { passive: true });
  }

  /* fetch every screen shortly before the section is reached, so switching never waits on the network */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es, o) {
      if (!es[0].isIntersecting) return; o.disconnect();
      [].slice.call(sec.querySelectorAll('img[loading="lazy"]')).forEach(function (im) { im.loading = 'eager'; });
    }, { rootMargin: '900px 0px' }).observe(sec);
  }

  layout();
  window.AlsaielShowcase = { goTo: goTo, state: function () { return { pinned: pinned, project: cur, shots: shot.slice() }; } };
})();
