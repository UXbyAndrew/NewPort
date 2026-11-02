/* About — reveals and gentle photo drift. No dependencies. */
(() => {
  document.documentElement.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const y = document.querySelector('[data-year]'); if (y) y.textContent = new Date().getFullYear();

  // header turns solid once past the opening photo
  const top = document.querySelector('.top'), open = document.querySelector('.open');
  const onScroll = () => top.classList.toggle('solid', scrollY > open.offsetHeight - 80);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('[data-r]').forEach(el => io.observe(el));

  // Beyond design: the line nearest the middle of the screen picks the photo
  const by = document.querySelector('[data-beyond]');
  if (by) {
    const items = [...by.querySelectorAll('.beyond__list li')], imgs = [...by.querySelectorAll('.beyond__photos img')], cap = by.querySelector('[data-cap]');
    const pick = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const li = e.target, i = +li.dataset.i;
      items.forEach(x => x.classList.toggle('on', x === li));
      imgs.forEach((im, k) => im.classList.toggle('on', k === i));
      cap.textContent = li.dataset.cap;
    }), { rootMargin: '-45% 0px -45% 0px' });
    items.forEach(li => pick.observe(li));
  }

  if (reduced) return;
  // photos drift a little slower than the page
  const drift = [...document.querySelectorAll('[data-drift]')];
  let ticking = false;
  const frame = () => {
    ticking = false;
    const vh = innerHeight;
    drift.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const c = (r.top + r.height / 2 - vh / 2) / vh;
      el.querySelector('img').style.setProperty('--dy', (c * -5).toFixed(2) + '%');
    });
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  // travel strip slides sideways while its section is pinned
  const tr = document.querySelector('[data-travel]'), strip = document.querySelector('[data-strip]');
  const slide = () => {
    if (!tr || innerWidth <= 860) return;
    const r = tr.getBoundingClientRect(), len = tr.offsetHeight - innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / Math.max(len, 1)));
    const dist = Math.max(strip.scrollWidth - innerWidth, 0);
    strip.style.transform = `translate3d(${(-p * dist).toFixed(1)}px,0,0)`;
  };
  addEventListener('scroll', () => requestAnimationFrame(slide), { passive: true });
  addEventListener('resize', slide);
  slide();
  frame();
})();
