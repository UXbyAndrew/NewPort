/* About page interactions. No dependencies. */
(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const y = $('[data-year]'); if (y) y.textContent = new Date().getFullYear();

  // header border once scrolled
  const top = $('.top');
  addEventListener('scroll', () => top.classList.toggle('scrolled', scrollY > 8), { passive: true });

  // reveal + one-shot triggers
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    if (e.target.classList.contains('pr')) {
      // play each principle's demo once as it arrives (touch users can't hover)
      e.target.classList.add('demo');
      setTimeout(() => e.target.classList.remove('demo'), 1800);
    }
    io.unobserve(e.target);
  }), { threshold: .35 });
  $$('[data-r], .stamps, .tl, .pr').forEach(el => io.observe(el));

  // roles cycle, photo follows
  const roles = $$('.role'), photos = $$('.hero__media .ph');
  let i = 0;
  const show = n => {
    const prev = roles[i];
    prev.classList.remove('is-on'); prev.classList.add('is-out');
    setTimeout(() => prev.classList.remove('is-out'), 600);
    i = n; roles[i].classList.add('is-on');
    const img = +roles[i].dataset.img;
    photos.forEach((p, k) => p.classList.toggle('is-on', k === img));
  };
  if (!reduced && roles.length) {
    let t = setInterval(() => show((i + 1) % roles.length), 1900);
    $('.roles').addEventListener('mouseenter', () => { clearInterval(t); show((i + 1) % roles.length); t = setInterval(() => show((i + 1) % roles.length), 1900); });
  }

  // timeline rows toggle on tap
  $$('.tl__row').forEach(r => r.addEventListener('click', e => { if (!e.target.closest('a')) r.classList.toggle('open'); }));

  // quote deck: click to send the top card to the back
  const deck = $('[data-deck]');
  if (deck) {
    const cards = $$('.card', deck);
    let topI = 0;
    // CSS mod() isn't everywhere yet; compute stacking order in JS
    const layout = () => cards.forEach((c, k) => {
      const d = (k - topI + cards.length) % cards.length;
      c.style.transform = `translate(${d * 18}px, ${d * -16}px) rotate(${d * 2}deg) scale(${1 - d * .04})`;
      c.style.zIndex = 10 - d;
      c.setAttribute('aria-hidden', d ? 'true' : 'false');
    });
    const next = () => {
      const c = cards[topI];
      if (reduced) { topI = (topI + 1) % cards.length; layout(); return; }
      c.style.transform = 'translate(-60%, 20px) rotate(-14deg)'; c.style.opacity = '0';
      setTimeout(() => { c.style.opacity = ''; topI = (topI + 1) % cards.length; layout(); }, 380);
    };
    layout();
    cards.forEach(c => c.addEventListener('click', next));
    $('.deck__btn', deck).addEventListener('click', next);
  }
})();
