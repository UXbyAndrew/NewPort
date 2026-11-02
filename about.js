/* "PAUSED" About page. No dependencies. */
(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const body = document.body;

  /* Toast */
  const toast = $('.toast');
  const say = msg => { toast.textContent = msg; toast.classList.add('on'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('on'), 2600); };

  /* Paused timer: real time since you arrived */
  const timer = $('[data-timer]'), t0 = Date.now();
  setInterval(() => {
    const s = Math.floor((Date.now() - t0) / 1000);
    timer.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }, 1000);

  /* Rail scrollspy + "100% explored" achievement */
  const links = $$('.rail a'), secs = $$('[data-sec]'), seen = new Set();
  let achieved = false;
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const k = e.target.dataset.sec;
    links.forEach(a => a.setAttribute('aria-current', String(a.dataset.k === k)));
    seen.add(k);
    if (!achieved && seen.size === secs.length) { achieved = true; setTimeout(() => say('Achievement: 100% explored. Most people skim the About page. Respect.'), 600); }
  }), { rootMargin: '-45% 0px -50% 0px' });
  secs.forEach(s => spy.observe(s));
  const go = dir => {
    const cur = links.findIndex(a => a.getAttribute('aria-current') === 'true');
    const n = links[Math.max(0, Math.min(links.length - 1, (cur < 0 ? -1 : cur) + dir))];
    $(n.getAttribute('href')).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  };

  /* Resume / pause */
  const capt = $('.resumed-cap');
  const setResumed = on => {
    body.classList.toggle('resumed', on);
    $$('[data-resume]').forEach(b => { if (b.classList.contains('hud__resume')) b.textContent = on ? 'II Pause' : '▶ Resume'; });
    capt.textContent = on ? 'Back in the world · Esc to pause' : '';
  };
  $$('[data-resume]').forEach(b => b.addEventListener('click', () => setResumed(!body.classList.contains('resumed'))));

  /* Keyboard: Q/E switch, Esc resume/pause, Konami */
  const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let kIdx = 0;
  addEventListener('keydown', e => {
    if (e.target.closest('input, textarea, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape') { setResumed(!body.classList.contains('resumed')); return; }
    if (!body.classList.contains('resumed') && !e.target.closest('[role="tablist"]')) {
      if (e.key === 'q' || e.key === 'Q') go(-1);
      if (e.key === 'e' || e.key === 'E') go(1);
    }
    kIdx = e.key === konami[kIdx] ? kIdx + 1 : (e.key === konami[0] ? 1 : 0);
    if (kIdx === konami.length) { kIdx = 0; say('Achievement unlocked: you know the code. Player 2 would be proud.'); }
  });

  /* Tablists (quests + codex) with arrow keys */
  const tablist = (list, onSelect) => {
    const tabs = $$('[role="tab"]', list);
    const select = (t, focus) => {
      tabs.forEach(x => { const on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; });
      if (focus) t.focus();
      onSelect(t, tabs.indexOf(t));
    };
    tabs.forEach(t => t.addEventListener('click', () => select(t)));
    list.addEventListener('keydown', e => {
      const i = tabs.indexOf(document.activeElement); if (i < 0) return;
      const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
      if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
      if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
    });
    return { select: i => select(tabs[i]), get count() { return tabs.length; } };
  };
  tablist($('.qlist'), t => $$('.qp').forEach(p => { p.hidden = p.id !== t.getAttribute('aria-controls'); }));

  /* Loadout: item description bar */
  const desc = $('#itemdesc');
  $$('.slot').forEach(s => {
    const show = () => { $$('.slot').forEach(x => x.classList.toggle('sel', x === s)); desc.innerHTML = `<b>${s.querySelector('span').textContent}</b>${s.dataset.desc}`; };
    s.addEventListener('mouseenter', show); s.addEventListener('focus', show); s.addEventListener('click', show);
  });

  /* Map: pins open postcards */
  const pins = $$('.pin'), map = $('.map');
  const closePins = () => { pins.forEach(p => p.classList.remove('sel')); $$('.pc').forEach(c => c.classList.remove('on')); };
  pins.forEach(p => {
    const card = $('#' + p.getAttribute('aria-describedby'));
    const open = () => {
      closePins(); p.classList.add('sel');
      const x = parseFloat(p.style.getPropertyValue('--x')), y = parseFloat(p.style.getPropertyValue('--y'));
      card.style.setProperty('--px', Math.min(Math.max(x, 14), 86) + '%');
      card.style.setProperty('--py', y + '%');
      card.classList.add('on');
    };
    p.addEventListener('mouseenter', open); p.addEventListener('focus', open); p.addEventListener('click', open);
  });
  map.addEventListener('mouseleave', closePins);
  // reveal one postcard when the map first arrives
  new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { pins[4].dispatchEvent(new Event('click')); o.disconnect(); } }), { threshold: .6 }).observe(map);

  /* Codex: RPG text box that types, skips, advances */
  const src = $$('.cx__src li'), q = $('[data-q]'), by = $('[data-by]'), box = $('[data-textbox]');
  let cx = 0, typing = null;
  const type = i => {
    cx = i;
    const text = src[i].textContent;
    by.textContent = '— ' + src[i].dataset.by;
    clearInterval(typing);
    if (reduced) { q.textContent = text; return; }
    let n = 0; q.textContent = '';
    typing = setInterval(() => { n += 2; q.textContent = text.slice(0, n); if (n >= text.length) { clearInterval(typing); typing = null; } }, 30);
  };
  const cxTabs = tablist($('.cx__tabs'), (t, i) => type(i));
  box.addEventListener('click', () => {
    if (typing) { clearInterval(typing); typing = null; q.textContent = src[cx].textContent; return; }
    cxTabs.select((cx + 1) % cxTabs.count);
  });
  new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { type(0); o.disconnect(); } }), { threshold: .5 }).observe(box);

  /* Party: copy email; memoji waves after three hovers */
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); say('Email copied to inventory.'); } catch (e) { say(b.dataset.copy); }
  }));
  const memoji = $('.memoji'); let hovers = 0;
  memoji.closest('.member').addEventListener('mouseenter', () => {
    if (++hovers % 3 === 0) { memoji.classList.remove('wave'); void memoji.offsetWidth; memoji.classList.add('wave'); }
  });
})();
