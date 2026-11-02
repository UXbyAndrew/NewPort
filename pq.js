/* PODS Pre-Quote case study — scroll scenes. No dependencies.
   One rAF loop driven by scroll; layout measured on resize only. */
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

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  $$('[data-r]').forEach(el => io.observe(el));

  /* ---------- helpers ---------- */
  const timed = el => {
    const items = $$('[data-from]', el).map(n => ({ n, a: +n.dataset.from, b: +n.dataset.to }));
    return p => items.forEach(it => it.n.classList.toggle('on', p >= it.a && p < it.b));
  };
  const steps = el => {
    const items = $$('[data-at]', el).map(n => ({ n, a: +n.dataset.at }));
    return p => items.forEach(it => it.n.classList.toggle('on', p >= it.a));
  };

  const scenes = [], measurers = [];
  const add = (el, update, mode = 'pin') => scenes.push({ el, update, mode, top: 0, len: 1, p: -1 });

  /* ---------- Bars: grow with scroll ---------- */
  const bars = sec => {
    const ul = $('.bars ul', sec), fig = $('.bars', sec), scale = $('[data-scale]', sec), lines = timed(sec);
    return p => {
      lines(p);
      ul.style.setProperty('--g', easeOut(clamp((p - .04) / .3, 0, 1)).toFixed(4));
      // take the homepage off the scale so the cluster behind it becomes readable
      const r = easeIO(clamp((p - .38) / .16, 0, 1));
      ul.style.setProperty('--max', lerp(43.1, 4.6, r).toFixed(3));
      const on = r > .5;
      if (fig.classList.contains('rescaled') !== on) {
        fig.classList.toggle('rescaled', on);
        scale.textContent = on ? 'Rescaled: 0 – 4.6k · homepage off scale' : 'Scale: 0 – 43k';
      }
    };
  };

  /* ---------- Film strip: pan horizontally ---------- */
  const strip = sec => {
    const track = $('.strip__track', sec), lines = timed(sec);
    let dist = 0;
    measurers.push(() => { dist = Math.max(track.scrollWidth - innerWidth, 0); });
    return p => { lines(p); track.style.transform = `translate3d(${(-easeIO(clamp((p - .06) / .88, 0, 1)) * dist).toFixed(1)}px,0,0)`; };
  };

  /* ---------- The reframe: one journey, read two ways ---------- */
  const map = sec => {
    const box = $('.map', sec), stage = $('.stage', sec), lines = timed(sec);
    const trail = $('.map__trail', sec), live = $('.map__trail--live', sec), dot = $('.map__dot', sec);
    const hops = $('[data-hops]', sec), themes = $$('.themes [data-t]', sec), themeN = $('[data-themes]', sec);
    const nodes = Object.fromEntries($$('.node', sec).map(n => [n.dataset.n, n]));
    const route = ['home', 'moving', 'sizes', 'costs', 'home', 'storage', 'calc', 'costs', 'quote'];
    let pts = [], segLen = [], total = 0;
    const measure = () => {
      // node centres in viewBox units (1000 x 560)
      pts = route.map(k => {
        const s = nodes[k].style;
        return [parseFloat(s.getPropertyValue('--x')) * 10, parseFloat(s.getPropertyValue('--y')) * 5.6];
      });
      // gently curved hops read as a person, not a straight-line diagram
      let d = `M${pts[0][0]} ${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, nx = -(y1 - y0) * .18, ny = (x1 - x0) * .18;
        d += ` Q${(mx + nx).toFixed(1)} ${(my + ny).toFixed(1)} ${x1} ${y1}`;
      }
      trail.setAttribute('d', d); live.setAttribute('d', d);
      total = live.getTotalLength();
      // cumulative length at each node
      segLen = [0];
      const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      for (let i = 1; i < pts.length; i++) {
        probe.setAttribute('d', d.split(' Q').slice(0, i).join(' Q'));
        segLen.push(probe.getTotalLength());
      }
      live.style.strokeDasharray = `${total} ${total}`;
    };
    measurers.push(measure);
    // two passes: .06–.42 reads as "confusion", .5–.92 replays it with meaning
    const pass = p => p < .46 ? clamp((p - .06) / .36, 0, 1) : clamp((p - .5) / .42, 0, 1);
    return p => {
      lines(p);
      if (!total) return;
      const re = p >= .46;
      stage.classList.toggle('reframed', re);
      const t = reduced ? 1 : easeIO(pass(p));
      const len = t * total;
      live.style.strokeDashoffset = (total - len).toFixed(1);
      const pt = live.getPointAtLength(len);
      dot.setAttribute('cx', pt.x.toFixed(1)); dot.setAttribute('cy', pt.y.toFixed(1));
      let reached = 0;
      segLen.forEach((L, i) => { if (len >= L - 1) reached = i; });
      const hit = new Set(route.slice(0, reached + 1));
      Object.entries(nodes).forEach(([k, n]) => n.classList.toggle('hit', hit.has(k) && (k !== 'home' || reached > 0 || len > 0)));
      hops.textContent = reached;
      // second pass: light the confidence themes each hop answered
      const answered = new Set(re ? route.slice(0, reached + 1).map(k => nodes[k].dataset.theme).filter(Boolean) : []);
      themes.forEach(li => li.classList.toggle('on', answered.has(li.dataset.t)));
      themeN.textContent = answered.size;
      stage.classList.toggle('complete', re && answered.size === 4 && reached === route.length - 1);
    };
  };

  /* ---------- Deck: one insight at a time ---------- */
  const deck = sec => {
    const d = $('.deck', sec), n = $$('.deck li', sec).length, count = $('[data-deck]', sec);
    return p => {
      const i = Math.min(n - 1, Math.floor(clamp((p - .06) / .86, 0, .999) * n));
      d.style.setProperty('--d', i);
      count.textContent = String(i + 1).padStart(2, '0');
    };
  };

  /* ---------- Swap: crossed-out → replacement ---------- */
  const swap = sec => {
    const items = $$('.swaps > li', sec).map(n => ({ n, a: +n.dataset.from, b: +n.dataset.to }));
    return p => items.forEach(({ n, a, b }) => {
      n.classList.toggle('on', p >= a && p < b);
      n.classList.toggle('flip', p >= a + (Math.min(b, 1) - a) * .32);
    });
  };

  /* ---------- Camera over the real artifact ---------- */
  const cam = sec => {
    const keys = JSON.parse(sec.dataset.cam);
    const inner = $('.cam__inner', sec), img = $('.cam__img', sec), stage = $('.stage', sec), lines = timed(sec);
    const ar = +img.getAttribute('width') / +img.getAttribute('height');
    let bw = 0, bh = 0, W = 0, H = 0, zk = 1;
    measurers.push(() => {
      W = stage.clientWidth; H = stage.clientHeight;
      bw = Math.min(W * .86, H * .72 * ar); bh = bw / ar; zk = W < 760 ? 1.6 : 1;
      inner.style.width = bw + 'px'; inner.style.height = bh + 'px';
    });
    return p => {
      lines(p);
      let i = 0; while (i < keys.length - 2 && p > keys[i + 1][0]) i++;
      const [p0, s0, x0, y0] = keys[i], [p1, s1, x1, y1] = keys[i + 1];
      const t = easeIO(clamp((p - p0) / Math.max(p1 - p0, 1e-4), 0, 1));
      let s = lerp(s0, s1, t); if (s > 1.05) s = 1 + (s - 1) * zk;
      const fx = lerp(x0, x1, t), fy = lerp(y0, y1, t);
      const tx = W / 2 - fx * bw * s, ty = H * (s > 1.3 ? .4 : .44) - fy * bh * s;
      inner.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
      inner.style.setProperty('--s', s.toFixed(3));
    };
  };

  /* ---------- Register ---------- */
  $$('[data-scene]').forEach(sec => {
    const k = sec.dataset.scene;
    if (k === 'title') add(sec, null, 'pass');
    else if (k === 'open') add(sec, timed(sec));
    else if (k === 'questions' || k === 'stairs') add(sec, steps(sec));
    else if (k === 'bars') add(sec, bars(sec));
    else if (k === 'strip') add(sec, strip(sec));
    else if (k === 'map') add(sec, map(sec));
    else if (k === 'deck') add(sec, deck(sec));
    else if (k === 'swap') add(sec, swap(sec));
    else if (k === 'cam') add(sec, cam(sec));
  });

  /* ---------- Case-file index ---------- */
  const index = $('.index'), links = $$('.index a');
  const chapters = links.map((a, i) => ({ a, els: $$(`[data-ch="${i}"]`), top: 0, end: 0 }));

  let vh = innerHeight;
  const measure = () => {
    vh = innerHeight;
    measurers.forEach(m => m());
    scenes.forEach(s => {
      const r = s.el.getBoundingClientRect();
      s.top = r.top + scrollY;
      if (s.mode === 'pin') s.len = Math.max(s.el.offsetHeight - vh, 1);
      else { s.top -= vh * .9; s.len = vh * .8; }
      s.p = -1;
    });
    chapters.forEach(c => {
      if (!c.els.length) return;
      c.top = c.els[0].getBoundingClientRect().top + scrollY;
      c.end = c.els[c.els.length - 1].getBoundingClientRect().bottom + scrollY;
    });
  };

  let ticking = false, cur = -2;
  const frame = () => {
    ticking = false;
    const sy = scrollY;
    let moving = false;
    for (const s of scenes) {
      const target = reduced ? 1 : clamp((sy - s.top) / s.len, 0, 1);
      let p = s.p < 0 || reduced ? target : lerp(s.p, target, .16);
      if (Math.abs(target - p) < .0006) p = target; else moving = true;
      if (p === s.p) continue;
      s.p = p;
      s.el.style.setProperty('--p', p.toFixed(4));
      if (s.update) s.update(p);
    }
    if (moving) kick();
    const mid = sy + vh * .5;
    let on = -1;
    chapters.forEach((c, i) => { if (mid >= c.top && mid < c.end) on = i; });
    index.classList.toggle('is-on', sy > vh * 1.6);
    if (on !== cur) {
      cur = on;
      links.forEach((a, i) => i === on ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current'));
    }
  };
  const kick = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', () => { measure(); kick(); });
  addEventListener('load', () => { measure(); kick(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); kick(); });
  measure(); kick();

  /* ---------- Lightbox + copy ---------- */
  const lb = $('.lightbox');
  if (lb && lb.showModal) {
    const img = $('img', lb); let opener = null;
    $$('[data-zoom]').forEach(b => b.addEventListener('click', () => { opener = b; img.src = b.dataset.src; img.alt = b.dataset.alt || ''; lb.showModal(); }));
    lb.addEventListener('click', e => { if (e.target === lb || e.target === img || e.target.closest('.lightbox__close')) lb.close(); });
    lb.addEventListener('close', () => opener && opener.focus());
  }
  const toast = $('.toast');
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    let msg = 'Email copied.';
    try { await navigator.clipboard.writeText(b.dataset.copy); } catch (e) { msg = b.dataset.copy; }
    toast.textContent = msg; toast.classList.add('is-on');
    clearTimeout(toast._t); toast._t = setTimeout(() => toast.classList.remove('is-on'), 2000);
  }));
})();
