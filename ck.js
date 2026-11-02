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

  /* ---------- 01 · 100 visitors ---------- */
  const crowd = sec => {
    const box = $('.crowd', sec), legend = $('.legend', sec), lines = timed(sec);
    let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const idx = [...Array(100).keys()];
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const lost = new Set(shuffle(idx.slice()).slice(0, 52));
    const isNew = new Set(shuffle(idx.slice()).slice(0, 20));
    const dots = idx.map(i => {
      const d = document.createElement('i');
      d.className = 'dot';
      d.style.setProperty('--i', i);
      d.dataset.fx = (rnd() * 2 - 1).toFixed(3);
      box.appendChild(d);
      return d;
    });
    let size = 0;
    measurers.push(() => { size = box.clientWidth; });
    return p => {
      lines(p);
      const cell = size / 10, pad = cell * .15;
      // .17–.36: 52 fall out of the frame; .36–.5: they come back; then colour by audience
      const fall = easeIO(clamp((p - .19) / .14, 0, 1)) * (1 - easeIO(clamp((p - .38) / .12, 0, 1)));
      const tint = p >= .4;
      dots.forEach((d, i) => {
        const x = (i % 10) * cell + pad, y = ((i / 10) | 0) * cell + pad;
        const f = lost.has(i) ? fall : 0;
        d.style.setProperty('--tx', x.toFixed(1) + 'px');
        d.style.setProperty('--ty', (y + f * cell * .5).toFixed(1) + 'px');
        d.style.opacity = f > 0.02 ? (1 - f * .72).toFixed(2) : '';
        d.classList.toggle('lost', f > .02);
        d.classList.toggle('ret', tint && !isNew.has(i));
        d.classList.toggle('new', p >= .56 && isNew.has(i));
        d.style.setProperty('--s', f > .02 ? (1 - f * .45).toFixed(2) : p >= .56 && !isNew.has(i) ? (p >= .76 ? '.55' : '.7') : '1');
      });
      legend.classList.toggle('on', p >= .4);
    };
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

  /* ---------- The 100, again: 52 → 37 ---------- */
  const again = sec => {
    const box = $('.crowd', sec), tally = $('[data-tally]', sec), lines = timed(sec);
    let seed = 9; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const order = [...Array(100).keys()];
    for (let i = 99; i > 0; i--) { const k = (rnd() * (i + 1)) | 0; [order[i], order[k]] = [order[k], order[i]]; }
    const lost = new Set(order.slice(0, 52)), saved = new Set(order.slice(0, 15));
    const dots = [...Array(100).keys()].map(i => {
      const d = document.createElement('i'); d.className = 'dot'; d.style.setProperty('--i', i);
      box.appendChild(d); return d;
    });
    let size = 0;
    measurers.push(() => {
      size = box.clientWidth;
      const cell = size / 10, pad = cell * .15;
      dots.forEach((d, i) => { d.style.setProperty('--tx', ((i % 10) * cell + pad).toFixed(1) + 'px'); d.style.setProperty('--ty', (((i / 10) | 0) * cell + pad).toFixed(1) + 'px'); });
    });
    return p => {
      lines(p);
      const drop = p >= .08, save = clamp((p - .32) / .3, 0, 1);
      const nSaved = Math.round(save * 15);
      let k = 0;
      dots.forEach((d, i) => {
        const isLost = drop && lost.has(i);
        let back = false;
        if (isLost && saved.has(i)) { back = k < nSaved; k++; }
        d.classList.toggle('lost', isLost && !back);
        d.classList.toggle('saved', back);
        d.style.setProperty('--s', isLost && !back ? '.55' : '1');
      });
      tally.textContent = drop ? 52 - nSaved : 52;
    };
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
    else if (k === 'crowd') add(sec, crowd(sec));
    else if (k === 'reorder') add(sec, reorder(sec));
    else if (k === 'browse') add(sec, browse(sec));
    else if (k === 'board') add(sec, board(sec));
    else if (k === 'credits') add(sec, credits(sec));
    else if (k === 'lessons') { const t = timed(sec), dots = $$('.lb__dots i', sec); add(sec, p => { t(p); dots.forEach((d, i) => d.classList.toggle('on', p >= [0, .34, .67][i])); }); }
    else if (k === 'again') add(sec, again(sec));
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
