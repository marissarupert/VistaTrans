// VistaTrans + Stream deck: scaling, navigation, popouts and the small
// motions (count-ups, the continuum route). No dependencies.
(() => {
  const stage = document.getElementById('stage');
  const slides = [...stage.querySelectorAll(':scope > .slide')];
  const layer = stage.querySelector('.popout-layer');
  const nav = document.querySelector('.deck-nav');
  const dots = nav.querySelector('.dots');
  const count = nav.querySelector('.count');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Fit the 1920×1080 stage to the window.
  const fit = () => {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.setProperty('--scale', s);
    stage.dataset.scale = s;
  };
  addEventListener('resize', fit);
  fit();

  // Count-ups: animate the first number in the text, keeping its prefix,
  // suffix, decimals and thousands separators, and end on the exact text.
  const countUp = (el) => {
    const text = el.dataset.final || (el.dataset.final = el.textContent);
    const m = text.match(/[\d,]*\d(?:\.\d+)?/);
    if (!m || reduced) { el.textContent = text; return; }
    const raw = m[0], target = parseFloat(raw.replace(/,/g, ''));
    const decimals = (raw.split('.')[1] || '').length, commas = raw.includes(',');
    const before = text.slice(0, m.index), after = text.slice(m.index + raw.length);
    const fmt = (v) => {
      let s = v.toFixed(decimals);
      if (commas) s = Number(s).toLocaleString('en-US', { minimumFractionDigits: decimals });
      return before + s + after;
    };
    const delay = parseFloat(getComputedStyle(el.closest('[style*="--d"]') || el).getPropertyValue('--d')) || 0;
    const start = performance.now() + delay * 1000, dur = 1400;
    el.textContent = fmt(0);
    cancelAnimationFrame(el._raf);
    const tick = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / dur));
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = t < 1 ? fmt(target * e) : text;
      if (t < 1) el._raf = requestAnimationFrame(tick);
    };
    el._raf = requestAnimationFrame(tick);
  };

  // Once the entrance has played, drop the stagger delays so hover states
  // respond straight away.
  const play = (root) => {
    root.classList.remove('play', 'settled');
    clearTimeout(root._settle);
    void root.offsetWidth; // restart transitions
    root.classList.add('play');
    root._settle = setTimeout(() => root.classList.add('settled'), 3200);
    root.querySelectorAll('[data-count]').forEach(countUp);
  };

  // Slides -------------------------------------------------------------------
  let index = -1, stopTimer;

  slides.forEach((s, i) => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', `${i + 1}. ${s.dataset.title}`);
    b.title = s.dataset.title;
    b.addEventListener('click', () => go(i));
    dots.append(b);
  });

  const wipe = stage.querySelector('.wipe');
  const progress = stage.querySelector('.progress');
  let wipeSwap, wipeEnd;

  // Change slide behind the wipe: the swap happens while the panel covers
  // the stage. Pressing again mid-wipe swaps straight away.
  function go(i, opts = {}) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (i === index) return;
    closePopout(true);
    if (index < 0 || reduced || opts.instant) return show(i, opts);
    clearTimeout(wipeSwap); clearTimeout(wipeEnd);
    wipe.classList.remove('go', 'back');
    void wipe.offsetWidth;
    wipe.classList.toggle('back', i < index);
    wipe.classList.add('go');
    const target = i;
    wipeSwap = setTimeout(() => show(target, opts), 380);
    wipeEnd = setTimeout(() => wipe.classList.remove('go', 'back'), 950);
    pending = target;
  }
  let pending = -1;

  function show(i, { fromHash = false } = {}) {
    pending = -1;
    if (i === index) return;
    const prev = slides[index];
    if (prev) {
      prev.classList.remove('current');
      const p = prev;
      clearTimeout(stopTimer);
      stopTimer = setTimeout(() => p !== slides[index] && p.classList.remove('play'), 650);
    }
    index = i;
    const s = slides[i];
    s.classList.add('current');
    play(s);
    [...dots.children].forEach((d, n) => d.setAttribute('aria-current', n === i));
    count.textContent = `${i + 1} / ${slides.length}`;
    progress.style.setProperty('--p', (i + 1) / slides.length);
    if (!fromHash) history.replaceState(null, '', '#' + s.id);
  }
  const cur = () => (pending >= 0 ? pending : index);
  const next = () => (openPopoutEl ? null : go(cur() + 1));
  const prev = () => (openPopoutEl ? null : go(cur() - 1));

  // Popouts -----------------------------------------------------------------
  let openPopoutEl = null, opener = null;

  function openPopout(id, from) {
    const pop = document.getElementById(id);
    if (!pop) return;
    const about = document.getElementById('about-stream');
    if (slides[index] !== about) go(slides.indexOf(about), { instant: true });
    // Grow out of the link that opened it.
    if (from) {
      const r = from.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      const k = 1920 / sr.width;
      pop.style.setProperty('--tx', `${(r.left - sr.left) * k}px`);
      pop.style.setProperty('--ty', `${(r.top - sr.top) * k}px`);
    }
    opener = from || null;
    layer.hidden = false;
    pop.hidden = false;
    openPopoutEl = pop;
    void pop.offsetWidth;
    layer.classList.add('open');
    play(pop.querySelector('.slide'));
    if (pop.id === 'development') runContinuum(pop);
    pop.querySelector('.popout-close').focus({ preventScroll: true });
    history.replaceState(null, '', '#' + id);
  }

  function closePopout(instant) {
    if (!openPopoutEl) return;
    const pop = openPopoutEl;
    openPopoutEl = null;
    layer.classList.remove('open');
    const done = () => {
      if (openPopoutEl === pop) return;
      pop.hidden = true;
      pop.querySelector('.slide').classList.remove('play');
      if (!openPopoutEl) layer.hidden = true;
    };
    if (instant || reduced) done(); else setTimeout(done, 550);
    if (!instant) {
      history.replaceState(null, '', '#' + slides[index].id);
      opener?.focus({ preventScroll: true });
    }
  }

  stage.querySelectorAll('[data-popout]').forEach((b) =>
    b.addEventListener('click', (e) => { e.stopPropagation(); openPopout(b.dataset.popout, b); })
  );
  // Flip between the two popouts without closing.
  const switchPopout = (id) => {
    if (!openPopoutEl || openPopoutEl.id === id) return;
    const from = openPopoutEl;
    from.hidden = true;
    from.querySelector('.slide').classList.remove('play');
    const pop = document.getElementById(id);
    pop.style.setProperty('--tx', '96px'); pop.style.setProperty('--ty', '54px');
    pop.hidden = false;
    openPopoutEl = pop;
    play(pop.querySelector('.slide'));
    if (id === 'development') runContinuum(pop);
    pop.querySelector('.popout-close').focus({ preventScroll: true });
    history.replaceState(null, '', '#' + id);
  };
  layer.querySelectorAll('[data-popout-to]').forEach((b) => b.addEventListener('click', () => switchPopout(b.dataset.popoutTo)));
  const otherPopout = () => [...layer.querySelectorAll('.popout')].find((p) => p !== openPopoutEl)?.id;

  layer.querySelector('.popout-backdrop').addEventListener('click', () => closePopout());
  layer.querySelectorAll('.popout-close').forEach((b) => b.addEventListener('click', () => closePopout()));

  // Continuum of service: the route draws from the top, and each step lights
  // up as the line reaches it. Hover or focus a step to pick it out.
  function runContinuum(pop) {
    const wrap = pop.querySelector('.continuum');
    const path = wrap.querySelector('.route');
    const len = path.getTotalLength();
    const draw = reduced ? 0 : 3.2, start = 0.6;
    const steps = [...wrap.querySelectorAll('.step')];
    steps.forEach((st) => {
      const x = +getComputedStyle(st).getPropertyValue('--x'), y = +getComputedStyle(st).getPropertyValue('--y');
      if (!st._at) {
        let best = 0, bestD = Infinity;
        for (let l = 0; l <= len; l += 4) {
          const p = path.getPointAtLength(l), d = (p.x - x) ** 2 + (p.y - y) ** 2;
          if (d < bestD) { bestD = d; best = l; }
        }
        st._at = best / len;
      }
      st.style.setProperty('--sd', `${start + st._at * draw}s`);
    });
    path.style.transition = 'none';
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = reduced ? 0 : len;
    void path.getBoundingClientRect();
    path.style.transition = `stroke-dashoffset ${draw}s linear ${start}s`;
    path.style.strokeDashoffset = 0;
  }
  stage.querySelectorAll('.continuum').forEach((wrap) => {
    const set = (st) => {
      wrap.classList.toggle('hovering', !!st);
      wrap.querySelectorAll('.step').forEach((s) => s.classList.toggle('on', s === st));
    };
    wrap.querySelectorAll('.step').forEach((st) => {
      st.addEventListener('mouseenter', () => set(st));
      st.addEventListener('focus', () => set(st));
      st.addEventListener('mouseleave', () => set(null));
      st.addEventListener('blur', () => set(null));
    });
  });

  // Building profiles: light up the column and row under the pointer.
  stage.querySelectorAll('.bp').forEach((bp) => {
    bp.addEventListener('mouseover', (e) => {
      const el = e.target.closest('[data-col], [data-row]');
      bp.dataset.hc = el?.dataset.col ?? '';
      bp.dataset.hr = el?.dataset.row ?? '';
    });
    bp.addEventListener('mouseleave', () => { bp.dataset.hc = ''; bp.dataset.hr = ''; });
  });

  // Input -------------------------------------------------------------------
  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (openPopoutEl) {
      if (e.key === 'Escape') { e.preventDefault(); closePopout(); }
      else if (['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); switchPopout(otherPopout()); }
      return;
    }
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ':
        if (e.key === ' ' && e.target.closest('button')) return;
        e.preventDefault(); next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
        e.preventDefault(); prev(); break;
      case 'Home': go(0); break;
      case 'End': go(slides.length - 1); break;
      case 'f': case 'F': toggleFullscreen(); break;
    }
  });

  nav.querySelector('.next').addEventListener('click', next);
  nav.querySelector('.prev').addEventListener('click', prev);
  nav.querySelector('.fs').addEventListener('click', toggleFullscreen);
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }

  // Swipe on touch screens.
  let touch = null;
  addEventListener('touchstart', (e) => { touch = e.touches[0]; }, { passive: true });
  addEventListener('touchend', (e) => {
    if (!touch || openPopoutEl) return;
    const t = e.changedTouches[0], dx = t.clientX - touch.clientX, dy = t.clientY - touch.clientY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 50) (Math.abs(dx) > Math.abs(dy) ? dx : dy) < 0 ? next() : prev();
    touch = null;
  });

  // Photos drift a few pixels against the pointer.
  addEventListener('mousemove', (e) => {
    if (reduced) return;
    const x = (e.clientX / innerWidth - .5) * -24, y = (e.clientY / innerHeight - .5) * -14;
    stage.querySelectorAll('.slide.current .photo-wrap').forEach((w) => {
      w.style.setProperty('--px', x + 'px'); w.style.setProperty('--py', y + 'px');
    });
  });

  // Show the slide controls while the mouse moves, hide them when it rests.
  let idle;
  addEventListener('mousemove', () => {
    document.body.classList.add('show-nav');
    clearTimeout(idle);
    idle = setTimeout(() => document.body.classList.remove('show-nav'), 2200);
  });

  // Deep links: #slide-id, or a popout id to open it over About Stream.
  const fromHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    const i = slides.findIndex((s) => s.id === id);
    if (document.getElementById(id)?.classList.contains('popout')) {
      go(slides.findIndex((s) => s.id === 'about-stream'), { fromHash: true, instant: true });
      openPopout(id);
    } else go(i < 0 ? 0 : i, { fromHash: true, instant: index < 0 });
  };
  addEventListener('hashchange', fromHash);
  document.fonts.ready.then(fromHash);
})();
