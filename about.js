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
  frame();
})();
