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

  /* ---------- The pipe: visitors flow past the page to the first path to products ---------- */
  // Width encodes share of visitors (exact). Exits are drawn at a single gate:
  // where people left on the page wasn't tracked, only that they left before a product listing.
  const SVGNS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, parent) => { const n = document.createElementNS(SVGNS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  const OLD = ['Hero', 'Benefits', 'How it works', 'Flavor explorer', 'Testimonials', 'Subscription', 'Store locator', 'FAQ'];
  const SLOTS_OLD = { 'Hero': 0, 'Benefits': 1, 'How it works': 2, 'Flavor explorer': 3, 'Testimonials': 4, 'Subscription': 5, 'Store locator': 6, 'FAQ': 7, 'Shop lanes': 1 };
  const SLOTS_NEW = { 'Hero': 0, 'Shop lanes': 1, 'Benefits': 2, 'How it works': 3, 'Flavor explorer': 4, 'Testimonials': 5, 'Subscription': 6, 'Store locator': 7, 'FAQ': 8 };
  const KIND = { 'Hero': 'edu', 'Benefits': 'edu', 'How it works': 'edu', 'Testimonials': 'edu', 'Flavor explorer': 'shop', 'Shop lanes': 'shop', 'Subscription': 'ltv', 'Store locator': 'util', 'FAQ': 'util' };
  const BEFORE = .5217, AFTER = .3742;

  const pipe = sec => {
    const after = sec.dataset.mode === 'after';
    const svg = $('.pipe__svg', sec), lines = timed(sec);
    const names = after ? [...OLD.slice(0, 1), 'Shop lanes', ...OLD.slice(1)] : OLD;
    let G = null, loadT = after || reduced ? 1 : 0;
    const build = () => {
      svg.innerHTML = '';
      const w = svg.clientWidth, h = svg.clientHeight;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      const narrow = w < 560;
      const C = Math.min(w, 760), L = (w - C) / 2;
      const g = { w, h, narrow,
        colX: L, colW: C * (narrow ? .34 : .3),
        px: L + C * (narrow ? .42 : .4), W: C * (narrow ? .2 : .18),
        exitX: L + C * .99, top: 34, bottom: h - 52 };
      g.slot = (g.bottom - g.top) / 9;
      const defs = mk('defs', {}, svg);
      const gr = mk('linearGradient', { id: 'ramp-' + (after ? 'b' : 'a'), x1: g.px, x2: g.exitX, y1: 0, y2: 0, gradientUnits: 'userSpaceOnUse' }, defs);
      mk('stop', { offset: '0', 'stop-color': '#ff6b5e', 'stop-opacity': '1' }, gr);
      mk('stop', { offset: '1', 'stop-color': '#ff6b5e', 'stop-opacity': '.35' }, gr);
      // page column
      g.secs = names.map(n => {
        const grp = mk('g', { class: 'ps ps--' + KIND[n] + (n === 'Shop lanes' ? ' ps--new' : '') }, svg);
        const r = mk('rect', { x: g.colX, width: g.colW, height: g.slot - 6, rx: 6 }, grp);
        const t = mk('text', { x: g.colX + 10, class: 'ps__t' }, grp); t.textContent = n;
        let tag = null;
        if (!after && (n === 'Benefits' || n === 'How it works')) { tag = mk('text', { x: g.colX + g.colW - 8, 'text-anchor': 'end', class: 'ps__tag' }, grp); tag.textContent = 'for the 20'; }
        return { n, grp, r, t, tag };
      });
      mk('text', { x: g.colX, y: 18, class: 'pl' }, svg).textContent = after ? (narrow ? 'Variant B' : 'Homepage · variant B') : (narrow ? 'Before' : 'Homepage · before');
      // audience band (separate encoding: never mixed into the drop-off)
      g.aud = mk('g', { class: 'aud' }, svg);
      mk('rect', { x: g.px, y: g.top - 22, width: g.W * .8, height: 8, rx: 2, class: 'aud__r' }, g.aud);
      mk('rect', { x: g.px + g.W * .8 + 2, y: g.top - 22, width: g.W * .2 - 2, height: 8, rx: 2, class: 'aud__n' }, g.aud);
      mk('text', { x: g.px, y: g.top - 28, class: 'aud__t' }, g.aud).textContent = narrow ? '80 returning · 20 new' : '80 returning · 20 new';
      // stream parts
      g.inlet = mk('rect', { x: g.px, width: g.W, class: 'st' }, svg);
      g.cont = mk('rect', { class: 'st' }, svg);
      g.gain = mk('rect', { class: 'st st--gain' }, svg);
      g.ramp = mk('path', { class: 'ramp', fill: 'none', stroke: `url(#ramp-${after ? 'b' : 'a'})` }, svg);
      g.flowIn = mk('line', { class: 'flow' }, svg);
      g.flowOut = mk('line', { class: 'flow' }, svg);
      g.flowRamp = mk('path', { class: 'flow flow--ramp', fill: 'none' }, svg);
      g.gate = mk('line', { class: 'gate', x1: g.colX - 6, x2: g.px + g.W + 10 }, svg);
      g.gateT = mk('text', { class: 'gate__t', x: g.px + g.W + 14 }, svg); g.gateT.textContent = 'first path to products';
      g.ghost = mk('line', { class: 'gate gate--ghost', x1: g.colX - 6, x2: g.px + g.W + 10 }, svg);
      g.rampT = mk('text', { class: 'ramp__t', 'text-anchor': 'end', x: g.exitX }, svg);
      g.rampS = mk('text', { class: 'ramp__s', 'text-anchor': 'end', x: g.exitX }, svg);
      g.plp = mk('rect', { class: 'plp', x: g.px - 6, y: g.bottom + 8, width: g.W + 12, height: 34, rx: 8 }, svg);
      g.plpT = mk('text', { class: 'plp__t', x: g.px + g.W / 2, y: g.bottom + 30, 'text-anchor': 'middle' }, svg);
      g.note = mk('text', { class: 'note', x: g.exitX, y: g.bottom + 30, 'text-anchor': 'end' }, svg);
      g.note.textContent = narrow ? 'exit point not tracked' : 'Exit point on the page not tracked · drawn at the gate';
      G = g;
    };
    measurers.push(build);
    // pour in on load so the first frame is alive
    if (!loadT) { const t0 = performance.now(); const tick = now => { loadT = clamp((now - t0) / 1400, 0, 1); if (G && sec._p !== undefined) draw(sec._p); if (loadT < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }

    const draw = p => {
      sec._p = p;
      lines(p);
      if (!G) return;
      const g = G;
      // section layout: after-mode re-flows old → new order
      const t = after ? easeIO(clamp((p - .04) / .26, 0, 1)) : 0;
      g.secs.forEach(s => {
        const a = SLOTS_OLD[s.n], b = SLOTS_NEW[s.n];
        let slot = after ? lerp(s.n === 'Shop lanes' ? 9 : a, b, t) : a;
        const y = g.top + slot * g.slot;
        s.r.setAttribute('y', y.toFixed(1));
        s.t.setAttribute('y', (y + g.slot / 2).toFixed(1));
        if (s.tag) { s.tag.setAttribute('y', (y + g.slot / 2).toFixed(1)); s.tag.classList.toggle('on', p >= .62); }
        if (s.n === 'Shop lanes') s.grp.style.opacity = t.toFixed(2);
      });
      const gateOld = g.top + 3 * g.slot - 3, gateNew = g.top + 1 * g.slot - 3;
      const gy = after ? lerp(gateOld, gateNew, t) : gateOld;
      // the stream pours to the gate
      const pour = after ? 1 : Math.max(loadT, clamp(p / .12, 0, 1));
      const inH = (gy - g.top) * pour;
      g.inlet.setAttribute('y', g.top); g.inlet.setAttribute('height', Math.max(inH, 0).toFixed(1));
      // split share
      let share;
      if (after) share = lerp(BEFORE, AFTER, easeIO(clamp((p - .34) / .26, 0, 1)));
      else share = BEFORE * easeIO(clamp((p - .16) / .18, 0, 1));
      const reached = pour >= 1;
      const contW = g.W * (1 - (after ? BEFORE : share));
      const below = reached ? 1 : 0;
      g.cont.setAttribute('x', g.px); g.cont.setAttribute('y', gy); g.cont.setAttribute('width', contW.toFixed(1)); g.cont.setAttribute('height', ((g.bottom - gy) * below).toFixed(1));
      // gain sliver (after only): the difference between variants, not the same people
      const gainW = after ? g.W * (BEFORE - share) : 0;
      g.gain.setAttribute('x', (g.px + contW).toFixed(1)); g.gain.setAttribute('y', gy); g.gain.setAttribute('width', Math.max(gainW, 0).toFixed(1)); g.gain.setAttribute('height', ((g.bottom - gy) * below).toFixed(1));
      // off-ramp: a band of exact width curving off to the right
      const rw = g.W * share, cx = g.px + g.W - rw / 2;
      const ey = gy + Math.min(110, (g.bottom - gy) * .55);
      const d = `M${cx.toFixed(1)} ${gy.toFixed(1)} C${cx.toFixed(1)} ${(gy + 60).toFixed(1)} ${(cx + 50).toFixed(1)} ${ey.toFixed(1)} ${(g.exitX - 4).toFixed(1)} ${ey.toFixed(1)}`;
      g.ramp.setAttribute('d', reached && rw > .5 ? d : 'M0 0');
      g.ramp.setAttribute('stroke-width', rw.toFixed(2));
      g.flowRamp.setAttribute('d', reached && rw > 6 ? d : 'M0 0');
      // flow texture
      const fx = g.px + g.W * .25;
      g.flowIn.setAttribute('x1', fx); g.flowIn.setAttribute('x2', fx); g.flowIn.setAttribute('y1', g.top); g.flowIn.setAttribute('y2', g.top + inH);
      g.flowOut.setAttribute('x1', g.px + contW * .4); g.flowOut.setAttribute('x2', g.px + contW * .4); g.flowOut.setAttribute('y1', gy); g.flowOut.setAttribute('y2', reached ? g.bottom : gy);
      // gate + labels
      [g.gate].forEach(l => { l.setAttribute('y1', gy); l.setAttribute('y2', gy); });
      g.gateT.setAttribute('y', gy - 8);
      g.gate.style.opacity = g.gateT.style.opacity = reached ? 1 : 0;
      g.ghost.setAttribute('y1', gateOld); g.ghost.setAttribute('y2', gateOld);
      g.ghost.style.opacity = after && t > .05 ? .6 : 0;
      const pct = (share * 100).toFixed(2);
      g.rampT.textContent = share > .001 ? `${pct}%` : '';
      g.rampS.textContent = share > .001 ? (g.narrow ? 'left first' : 'left before a product listing') : '';
      g.rampT.setAttribute('y', ey - 14); g.rampS.setAttribute('y', ey + rw / 2 + 18);
      g.plpT.textContent = share > .001 ? `Product listing · ${((1 - share) * 100).toFixed(2)}%` : 'Product listing';
      g.aud.style.opacity = (after || p >= .42) ? 1 : 0;
      g.note.style.opacity = share > .01 ? 1 : 0;
      svg.classList.toggle('show-gain', after && p >= .5);
    };
    return draw;
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
    else if (k === 'pipe') add(sec, pipe(sec));
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
