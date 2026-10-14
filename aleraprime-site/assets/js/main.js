/* Aleraprime — site interactions */
(function () {
  'use strict';

  var doc = document;
  var body = doc.body;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Year ---------- */
  var yr = doc.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- Header state ---------- */
  var header = doc.getElementById('header');
  function onScroll() {
    if (header) header.classList.toggle('scrolled', window.scrollY > 24);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile menu ---------- */
  var menuBtn = doc.getElementById('menuBtn');
  var nav = doc.getElementById('nav');
  function setMenu(open) {
    body.classList.toggle('menu-open', open);
    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
  }
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () { setMenu(!body.classList.contains('menu-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && body.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); }
    });
    window.matchMedia('(min-width: 981px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = doc.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); ro.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Process line progress ---------- */
  var steps = doc.getElementById('steps');
  if (steps && 'IntersectionObserver' in window) {
    var so = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { steps.style.setProperty('--progress', '1'); so.disconnect(); }
    }, { threshold: 0.35 });
    so.observe(steps);
  } else if (steps) { steps.style.setProperty('--progress', '1'); }

  /* ---------- Active nav link ---------- */
  var navLinks = nav ? Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]:not(.btn)')) : [];
  if (navLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    navLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var ao = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var link = map[en.target.id];
        if (!link) return;
        if (en.isIntersecting) {
          navLinks.forEach(function (l) { l.classList.remove('active'); });
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var s = doc.getElementById(id); if (s) ao.observe(s); });
  }

  /* ---------- FAQ: one open at a time ---------- */
  var faqItems = doc.querySelectorAll('.faq-item');
  faqItems.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) faqItems.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });

  /* ---------- Engagement buttons pre-select topic ---------- */
  var interest = doc.getElementById('f-interest');
  doc.querySelectorAll('[data-interest]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!interest) return;
      var v = btn.getAttribute('data-interest');
      for (var i = 0; i < interest.options.length; i++) {
        if (interest.options[i].text === v) { interest.selectedIndex = i; break; }
      }
    });
  });

  /* ---------- Hero chart ---------- */
  var chartEl = doc.getElementById('heroChart');
  var SVGNS = 'http://www.w3.org/2000/svg';
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var actual = [4.6, 4.9, 5.1, 5.0, 5.4, 5.6, 5.7, 5.9, 6.0];
  var forecast = [6.0, 6.2, 6.4, 6.8];          // starts at last actual
  var band = [0, 0.18, 0.3, 0.42];               // ± width
  var yMin = 4, yMax = 7.5;
  var played = false;

  function el(name, attrs, parent) {
    var n = doc.createElementNS(SVGNS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function seeded(i) { var x = Math.sin(i * 9301 + 49297) * 233280; return x - Math.floor(x); }

  function drawChart(animate) {
    if (!chartEl) return;
    var W = chartEl.clientWidth, H = chartEl.clientHeight;
    if (!W || !H) return;
    chartEl.innerHTML = '';
    var pad = { l: 34, r: 8, t: 10, b: 22 };
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    var X = function (i) { return pad.l + (iw * i) / 11; };
    var Y = function (v) { return pad.t + ih - ((v - yMin) / (yMax - yMin)) * ih; };

    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, 'aria-hidden': 'true', focusable: 'false' }, chartEl);
    var defs = el('defs', {}, svg);
    var grad = el('linearGradient', { id: 'chArea', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0%', 'stop-color': '#6CC4C9', 'stop-opacity': '.28' }, grad);
    el('stop', { offset: '100%', 'stop-color': '#6CC4C9', 'stop-opacity': '0' }, grad);

    var grid = el('g', { class: 'ch-grid' }, svg);
    var axis = el('g', { class: 'ch-axis' }, svg);
    [4, 5, 6, 7].forEach(function (v) {
      el('line', { x1: pad.l, x2: W - pad.r, y1: Y(v), y2: Y(v) }, grid);
      var t = el('text', { x: pad.l - 8, y: Y(v) + 3.5, 'text-anchor': 'end' }, axis);
      t.textContent = '$' + v + 'M';
    });
    var step = W < 380 ? 2 : 1;
    months.forEach(function (m, i) {
      if (i % step) return;
      var t = el('text', { x: X(i), y: H - 4, 'text-anchor': 'middle' }, axis);
      t.textContent = W < 380 ? m.charAt(0) : m;
    });

    // forecast band
    var up = [], dn = [];
    forecast.forEach(function (v, j) { var i = 8 + j; up.push(X(i) + ',' + Y(v + band[j])); dn.unshift(X(i) + ',' + Y(v - band[j])); });
    var bandEl = el('polygon', { class: 'ch-band', points: up.concat(dn).join(' ') }, svg);

    // now marker
    var now = el('line', { class: 'ch-now', x1: X(8), x2: X(8), y1: pad.t, y2: pad.t + ih }, svg);

    // area + line
    var pts = actual.map(function (v, i) { return [X(i), Y(v)]; });
    var linePath = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L');
    var areaPath = linePath + ' L' + X(8) + ',' + (pad.t + ih) + ' L' + X(0) + ',' + (pad.t + ih) + ' Z';
    var area = el('path', { class: 'ch-area', d: areaPath }, svg);
    var line = el('path', { class: 'ch-line', d: linePath }, svg);
    var fcPath = 'M' + forecast.map(function (v, j) { return X(8 + j).toFixed(1) + ',' + Y(v).toFixed(1); }).join(' L');
    var fc = el('path', { class: 'ch-fc', d: fcPath }, svg);
    var end = el('circle', { class: 'ch-end', cx: X(11), cy: Y(forecast[3]), r: 4 }, svg);

    // dots
    var dots = pts.map(function (p, i) { return el('circle', { class: 'ch-dot', cx: p[0], cy: p[1], r: 3.2 }, svg); });
    // extra scattered noise dots that fade out
    var noise = [];
    for (var n = 0; n < 22; n++) {
      noise.push(el('circle', { class: 'ch-dot', cx: pad.l + seeded(n) * iw, cy: pad.t + seeded(n + 50) * ih, r: 2.2, opacity: 0.5 }, svg));
    }

    if (!animate || reduceMotion) {
      noise.forEach(function (d) { d.remove(); });
      return;
    }

    // initial state
    var len = line.getTotalLength();
    line.style.strokeDasharray = len; line.style.strokeDashoffset = len;
    [area, bandEl, fc, end, now].forEach(function (x) { x.style.opacity = 0; });
    var starts = pts.map(function (p, i) { return [pad.l + seeded(i + 100) * iw, pad.t + seeded(i + 200) * ih]; });
    dots.forEach(function (d, i) { d.setAttribute('cx', starts[i][0]); d.setAttribute('cy', starts[i][1]); d.style.opacity = 0.6; });
    noise.forEach(function (d) { d.style.opacity = 0; });

    var t0 = null;
    var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    var clamp = function (v) { return Math.max(0, Math.min(1, v)); };
    function frame(ts) {
      if (t0 === null) t0 = ts;
      var t = (ts - t0) / 1000;
      // phase 0: scatter appears (0–0.5s)
      var a0 = clamp(t / 0.5);
      noise.forEach(function (d) { d.style.opacity = (0.5 * a0 * (1 - clamp((t - 0.9) / 0.6))).toFixed(3); });
      // phase 1: dots converge (0.5–1.7s)
      var p1 = ease(clamp((t - 0.5) / 1.2));
      dots.forEach(function (d, i) {
        d.setAttribute('cx', (starts[i][0] + (pts[i][0] - starts[i][0]) * p1).toFixed(1));
        d.setAttribute('cy', (starts[i][1] + (pts[i][1] - starts[i][1]) * p1).toFixed(1));
        d.style.opacity = (0.6 + 0.4 * p1).toFixed(3);
      });
      // phase 2: line draws (1.5–2.5s)
      var p2 = ease(clamp((t - 1.5) / 1.0));
      line.style.strokeDashoffset = (len * (1 - p2)).toFixed(1);
      area.style.opacity = clamp((t - 2.0) / 0.6);
      // phase 3: forecast (2.4–3.2s)
      var p3 = clamp((t - 2.4) / 0.8);
      now.style.opacity = p3; bandEl.style.opacity = p3; fc.style.opacity = p3; end.style.opacity = clamp((t - 2.9) / 0.4);
      if (t < 3.4) requestAnimationFrame(frame);
      else noise.forEach(function (d) { d.remove(); });
    }
    requestAnimationFrame(frame);
  }

  if (chartEl) {
    var startChart = function () { if (!played) { played = true; drawChart(true); } };
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { setTimeout(startChart, 250); });
    else setTimeout(startChart, 300);
    setTimeout(startChart, 1200); // safety
    var rt;
    var lastW = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (chartEl.clientWidth !== lastW) { lastW = chartEl.clientWidth; if (played) drawChart(false); }
      }, 150);
    });
  }

  /* ---------- Contact form ---------- */
  var form = doc.getElementById('contactForm');
  if (!form) return;
  var statusEl = doc.getElementById('formStatus');
  var submitBtn = doc.getElementById('submitBtn');
  var submitHTML = submitBtn ? submitBtn.innerHTML : '';
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var rules = {
    name:    function (v) { return v.trim().length >= 2 ? '' : 'Please enter your name.'; },
    email:   function (v) { return !v.trim() ? 'Please enter your work email.' : (emailRe.test(v.trim()) ? '' : 'Please enter a valid email address.'); },
    company: function (v) { return v.trim() ? '' : 'Please enter your company name.'; },
    message: function (v) { return v.trim().length >= 10 ? '' : 'Please tell us a little about your challenge.'; }
  };

  function check(field) {
    var rule = rules[field.name];
    if (!rule) return true;
    var msg = rule(field.value);
    var fg = field.closest('.fg');
    var errEl = doc.getElementById('e-' + field.name);
    if (fg) fg.classList.toggle('invalid', !!msg);
    if (errEl) errEl.textContent = msg;
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }

  Object.keys(rules).forEach(function (n) {
    var f = form.elements[n];
    if (!f) return;
    f.addEventListener('blur', function () { if (f.value) check(f); });
    f.addEventListener('input', function () { if (f.closest('.fg').classList.contains('invalid')) check(f); });
  });

  function showStatus(kind, html) {
    statusEl.className = 'form-status ' + kind;
    statusEl.innerHTML = html;
    statusEl.hidden = false;
    statusEl.focus({ preventScroll: true });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var firstBad = null;
    Object.keys(rules).forEach(function (n) {
      var f = form.elements[n];
      if (f && !check(f) && !firstBad) firstBad = f;
    });
    if (firstBad) { firstBad.focus(); return; }
    if (form.elements._gotcha && form.elements._gotcha.value) return; // bot

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    statusEl.hidden = true;

    fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('status ' + res.status);
        form.reset();
        form.hidden = true;
        showStatus('ok', '<strong>Thank you — your message has been sent.</strong>A consultant will reply within one business day to arrange a call.');
        statusEl.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      })
      .catch(function () {
        showStatus('err', '<strong>Your message couldn’t be sent.</strong>Please try again, or email us directly at <a href="mailto:partnerships@aleraprime.com">partnerships@aleraprime.com</a>.');
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.innerHTML = submitHTML;
      });
  });
})();
