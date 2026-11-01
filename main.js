/* UXbyAndrew — interactions. No dependencies. */
(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const yearEl = $('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Split text into masked words ---------- */
  $$('[data-split]').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span class="wi" style="--d:${i}">${w}</span></span>`).join(' ');
  });

  /* Words for scroll-highlight paragraphs */
  $$('[data-highlight]').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map(w => `<span class="hw" aria-hidden="true">${w}</span>`).join(' ');
  });

  /* Stagger hero intro elements */
  $$('[data-intro]').forEach((el, i) => el.style.setProperty('--d', i));

  /* ---------- Testimonial marquee rows ---------- */
  const source = $$('[data-quote-source] .quote');
  const rows = $$('[data-quotes]');
  if (source.length && rows.length) {
    const half = Math.ceil(source.length / 2);
    const groups = [source.slice(0, half), source.slice(half)];
    rows.forEach((row, r) => {
      const items = groups[r] || source;
      for (let copy = 0; copy < 3; copy++) {
        const set = document.createElement('div');
        set.className = 'kind__set';
        if (copy > 0) set.setAttribute('aria-hidden', 'true');
        items.forEach(q => set.appendChild(q.cloneNode(true)));
        row.appendChild(set);
      }
    });
  }

  /* ---------- Loader → intro ---------- */
  const loader = $('.loader');
  const countEl = $('[data-loader-count]');
  let seen = false;
  try { seen = sessionStorage.getItem('uxba-seen') === '1'; } catch (e) { /* storage blocked */ }

  const startIntro = () => {
    root.classList.add('is-ready');
    if (loader) {
      loader.classList.add('is-done');
      setTimeout(() => loader.classList.add('is-gone'), 1100);
    }
    try { sessionStorage.setItem('uxba-seen', '1'); } catch (e) { /* ignore */ }
  };

  if (!loader || reduced || seen) {
    if (loader) loader.classList.add('is-gone');
    requestAnimationFrame(() => root.classList.add('is-ready'));
  } else {
    const t0 = performance.now();
    const dur = 1500;
    const tick = now => {
      const p = clamp((now - t0) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      countEl.textContent = Math.round(eased * 100);
      if (p < 1) requestAnimationFrame(tick);
      else setTimeout(startIntro, 180);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
  $$('[data-reveal], [data-split], .project').forEach(el => io.observe(el));

  /* ---------- Count-up numbers ---------- */
  const countIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const el = e.target;
      const to = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
      if (reduced) return;
      const t0 = performance.now(), dur = 1800;
      const step = now => {
        const p = clamp((now - t0) / dur, 0, 1);
        el.textContent = pre + Math.round(to * (1 - Math.pow(1 - p, 4))) + suf;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- Header behavior & active nav ---------- */
  const header = $('.header');
  const darkSections = $$('.marquee, .impact, .process, .contact');
  const navLinks = $$('.nav a');
  const sections = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);

  /* ---------- Scroll-driven frame loop ---------- */
  const progress = $('.progress');
  const marquee = $('[data-marquee]');
  const quoteRows = rows;
  const projects = $$('.project');
  const highlights = $$('[data-highlight]');
  const parallaxEls = $$('[data-parallax]');
  const proc = $('.process');
  const procTrack = $('.process__track');
  const procBar = $('.process__head');
  const steps = $$('.step');
  const contactTitle = $('[data-contact-title]');

  projects.forEach((p, i) => p.style.setProperty('--n', i));

  // Duplicate marquee content for a seamless loop
  if (marquee) {
    const g = marquee.firstElementChild;
    for (let i = 0; i < 3; i++) { const c = g.cloneNode(true); c.setAttribute('aria-hidden', 'true'); marquee.appendChild(c); }
  }

  let lastY = scrollY, velocity = 0, mqX = 0;
  const rowX = quoteRows.map(() => 0);
  const hoverPaused = quoteRows.map(() => false);
  quoteRows.forEach((row, i) => {
    row.addEventListener('mouseenter', () => { hoverPaused[i] = true; });
    row.addEventListener('mouseleave', () => { hoverPaused[i] = false; });
  });

  const isWide = () => innerWidth > 760;

  const frame = () => {
    const y = scrollY;
    const vh = innerHeight;
    const dy = y - lastY;
    lastY = y;
    velocity = lerp(velocity, dy, 0.12);

    // progress bar
    const max = document.documentElement.scrollHeight - vh;
    progress.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);

    // header: hide on scroll down, show on up; dark mode over dark sections
    header.classList.toggle('is-scrolled', y > 24);
    if (Math.abs(dy) > 2 && y > vh * 0.6) header.classList.toggle('is-hidden', dy > 0);
    if (y < vh * 0.6) header.classList.remove('is-hidden');
    const probe = 30;
    const onDark = darkSections.some(s => { const r = s.getBoundingClientRect(); return r.top <= probe && r.bottom >= probe; });
    header.classList.toggle('on-dark', onDark);

    // active nav
    let active = null;
    sections.forEach((s, i) => { const r = s.getBoundingClientRect(); if (r.top < vh * 0.4 && r.bottom > vh * 0.4) active = i; });
    navLinks.forEach((a, i) => a.classList.toggle('is-active', i === active));

    if (!reduced) {
      // marquee reacts to scroll velocity
      if (marquee) {
        const w = marquee.firstElementChild.offsetWidth;
        mqX -= 0.6 + Math.abs(velocity) * 0.35;
        if (-mqX >= w) mqX += w;
        marquee.style.transform = `translate3d(${mqX}px,0,0) skewX(${clamp(-velocity * 0.15, -8, 8)}deg)`;
      }
      quoteRows.forEach((row, i) => {
        const set = row.firstElementChild; if (!set) return;
        const w = set.offsetWidth;
        if (!hoverPaused[i]) rowX[i] -= (0.35 + Math.abs(velocity) * 0.12);
        if (-rowX[i] >= w) rowX[i] += w;
        // even rows drift left, odd rows drift right
        const x = i % 2 ? -w - rowX[i] : rowX[i];
        row.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
      });

      // stacked project cards scale back as the next one covers them
      if (isWide()) {
        projects.forEach((p, i) => {
          const next = projects[i + 1];
          const link = p.firstElementChild;
          if (!next) { link.style.setProperty('--s', 1); link.style.setProperty('--b', 1); return; }
          const a = p.getBoundingClientRect();
          const b = next.getBoundingClientRect();
          const t = clamp(1 - (b.top - a.top) / Math.max(a.height, 1), 0, 1);
          link.style.setProperty('--s', (1 - t * 0.06).toFixed(4));
          link.style.setProperty('--b', (1 - t * 0.35).toFixed(4));
        });
      }

      // parallax images
      parallaxEls.forEach(el => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const c = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.transform = `translate3d(0, ${(-c * (+el.dataset.parallax || 0.1) * 100).toFixed(2)}%, 0)`;
      });

      // contact title drifts apart as it enters
      if (contactTitle) {
        const r = contactTitle.getBoundingClientRect();
        const t = clamp(1 - r.top / vh, 0, 1);
        const [a, b] = contactTitle.children;
        a.style.transform = `translateX(${((1 - t) * -6).toFixed(2)}vw)`;
        b.style.transform = `translateX(${((1 - t) * 6).toFixed(2)}vw)`;
      }
    }

    // scroll-highlighted words
    highlights.forEach(el => {
      const r = el.getBoundingClientRect();
      const t = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0, 1);
      const words = el.children, n = words.length, lit = Math.round(t * n);
      for (let i = 0; i < n; i++) words[i].classList.toggle('on', reduced || i < lit);
    });

    // pinned horizontal process
    if (proc && procTrack) {
      if (isWide()) {
        const r = proc.getBoundingClientRect();
        const total = proc.offsetHeight - vh;
        const t = clamp(-r.top / Math.max(total, 1), 0, 1);
        const dist = Math.max(procTrack.scrollWidth - innerWidth, 0);
        procTrack.style.transform = `translate3d(${(-t * dist).toFixed(1)}px,0,0)`;
        procBar.style.setProperty('--pp', t.toFixed(4));
        const activeIdx = Math.min(Math.floor(t * 4.2), 3);
        steps.forEach((s, i) => s.classList.toggle('is-active', i === activeIdx));
      } else {
        procTrack.style.transform = '';
        steps.forEach(s => {
          const r = s.getBoundingClientRect();
          s.classList.toggle('is-active', r.top < vh * 0.6 && r.bottom > vh * 0.3);
        });
      }
    }

    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  /* ---------- Hero fan follows the pointer ---------- */
  const fan = $('[data-fan]');
  if (fan && finePointer && !reduced) {
    let tx = 0, ty = 0, cx = 0, cy = 0;
    addEventListener('pointermove', e => {
      tx = (e.clientX / innerWidth - 0.5) * 2;
      ty = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
    const loop = () => {
      cx = lerp(cx, tx, 0.06); cy = lerp(cy, ty, 0.06);
      fan.style.setProperty('--mx', cx.toFixed(3));
      fan.style.setProperty('--my', cy.toFixed(3));
      requestAnimationFrame(loop);
    };
    loop();
  }

  /* ---------- Custom cursor ---------- */
  const cursor = $('.cursor');
  if (cursor && finePointer && !reduced) {
    root.classList.add('has-cursor');
    const label = $('.cursor__label', cursor);
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; }, { passive: true });
    const loop = () => {
      cx = lerp(cx, x, 0.22); cy = lerp(cy, y, 0.22);
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('pointerover', e => {
      const labelled = e.target.closest('[data-cursor]');
      cursor.classList.toggle('is-label', !!labelled);
      if (labelled) label.textContent = labelled.dataset.cursor;
    });
    document.addEventListener('pointerleave', () => cursor.style.opacity = 0);
    document.addEventListener('pointerenter', () => cursor.style.opacity = 1);
  }

  /* ---------- Magnetic elements ---------- */
  if (finePointer && !reduced) {
    $$('[data-magnetic]').forEach(el => {
      const strength = el.classList.contains('orb') ? 0.35 : 0.25;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${mx * strength}px, ${my * strength}px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = 'transform .7s cubic-bezier(.22,1,.36,1), background .3s, color .3s';
        el.style.transform = '';
        setTimeout(() => { el.style.transition = ''; }, 700);
      });
    });
  }

  /* ---------- Rotating hero word ---------- */
  const rot = $('[data-rotator]');
  if (rot && !reduced) {
    const items = [...rot.children];
    let idx = 0;
    setTimeout(() => setInterval(() => {
      const cur = items[idx];
      idx = (idx + 1) % items.length;
      const nxt = items[idx];
      cur.classList.remove('is-on'); cur.classList.add('is-out');
      nxt.classList.remove('is-out'); nxt.classList.add('is-on');
      setTimeout(() => {
        // park the old word below without animating it back through view
        cur.style.transition = 'none';
        cur.classList.remove('is-out');
        void cur.offsetWidth;
        cur.style.transition = '';
      }, 950);
    }, 2600), 1800);
  }

  /* ---------- Nav text roll ---------- */
  $$('.nav a').forEach(a => {
    const t = a.textContent.trim();
    a.innerHTML = `<span class="roll" data-text="${t}">${t}</span>`;
  });

  /* ---------- Wordmark letters ---------- */
  $$('.wm').forEach(wm => {
    wm.innerHTML = [...wm.textContent].map(ch => `<span class="wl">${ch}</span>`).join('');
  });

  /* Fit the wordmark edge to edge, whatever font actually loads */
  const wordmark = $('.wordmark');
  const fitWordmark = () => {
    if (!wordmark) return;
    wordmark.style.fontSize = '';
    const base = parseFloat(getComputedStyle(wordmark).fontSize);
    const inner = [...wordmark.children].reduce((w, el) => w + el.getBoundingClientRect().width, 0);
    const avail = wordmark.clientWidth - 2 * Math.min(innerWidth * 0.02, 24);
    if (inner > 0) wordmark.style.fontSize = Math.min(base * avail / inner, 300).toFixed(1) + 'px';
  };
  fitWordmark();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWordmark);
  let fitTimer;
  addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(fitWordmark, 150); });

  /* ---------- Hero glow follows pointer; case images tilt ---------- */
  if (finePointer && !reduced) {
    const glow = $('.hero__glow');
    const hero = $('.hero');
    if (glow && hero) {
      let gx = innerWidth * 0.75, gy = innerHeight * 0.45, tx = gx, ty = gy;
      hero.addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect();
        tx = e.clientX - r.left; ty = e.clientY - r.top;
      });
      const loop = () => {
        gx = lerp(gx, tx, 0.05); gy = lerp(gy, ty, 0.05);
        glow.style.setProperty('--gx', gx.toFixed(1) + 'px');
        glow.style.setProperty('--gy', gy.toFixed(1) + 'px');
        requestAnimationFrame(loop);
      };
      loop();
    }
    $$('.project__link').forEach(link => {
      const media = $('.project__media', link);
      link.addEventListener('pointermove', e => {
        const r = media.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        media.style.setProperty('--tx', (x * 8).toFixed(2) + 'deg');
        media.style.setProperty('--ty', (y * -8).toFixed(2) + 'deg');
      });
      link.addEventListener('pointerleave', () => {
        media.style.setProperty('--tx', '0deg');
        media.style.setProperty('--ty', '0deg');
      });
    });
  }

  /* ---------- Copy email ---------- */
  const toast = $('.toast');
  let toastTimer;
  const showToast = msg => {
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2200);
  };
  $$('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      showToast('Email copied. Talk soon!');
    } catch (e) {
      showToast(btn.dataset.copy);
    }
  }));
})();
