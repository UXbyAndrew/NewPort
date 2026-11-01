/* Case study journey — scroll scenes, palette collapse, specimen. No dependencies. */
(() => {
  const root = document.documentElement;
  root.classList.add('cj-js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = t => 1 - Math.pow(1 - t, 3);
  const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const y = $('[data-year]'); if (y) y.textContent = new Date().getFullYear();

  /* "Not in practice." starts broken apart, then settles */
  $$('.cj-line--break span').forEach((s, i) => {
    const r = n => (Math.random() * 2 - 1) * n;
    s.style.setProperty('--i', i);
    s.style.setProperty('--jx', r(18).toFixed(1) + 'px');
    s.style.setProperty('--jy', r(22).toFixed(1) + 'px');
    s.style.setProperty('--jr', r(14).toFixed(1) + 'deg');
  });
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('cj-ready')));

  /* ---------- Reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -15% 0px' });
  $$('[data-r]').forEach(el => io.observe(el));

  /* ---------- Scene system: one loop, measure on resize only ---------- */
  let vh = innerHeight;
  const scenes = [];
  const scene = (el, opts) => {
    if (!el) return null;
    const s = { el, top: 0, len: 1, p: -1, mode: 'pin', ...opts };
    scenes.push(s); return s;
  };
  const measure = () => {
    vh = innerHeight;
    scenes.forEach(s => {
      const r = s.el.getBoundingClientRect();
      s.top = r.top + scrollY;
      // pin: progress across the sticky travel; pass: from entering the viewport to its centre
      s.len = s.mode === 'pin' ? Math.max(s.el.offsetHeight - vh, 1) : vh * 0.75;
      if (s.mode === 'pass') s.top -= vh * 0.95;
      if (s.mode === 'hero') s.len = Math.max(s.el.offsetHeight, 1);
      s.p = -1;
    });
    chapters.forEach(c => { const r = c.el.getBoundingClientRect(); c.top = r.top + scrollY; c.h = c.el.offsetHeight; });
    if (palette) palette.resize();
    // hub connectors: from the owner to each partner, using real node positions
    const hub = $('.hub');
    if (hub) {
      // offsets ignore the entrance transform, so lines land on final positions
      const ctr = el => [el.offsetLeft + el.offsetWidth / 2, el.offsetTop + el.offsetHeight / 2];
      const core = ctr($('.node--core', hub));
      const paths = $$('.hub__lines path', hub);
      ['.node--top', '.node--left', '.node--right'].forEach((sel, i) => {
        const [x, y2] = ctr($(sel, hub));
        if (paths[i]) paths[i].setAttribute('d', `M${core[0].toFixed(1)} ${core[1].toFixed(1)} L${x.toFixed(1)} ${y2.toFixed(1)}`);
      });
    }
  };

  /* ---------- Chapters + rail ---------- */
  const rail = $('.rail');
  const railLinks = $$('.rail a');
  const chapters = railLinks.map((a, i) => {
    const els = $$(`[data-chapter="${i}"]`);
    return { a, el: els[0], els, top: 0, h: 0, i };
  });
  const darkEls = $$('[data-theme="dark"]');
  const header = $('.header');
  let lastY = scrollY, activeCh = -1;

  const frame = () => {
    ticking = false;
    const sy = scrollY;

    // header
    header.classList.toggle('is-scrolled', sy > 24);
    if (Math.abs(sy - lastY) > 4 && sy > vh * .5) header.classList.toggle('is-hidden', sy > lastY);
    if (sy < vh * .5) header.classList.remove('is-hidden');
    lastY = sy;

    // scenes
    for (const s of scenes) {
      const p = reduced ? 1 : clamp((sy - s.top) / s.len, 0, 1);
      if (p === s.p) continue;
      s.p = p;
      s.el.style.setProperty('--p', p.toFixed(4));
      if (s.update) s.update(p);
    }

    // chapters: span from first to last element sharing the index
    let cur = -1;
    chapters.forEach(c => {
      const last = c.els[c.els.length - 1];
      const end = last ? last.getBoundingClientRect().bottom + sy : c.top + c.h;
      const cp = clamp((sy + vh * .5 - c.top) / Math.max(end - c.top, 1), 0, 1);
      c.a.style.setProperty('--cp', cp.toFixed(3));
      if (sy + vh * .5 >= c.top && sy + vh * .5 < end) cur = c.i;
    });
    if (cur !== activeCh) {
      activeCh = cur;
      railLinks.forEach((a, i) => { if (i === cur) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
    }
    rail.classList.toggle('is-on', sy > vh * .6);
    const onDark = darkEls.some(d => { const r = d.getBoundingClientRect(); return r.top <= vh * .5 && r.bottom >= vh * .5; });
    rail.classList.toggle('on-dark', onDark);
    header.classList.toggle('on-dark', darkEls.some(d => { const r = d.getBoundingClientRect(); return r.top <= 30 && r.bottom >= 30; }));
  };
  let ticking = false;
  const kick = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', kick, { passive: true });

  /* ---------- Hero: fragments drift with pointer and scroll ---------- */
  const hero = $('.cj-hero');
  scene(hero, { mode: 'hero' });
  if (hero && fine && !reduced) {
    hero.addEventListener('pointermove', e => {
      hero.style.setProperty('--mx', ((e.clientX / innerWidth) - .5).toFixed(3));
      hero.style.setProperty('--my', ((e.clientY / innerHeight) - .5).toFixed(3));
    });
  }

  /* ---------- 01 Noise: pain points light up ---------- */
  const pains = $$('.pain');
  scene($('[data-scene="noise"]'), {
    update: p => pains.forEach(el => el.classList.toggle('on', reduced || p >= +el.style.getPropertyValue('--at')))
  });

  /* ---------- 03 Palette collapse (canvas) ---------- */
  const PALETTE = {
    'Neutral': ['#f9fbfc','#f5f4f7','#e5e7eb','#d2d6db','#9da2ae','#6d7280','#4c5564','#35414f','#1c2c39','#111727'],
    'Primary Red': ['#fde9e9','#f9bbc0','#f67a7f','#ef606b','#e92e3d','#ce2130','#b11326','#9b0000','#790f18','#5e0a12'],
    'Oasis Blue': ['#e5f2f9','#bedeec','#7fbcdc','#3f9fca','#2f82a8','#007db7','#016494','#015178','#003f5c','#00324a'],
    'Accent Blue': ['#d0e3ea','#9bbcc7','#6f98a5','#4b7685','#295665','#073543','#142b37','#04232b','#041a20','#020f14'],
    'Success': ['#f0fdf4','#ddfce6','#baf7d1','#87efac','#4bdf7f','#22c45e','#14a44a','#15803e','#176534','#13522d'],
    'Warning': ['#fffbea','#fef3c7','#fee68a','#fdd34d','#fabf24','#f69e0a','#d87706','#b45309','#933f0e','#783510'],
    'Destructive': ['#fef2f2','#fbe5e3','#fecaca','#fca5a5','#f47176','#ee4444','#dc2626','#b91b1c','#9b1b1b','#7f1d1c']
  };
  const FAMS = Object.keys(PALETTE);
  const N = 820;
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const jitter = (rgb, amt) => rgb.map(v => clamp(Math.round(v + (rnd() * 2 - 1) * amt), 0, 255));

  const palette = (() => {
    const canvas = $('.pal__canvas');
    const sec = $('[data-scene="palette"]');
    if (!canvas || !sec) return null;
    const ctx = canvas.getContext('2d');
    const numEl = $('[data-pal-num]'), unitEl = $('[data-pal-unit]');
    // swatch data
    const sw = [];
    for (let i = 0; i < N; i++) {
      const fi = i < 70 ? Math.floor(i / 10) : Math.floor(rnd() * 7);
      const si = i < 70 ? i % 10 : Math.floor(rnd() * 10);
      const target = hexToRgb(PALETTE[FAMS[fi]][si]);
      sw.push({
        fi, si, real: i < 70, target,
        start: i < 70 ? jitter(target, 40) : jitter(target, 70),
        x0: rnd(), y0: rnd(), r0: (rnd() * 2 - 1) * 1.2, s0: 6 + rnd() * 14,
        d: rnd() * .22
      });
    }
    // draw duplicates first, real swatches on top
    sw.sort((a, b) => a.real - b.real);
    let W = 0, H = 0, dpr = 1, grid = null;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const labelW = W < 520 ? 0 : 108;
      const cw = (W - labelW) / 10;
      const ch = Math.min(cw * .72, (H - 8) / 7);
      const gh = ch * 7;
      grid = { labelW, cw, ch, oy: (H - gh) / 2 };
      draw(lastP);
    };
    let lastP = 0;
    const draw = p => {
      lastP = p;
      if (!W) return;
      ctx.clearRect(0, 0, W, H);
      const { labelW, cw, ch, oy } = grid;
      const gap = Math.max(2, cw * .06);
      for (const s of sw) {
        const t = easeIO(clamp((p - .08 - s.d) / .55, 0, 1));
        const tx = labelW + s.si * cw + gap / 2, ty = oy + s.fi * ch + gap / 2;
        const tw = cw - gap, th = ch - gap;
        const x = s.x0 * (W - 20) + (tx - s.x0 * (W - 20)) * t;
        const yy = s.y0 * (H - 20) + (ty - s.y0 * (H - 20)) * t;
        const w = s.s0 + (tw - s.s0) * t, h = s.s0 + (th - s.s0) * t;
        let a = 1;
        if (!s.real) a = t < .6 ? 1 : 1 - (t - .6) / .4;          // duplicates merge away
        if (a <= 0.01) continue;
        const c = s.start.map((v, k) => Math.round(v + (s.target[k] - v) * t));
        ctx.globalAlpha = a;
        ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        const rot = s.r0 * (1 - t);
        if (rot) {
          ctx.save(); ctx.translate(x + w / 2, yy + h / 2); ctx.rotate(rot); ctx.fillRect(-w / 2, -h / 2, w, h); ctx.restore();
        } else {
          ctx.fillRect(x, yy, w, h);
        }
      }
      ctx.globalAlpha = 1;
      // ramp labels fade in once order arrives
      const la = clamp((p - .72) / .15, 0, 1);
      if (la > 0 && labelW) {
        ctx.globalAlpha = la;
        ctx.fillStyle = '#0d0d0f';
        ctx.font = '500 13px Inter, system-ui, sans-serif';
        ctx.textBaseline = 'middle';
        FAMS.forEach((f, i) => ctx.fillText(f, 0, oy + i * ch + ch / 2));
        ctx.globalAlpha = 1;
      }
      // counter
      if (numEl) {
        if (p < .12) { numEl.textContent = '800+'; unitEl.textContent = 'colors in use'; }
        else if (p < .78) { numEl.textContent = Math.round(820 - (820 - 70) * ease(clamp((p - .12) / .66, 0, 1))); unitEl.textContent = 'colors in use'; }
        else { numEl.textContent = '7'; unitEl.textContent = 'named ramps, tokenized'; }
      }
    };
    scene(sec, { update: draw });
    return { resize };
  })();

  /* ---------- Type merge, lanes, dial (pass-through scrubs) ---------- */
  scene($('[data-scene="merge"]'), { mode: 'pass' });
  scene($('[data-scene="lanes"]'), { mode: 'pass' });
  const arc = $('.dial__arc'), dialNum = $('[data-dial-num]');
  const C = 2 * Math.PI * 84;
  scene($('[data-scene="dial"]'), {
    mode: 'pass',
    update: p => {
      const t = ease(p);
      const minutes = 60 - (60 - 17.5) * t;          // hour-plus down to the 15–20 min band
      if (arc) arc.style.strokeDashoffset = (C * (1 - minutes / 60)).toFixed(1);
      if (dialNum) dialNum.textContent = t >= .98 ? '15–20' : (t < .02 ? '60+' : Math.round(minutes));
    }
  });

  /* ---------- Components specimen ---------- */
  const btn = $('[data-btn]'), layer = $('[data-layer]'), note = $('[data-note]');
  const NOTES = {
    default: 'The resting state, documented with usage rules.',
    hover: 'Hover darkens along the same color ramp.',
    focus: 'A visible focus ring for keyboard users.',
    pressed: 'Pressed deepens the color to confirm the action.',
    disabled: 'Disabled is clearly unavailable.',
    loading: 'Loading uses the disabled state while the label changes, guarding against errors.'
  };
  const INTENT = { red: 'Red drives top‑of‑funnel actions.', blue: 'Blue carries mid‑funnel decisions.' };
  const syncSpec = () => {
    const st = btn.dataset.state, it = btn.dataset.intent;
    layer.textContent = `Button / Primary / ${it === 'red' ? 'Red' : 'Blue'} / ${st[0].toUpperCase() + st.slice(1)}`;
    note.textContent = st === 'default' ? INTENT[it] : NOTES[st];
  };
  $$('.seg-ctl').forEach(group => {
    const btns = $$('button', group);
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(o => o.setAttribute('aria-checked', String(o === b)));
      if (b.dataset.state) btn.dataset.state = b.dataset.state;
      if (b.dataset.intent) btn.dataset.intent = b.dataset.intent;
      syncSpec();
    }));
    // arrow-key support for radiogroups
    group.addEventListener('keydown', e => {
      if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
      const i = btns.findIndex(b => b.getAttribute('aria-checked') === 'true');
      const n = btns[(i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length];
      n.click(); n.focus(); e.preventDefault();
    });
  });

  /* ---------- Lightbox ---------- */
  const lb = $('.lightbox');
  if (lb && lb.showModal) {
    const img = $('img', lb);
    let opener = null;
    $$('[data-zoom]').forEach(b => b.addEventListener('click', () => {
      opener = b;
      img.src = b.dataset.src || $('img', b).src;
      img.alt = b.dataset.alt || $('img', b)?.alt || '';
      lb.showModal();
    }));
    lb.addEventListener('click', e => { if (e.target === lb || e.target === img || e.target.closest('.lightbox__close')) lb.close(); });
    lb.addEventListener('close', () => opener && opener.focus());
  }

  /* ---------- Copy email ---------- */
  const toast = $('.toast');
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    let msg = 'Email copied.';
    try { await navigator.clipboard.writeText(b.dataset.copy); } catch (e) { msg = b.dataset.copy; }
    if (!toast) return;
    toast.textContent = msg; toast.classList.add('is-on');
    clearTimeout(toast._t); toast._t = setTimeout(() => toast.classList.remove('is-on'), 2000);
  }));

  /* ---------- Init ---------- */
  measure(); kick();
  addEventListener('resize', () => { measure(); kick(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); kick(); });
  addEventListener('load', () => { measure(); kick(); });
})();
