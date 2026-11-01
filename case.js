/* Case study — cinematic scenes. No dependencies.
   One scroll-driven loop; layout measured on resize only. */
(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  const yEl = $('[data-year]'); if (yEl) yEl.textContent = new Date().getFullYear();

  /* ---------- Reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  $$('[data-r]').forEach(el => io.observe(el));

  /* ---------- Scene engine ---------- */
  let vh = innerHeight, vw = innerWidth;
  const scenes = [];
  const add = (el, opts = {}) => { if (el) scenes.push({ el, mode: 'pin', top: 0, len: 1, p: -1, ...opts }); };

  // Timed lines: each <li data-from data-to> is "on" while progress is inside its range
  const timed = el => {
    const items = $$('li[data-from]', el).map(li => ({ li, a: +li.dataset.from, b: +li.dataset.to }));
    // progress dots under each caption list, so you know where you are in a scene
    let dots = [];
    const caps = $('.lower .caps', el);
    if (caps && items.length > 1) {
      const wrap = document.createElement('div');
      wrap.className = 'dots'; wrap.setAttribute('aria-hidden', 'true');
      dots = items.map(() => wrap.appendChild(document.createElement('i')));
      caps.after(wrap);
    }
    return p => items.forEach((it, i) => {
      const on = p >= it.a && p < it.b;
      it.li.classList.toggle('on', on);
      if (dots[i]) { dots[i].classList.toggle('on', on); dots[i].classList.toggle('done', p >= it.b); }
    });
  };
  // Elements that switch on at a progress threshold (data-at, optional data-until)
  const steps = el => {
    const items = $$('[data-at]', el).map(n => ({ n, a: +n.dataset.at, b: n.dataset.until ? +n.dataset.until : 2 }));
    return p => items.forEach(it => it.n.classList.toggle('on', p >= it.a && p < it.b));
  };

  /* ---------- Swatch canvases ---------- */
  const PAL = {
    'Neutral': ['#f9fbfc','#f5f4f7','#e5e7eb','#d2d6db','#9da2ae','#6d7280','#4c5564','#35414f','#1c2c39','#111727'],
    'Primary Red': ['#fde9e9','#f9bbc0','#f67a7f','#ef606b','#e92e3d','#ce2130','#b11326','#9b0000','#790f18','#5e0a12'],
    'Oasis Blue': ['#e5f2f9','#bedeec','#7fbcdc','#3f9fca','#2f82a8','#007db7','#016494','#015178','#003f5c','#00324a'],
    'Accent Blue': ['#d0e3ea','#9bbcc7','#6f98a5','#4b7685','#295665','#073543','#142b37','#04232b','#041a20','#020f14'],
    'Success': ['#f0fdf4','#ddfce6','#baf7d1','#87efac','#4bdf7f','#22c45e','#14a44a','#15803e','#176534','#13522d'],
    'Warning': ['#fffbea','#fef3c7','#fee68a','#fdd34d','#fabf24','#f69e0a','#d87706','#b45309','#933f0e','#783510'],
    'Destructive': ['#fef2f2','#fbe5e3','#fecaca','#fca5a5','#f47176','#ee4444','#dc2626','#b91b1c','#9b1b1b','#7f1d1c']
  };
  const FAMS = Object.keys(PAL);
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

  const makeSwatches = (canvas, mode) => {
    const ctx = canvas.getContext('2d');
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const N = 820, sw = [];
    for (let i = 0; i < N; i++) {
      const fi = i < 70 ? (i / 10) | 0 : (rnd() * 7) | 0;
      const si = i < 70 ? i % 10 : (rnd() * 10) | 0;
      const t = hex(PAL[FAMS[fi]][si]);
      const j = i < 70 ? 40 : 75;
      sw.push({
        fi, si, real: i < 70, target: t,
        start: t.map(v => clamp(Math.round(v + (rnd() * 2 - 1) * j), 0, 255)),
        x0: rnd(), y0: rnd(), r0: (rnd() * 2 - 1) * 1.3, s0: 5 + rnd() * 13,
        ph: rnd() * 6.28, sp: .2 + rnd() * .5, d: rnd() * .2
      });
    }
    sw.sort((a, b) => a.real - b.real);
    let W = 0, H = 0, grid, p = 0, visible = false, raf = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // final palette grid sits in the right/center area, clear of captions and counter
      if (mode === 'calm') {
        const cw = Math.min(W / 10, 110), ch = Math.min(cw * .7, H / 7);
        grid = { x: (W - cw * 10) / 2, y: (H - ch * 7) / 2, labelW: 0, cw, ch };
      } else {
        const gw = Math.min(W * (W < 760 ? .9 : .56), 820), labelW = W < 760 ? 0 : 110;
        const cw = (gw - labelW) / 10, ch = Math.min(cw * .7, H * .055);
        grid = { x: (W - gw) / 2 + (W < 760 ? 0 : W * .12), y: H * (W < 760 ? .3 : .26), labelW, cw, ch };
      }
      draw(performance.now());
    };
    const draw = now => {
      if (!W) return;
      ctx.clearRect(0, 0, W, H);
      const time = now / 1000;
      const { x: gx, y: gy, labelW, cw, ch } = grid;
      const gap = Math.max(2, cw * .07);
      for (const s of sw) {
        const drift = reduced ? 0 : 1;
        const wob = Math.sin(time * s.sp + s.ph) * 10 * drift;
        let x = s.x0 * W + wob, y = s.y0 * H + Math.cos(time * s.sp * .8 + s.ph) * 8 * drift, w = s.s0, h = s.s0, rot = s.r0 + Math.sin(time * .3 + s.ph) * .2 * drift;
        let a = mode === 'chaos' ? .35 + p * .55 : 1, col = s.start;
        if (mode === 'chaos') {
          // the noise gets louder as the problem builds
          const spread = 1 + p * .25;
          x = W / 2 + (x - W / 2) * spread; y = H / 2 + (y - H / 2) * spread;
        } else {
          const t = easeIO(clamp((p - .06 - s.d) / .58, 0, 1));
          const tx = gx + labelW + s.si * cw + gap / 2, ty = gy + s.fi * ch + gap / 2;
          x = lerp(x, tx, t); y = lerp(y, ty, t);
          w = lerp(s.s0, cw - gap, t); h = lerp(s.s0, ch - gap, t);
          rot = rot * (1 - t);
          col = s.start.map((v, k) => Math.round(lerp(v, s.target[k], t)));
          if (!s.real) a = t < .55 ? 1 : 1 - (t - .55) / .45;
        }
        if (a <= .01) continue;
        ctx.globalAlpha = a;
        ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
        if (Math.abs(rot) > .002) { ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot); ctx.fillRect(-w / 2, -h / 2, w, h); ctx.restore(); }
        else ctx.fillRect(x, y, w, h);
      }
      ctx.globalAlpha = 1;
      if (mode === 'collapse' && labelW) {
        const la = clamp((p - .7) / .15, 0, 1);
        if (la > 0) {
          ctx.globalAlpha = la; ctx.fillStyle = '#9a978f'; ctx.font = '500 13px Inter, system-ui, sans-serif'; ctx.textBaseline = 'middle';
          FAMS.forEach((f, i) => ctx.fillText(f, gx, gy + i * ch + ch / 2));
          ctx.globalAlpha = 1;
        }
      }
    };
    // gentle idle motion only while on screen
    const loop = now => { draw(now); raf = visible && !reduced ? requestAnimationFrame(loop) : 0; };
    new IntersectionObserver(es => es.forEach(e => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(loop);
    })).observe(canvas);
    return { resize, set: v => { p = v; if (!raf) draw(performance.now()); } };
  };
  const canvases = [];

  /* ---------- Camera moves over full-res work ---------- */
  const makeCam = sec => {
    const keys = JSON.parse(sec.dataset.cam);            // [p, scale, focusX, focusY]
    const spots = JSON.parse(sec.dataset.spots || '[]');  // [from, to, x0, y0, x1, y1]
    const inner = $('.cam__inner', sec), img = $('.cam__img', sec), spot = $('.spot', sec), stage = $('.stage', sec);
    const ar = +img.getAttribute('width') / +img.getAttribute('height');
    let bw = 0, bh = 0, W = 0, H = 0, zk = 1, curSpot = -1;
    const resize = () => {
      W = stage.clientWidth; H = stage.clientHeight;
      bw = Math.min(W * .86, H * .74 * ar); bh = bw / ar;
      zk = W < 760 ? 1.6 : 1;                               // push in closer on phones
      inner.style.width = bw + 'px'; inner.style.height = bh + 'px';
    };
    const set = p => {
      let i = 0; while (i < keys.length - 2 && p > keys[i + 1][0]) i++;
      const [p0, s0, x0, y0] = keys[i], [p1, s1, x1, y1] = keys[i + 1];
      const t = easeIO(clamp((p - p0) / Math.max(p1 - p0, 1e-4), 0, 1));
      let s = lerp(s0, s1, t); if (s > 1.05) s = 1 + (s - 1) * zk;
      const fx = lerp(x0, x1, t), fy = lerp(y0, y1, t);
      const cy = H * (s > 1.3 ? .42 : .47);                 // leave room for the caption
      const tx = W / 2 - fx * bw * s, ty = cy - fy * bh * s;
      inner.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
      inner.style.setProperty('--s', s.toFixed(3));
      inner.style.setProperty('--r', (1 - clamp((s - 1) / .4, 0, 1)).toFixed(3)); // rounded "screen" only when wide
      // spotlight the region the caption is talking about
      const k = spots.findIndex(r => p >= r[0] && p < r[1]);
      if (k !== curSpot) {
        curSpot = k;
        if (k >= 0) {
          const [, , a, b, c, d] = spots[k];
          spot.style.left = (a * 100) + '%'; spot.style.top = (b * 100) + '%';
          spot.style.width = ((c - a) * 100) + '%'; spot.style.height = ((d - b) * 100) + '%';
        }
        spot.classList.toggle('on', k >= 0);
      }
    };
    return { resize, set };
  };

  /* ---------- Register scenes ---------- */
  $$('[data-scene]').forEach(sec => {
    const kind = sec.dataset.scene;
    if (kind === 'open') add(sec, { update: timed(sec) });
    else if (kind === 'title') add(sec, { mode: 'pass' });
    else if (kind === 'noise' || kind === 'collapse') {
      const cv = makeSwatches($('canvas', sec), kind === 'noise' ? 'chaos' : 'collapse');
      canvases.push(cv);
      const caps = timed(sec);
      const num = $('[data-count]', sec), unit = $('[data-count-unit]', sec);
      add(sec, { update: p => {
        cv.set(p); caps(p);
        if (num) {
          if (p < .1) { num.textContent = '800+'; unit.textContent = 'colors'; }
          else if (p < .72) { num.textContent = Math.round(800 - 730 * easeOut(clamp((p - .1) / .62, 0, 1))); unit.textContent = 'colors'; }
          else { num.textContent = '7'; unit.textContent = 'named ramps'; }
        }
      } });
    }
    else if (kind === 'cam') {
      const cam = makeCam(sec); canvases.push(cam);
      const caps = timed(sec);
      add(sec, { update: p => { cam.set(p); caps(p); } });
    }
    else if (kind === 'lanes') add(sec, { mode: 'pass' });
    else if (kind === 'build') {
      const caps = timed(sec), st = steps(sec);
      add(sec, { update: p => { caps(p); st(p); } });
    }
    else if (kind === 'chat') {
      const st = steps(sec), lanes = $('.lanes', sec);
      add(sec, { update: p => { st(p); lanes.style.setProperty('--lp', clamp((p - .5) / .42, 0, 1).toFixed(4)); } });
    }
    else if (kind === 'dial') {
      const arc = $('.dial__arc', sec), num = $('[data-dial]', sec), C = 2 * Math.PI * 88;
      add(sec, { mode: 'pass', update: p => {
        const t = easeOut(p), m = 60 - 42.5 * t;
        arc.style.strokeDashoffset = (C * (1 - m / 60)).toFixed(1);
        num.textContent = t > .98 ? '15–20' : t < .02 ? '60+' : Math.round(m);
      } });
    }
  });

  $$('[data-swatches="calm"]').forEach(cv => { const s = makeSwatches(cv, 'calm'); canvases.push({ resize: () => { s.resize(); s.set(1); } }); });

  /* ---------- Scrubber ---------- */
  const scrub = $('.scrub'), marks = $$('.scrub__marks a');
  const acts = marks.map((a, i) => ({ a, els: $$(`[data-act="${i}"]`), top: 0, end: 0 }));
  const bar = $('.bar');

  const measure = () => {
    vh = innerHeight; vw = innerWidth;
    canvases.forEach(c => c.resize());
    scenes.forEach(s => {
      const r = s.el.getBoundingClientRect();
      s.top = r.top + scrollY;
      if (s.mode === 'pin') s.len = Math.max(s.el.offsetHeight - vh, 1);
      else { s.top -= vh * .9; s.len = vh * .8; }      // pass-through: entering → near centre
      s.p = -1;
    });
    acts.forEach(a => {
      if (!a.els.length) return;
      a.top = a.els[0].getBoundingClientRect().top + scrollY;
      const l = a.els[a.els.length - 1].getBoundingClientRect();
      a.end = l.bottom + scrollY;
    });
    const hub = $('.hub');
    if (hub) {
      const c = el => [el.offsetLeft + el.offsetWidth / 2, el.offsetTop + el.offsetHeight / 2];
      const core = c($('.node--core', hub));
      $$('.hub__lines path', hub).forEach((path, i) => {
        const n = $(['.node--top', '.node--left', '.node--right'][i], hub);
        const [x, y] = c(n);
        path.setAttribute('d', `M${core[0]} ${core[1]} L${x} ${y}`);
      });
    }
  };

  let ticking = false, cur = -2;
  const frame = () => {
    ticking = false;
    const sy = scrollY;
    let moving = false;
    for (const s of scenes) {
      const target = reduced ? 1 : clamp((sy - s.top) / s.len, 0, 1);
      // ease toward the scroll position so camera moves glide instead of stepping
      let p = s.p < 0 || reduced ? target : lerp(s.p, target, .16);
      if (Math.abs(target - p) < .0006) p = target; else moving = true;
      if (p === s.p) continue;
      s.p = p;
      s.el.style.setProperty('--p', p.toFixed(4));
      if (s.update) s.update(p);
    }
    if (moving) kick();
    const max = document.documentElement.scrollHeight - vh;
    scrub.style.setProperty('--sp', (sy / Math.max(max, 1)).toFixed(4));
    scrub.classList.toggle('is-on', sy > vh * 1.2);
    const mid = sy + vh * .5;
    let on = -1;
    acts.forEach((a, i) => { if (mid >= a.top && mid < a.end) on = i; });
    if (on !== cur) {
      cur = on;
      marks.forEach((m, i) => i === on ? m.setAttribute('aria-current', 'step') : m.removeAttribute('aria-current'));
    }
  };
  const kick = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', () => { measure(); kick(); });
  addEventListener('load', () => { measure(); kick(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); kick(); });
  measure(); kick();

  /* ---------- Copy email ---------- */
  const toast = $('.toast');
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    let msg = 'Email copied.';
    try { await navigator.clipboard.writeText(b.dataset.copy); } catch (e) { msg = b.dataset.copy; }
    toast.textContent = msg; toast.classList.add('is-on');
    clearTimeout(toast._t); toast._t = setTimeout(() => toast.classList.remove('is-on'), 2000);
  }));
})();
