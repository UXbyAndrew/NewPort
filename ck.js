/* Cirkul case study — scroll scenes. No dependencies.
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
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  $$('[data-r]').forEach(el => io.observe(el));

  const timed = el => {
    const items = $$('[data-from]', el).map(n => ({ n, a: +n.dataset.from, b: +n.dataset.to }));
    return p => items.forEach(it => it.n.classList.toggle('on', p >= it.a && p < it.b));
  };
  const scenes = [], measurers = [];
  const add = (el, update, mode = 'pin') => scenes.push({ el, update, mode, top: 0, len: 1, p: -1 });

  /* ---------- Kinetic numbers: one stat at a time, exact, never cross-tabbed ---------- */
  const numbers = sec => {
    const keys = JSON.parse(sec.dataset.keys), tones = JSON.parse(sec.dataset.tone), dec = +sec.dataset.dec;
    const after = sec.dataset.mode === 'after';
    const stage = $('.stage', sec), big = $('[data-big]', sec), fill = $('.meter__fill', sec), gain = $('.meter__gain', sec), lines = timed(sec);
    let loadT = after || reduced ? 1 : 0, lastP = 0;
    const valueAt = p => {
      let i = 0; while (i < keys.length - 2 && p > keys[i + 1][0]) i++;
      const [p0, v0] = keys[i], [p1, v1] = keys[i + 1];
      return lerp(v0, v1, easeIO(clamp((p - p0) / Math.max(p1 - p0, 1e-4), 0, 1)));
    };
    const draw = p => {
      lastP = p;
      lines(p);
      const v = valueAt(p) * (loadT < 1 ? easeOut(loadT) : 1);
      big.textContent = v.toFixed(dec);
      fill.style.setProperty('--fw', v.toFixed(3) + '%');
      let tone = tones[0][1]; tones.forEach(([a, t]) => { if (p >= a) tone = t; });
      stage.dataset.tone = tone;
      if (after) {
        const g = 52.17 - v;
        const m = $('.meter', sec);
        m.style.setProperty('--x', v.toFixed(3) + '%');
        m.style.setProperty('--w', g.toFixed(3) + '%');
        stage.classList.toggle('show-chip', p >= .6);
      }
      stage.classList.toggle('final', !after && p >= .78);
    };
    if (!loadT) {
      const t0 = performance.now() + 250;
      const tick = now => { loadT = clamp((now - t0) / 1300, 0, 1); draw(lastP); if (loadT < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }
    return draw;
  };

  /* ---------- Shipped: the stage lights up ---------- */
  const shipped = sec => p => {
    const t = easeIO(clamp(p / .4, 0, 1));
    sec.style.setProperty('--open', t.toFixed(4));
  };

  /* ---------- 02 · section reorder ---------- */
  const reorder = sec => {
    const items = $$('.ro__list--live li', sec), br = $('.ro__bracket', sec), lines = timed(sec);
    return p => {
      lines(p);
      const t = easeIO(clamp((p - .5) / .3, 0, 1));
      items.forEach(li => {
        li.style.setProperty('--y', lerp(+li.dataset.a, +li.dataset.b, t).toFixed(3));
        if (li.classList.contains('t-new')) li.style.setProperty('--o', t.toFixed(3));
      });
      br.style.setProperty('--bo', clamp((p - .8) / .08, 0, 1).toFixed(2));
    };
  };

  /* ---------- 03 · browser scroll-through ---------- */
  const browse = sec => {
    const view = $('.browser__view', sec), page = $('.browser__page', sec), rail = $('.browser', sec), lines = timed(sec);
    let dist = 0, stops = [];
    measurers.push(() => {
      dist = Math.max(page.scrollHeight - view.clientHeight, 0);
      const imgs = $$('img', page);
      stops = [0, Math.min(imgs[1].offsetTop, dist), dist];
    });
    // move between stops, holding on each while its caption reads
    return p => {
      lines(p);
      let y;
      if (p < .2) y = stops[0];
      else if (p < .36) y = lerp(stops[0], stops[1], easeIO((p - .2) / .16));
      else if (p < .56) y = stops[1];
      else if (p < .74) y = lerp(stops[1], stops[2], easeIO((p - .56) / .18));
      else y = stops[2];
      page.style.transform = `translate3d(0, ${(-y).toFixed(1)}px, 0)`;
      rail.style.setProperty('--sp', dist ? (y / dist).toFixed(3) : 0);
    };
  };

  /* ---------- 04 · scoreboard ---------- */
  const board = sec => {
    const rows = $$('.board__row[data-at]', sec).map(r => ({ r, a: +r.dataset.at, d: $('[data-to]', r), done: false }));
    const lines = timed(sec);
    const count = el => {
      const to = +el.dataset.to, dec = +(el.dataset.dec || 0), pre = el.dataset.pre || '', suf = el.dataset.suf || '';
      if (reduced) return;
      const t0 = performance.now();
      const step = now => {
        const k = clamp((now - t0) / 1000, 0, 1);
        el.textContent = pre + (to * easeOut(k)).toFixed(dec) + suf;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    return p => {
      lines(p);
      rows.forEach(o => {
        const on = p >= o.a;
        o.r.classList.toggle('on', on);
        if (on && !o.done) { o.done = true; count(o.d); }
        if (!on) o.done = false;
      });
    };
  };

  /* ---------- 05 · credits roll ---------- */
  const credits = sec => {
    const roll = $('.roll', sec), stage = $('.stage', sec);
    let dist = 0;
    measurers.push(() => { dist = Math.max(roll.offsetHeight - stage.clientHeight * .2, 0); });
    return p => { roll.style.transform = `translate3d(0, ${(-p * dist).toFixed(1)}px, 0)`; };
  };

  /* ---------- Title KPIs count up ---------- */
  const kpis = $('.kpis');
  if (kpis && !reduced) {
    const kio = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; kio.disconnect();
      $$('[data-kpi]', kpis).forEach((el, n) => {
        const to = +el.dataset.kpi, dec = +(el.dataset.dec || 0), t0 = performance.now() + n * 150;
        const step = now => { const k = clamp((now - t0) / 1100, 0, 1); el.textContent = el.dataset.pre + (to * easeOut(k)).toFixed(dec) + el.dataset.suf; if (k < 1) requestAnimationFrame(step); };
        el.textContent = el.dataset.pre + (0).toFixed(dec) + el.dataset.suf;
        requestAnimationFrame(step);
      });
    }), { threshold: .6 });
    kio.observe(kpis);
  }

  $$('[data-scene]').forEach(sec => {
    const k = sec.dataset.scene;
    if (k === 'title') add(sec, null, 'pass');
    else if (k === 'numbers') add(sec, numbers(sec));
    else if (k === 'shipped') add(sec, shipped(sec));
    else if (k === 'reorder') add(sec, reorder(sec));
    else if (k === 'browse') add(sec, browse(sec));
    else if (k === 'board') add(sec, board(sec));
    else if (k === 'credits') add(sec, credits(sec));
    else if (k === 'lessons') { const t = timed(sec), dots = $$('.lb__dots i', sec); add(sec, p => { t(p); dots.forEach((d, i) => d.classList.toggle('on', p >= [0, .34, .67][i])); }); }

  });

  /* ---------- Scene chip ---------- */
  const named = $$('[data-name]'), chipN = $('[data-scene-num]'), chipName = $('[data-scene-name]');
  let marks = [];
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
    marks = named.map(el => el.getBoundingClientRect().top + scrollY);
  };

  let ticking = false, curName = -1;
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
    let n = 0;
    marks.forEach((m, i) => { if (sy + vh * .5 >= m) n = i; });
    if (n !== curName) {
      curName = n;
      chipN.textContent = String(n + 1).padStart(2, '0');
      chipName.textContent = named[n].dataset.name;
    }
  };
  const kick = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', () => { measure(); kick(); });
  addEventListener('load', () => { measure(); kick(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); kick(); });
  measure(); kick();
})();
