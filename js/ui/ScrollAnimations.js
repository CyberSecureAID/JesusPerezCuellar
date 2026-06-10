/*
  ============================================================
  CYBER PORTFOLIO — F15 · js/ui/ScrollAnimations.js
  ============================================================
  ESTADO: ✅ COMPLETADO
  VERSIÓN: 1.0.0
  FASE: 5 de 8

  DESCRIPCIÓN:
    Animaciones activadas por scroll usando IntersectionObserver.
    Gestiona: reveal de elementos (fade-up / fade-in), contadores
    animados en hero y blockchain, llenado de skill bars,
    parallax sutil en secciones, y marcado activo de nav links.

  DEPENDENCIAS:
    → index.html (F01) — data-animate, data-count, data-width
    → css/components.css (F12) — clases .is-visible, .is-counting
    → css/layout.css (F11) — .nav-link.is-active

  FEATURES:
    · IntersectionObserver para todos los elementos [data-animate]
    · Contadores animados: hero stats (data-count) y blockchain
    · Skill bars: lee data-width y anima width via CSS transition
    · Parallax: desplazamiento vertical sutil en secciones de fondo
    · Nav activa: resalta el link del nav correspondiente a la
      sección visible, basado en scroll position
    · Navbar scrolled: añade .navbar--scrolled al pasar 60px
    · Stagger automático para grids de cards
    · Soporte completo de reduced-motion

  API PÚBLICA:
    ScrollAnimations.init()
    ScrollAnimations.refresh()    → re-observa elementos nuevos
    ScrollAnimations.pause()
    ScrollAnimations.resume()
    ScrollAnimations.isReady()    → boolean
    ScrollAnimations.destroy()

  INTEGRACIÓN:
    Descomentar en index.html:
      <script src="js/ui/ScrollAnimations.js"></script>
    Añadir a la secuencia de init:
      ScrollAnimations.init();

  PRÓXIMO ARCHIVO: F16 · js/ui/GlitchEffect.js
  ============================================================
*/

'use strict';

const ScrollAnimations = (() => {

  /* ── Estado ─────────────────────────────────────────────── */
  let _ready         = false;
  let _paused        = false;
  let _reducedMotion = false;
  let _rafId         = null;

  /* IntersectionObservers */
  let _revealObserver  = null;
  let _counterObserver = null;
  let _skillObserver   = null;
  let _sectionObserver = null;

  /* Referencias cacheadas */
  let _navbar       = null;
  let _navLinks     = [];
  let _sections     = [];
  let _parallaxEls  = [];

  /* Flags de contadores (evita re-disparar) */
  const _counterDone = new WeakSet();
  const _skillDone   = new WeakSet();

  /* ── Helpers ─────────────────────────────────────────────── */
  function _qs(sel, root)  { return (root || document).querySelector(sel); }
  function _qsa(sel, root) { return [...(root || document).querySelectorAll(sel)]; }

  function _lerp(a, b, t) { return a + (b - a) * t; }

  function _clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  /* ── Easing out quart para contadores ───────────────────── */
  function _easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  /* ════════════════════════════════════════════════════════
     1. REVEAL — fade-up / fade-in
     Las clases CSS en components.css (F12) hacen la transición.
     Aquí solo añadimos .is-visible cuando el elemento entra.
  ════════════════════════════════════════════════════════ */
  function _initReveal() {
    const els = _qsa('[data-animate="fade-up"], [data-animate="fade-in"]');
    if (!els.length) return;

    /* En reduced-motion: hacer todos visibles de inmediato */
    if (_reducedMotion) {
      els.forEach(el => el.classList.add('is-visible'));
      return;
    }

    _revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting || _paused) return;
        entry.target.classList.add('is-visible');
        /* Una vez revelado, dejar de observar */
        _revealObserver.unobserve(entry.target);
      });
    }, {
      threshold:  0.12,
      rootMargin: '0px 0px -40px 0px',
    });

    els.forEach(el => _revealObserver.observe(el));
  }

  /* ════════════════════════════════════════════════════════
     2. CONTADORES ANIMADOS
     Elementos con data-count="N" se animan de 0 a N.
     Usado en hero stats y podría usarse en blockchain.
  ════════════════════════════════════════════════════════ */
  function _animateCounter(el) {
    if (_counterDone.has(el)) return;
    _counterDone.add(el);

    const target   = parseFloat(el.dataset.count) || 0;
    const isFloat  = String(target).includes('.');
    const duration = 1800; // ms
    const startTime = performance.now();

    /* Pulse CSS en el padre de blockchain */
    const card = el.closest('.blockchain-stat-card');
    if (card) card.classList.add('is-counting');

    function step(now) {
      const elapsed  = now - startTime;
      const progress = _clamp(elapsed / duration, 0, 1);
      const eased    = _easeOutQuart(progress);
      const current  = eased * target;

      el.textContent = isFloat
        ? current.toFixed(1)
        : Math.floor(current).toString();

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = isFloat ? target.toFixed(1) : target.toString();
        if (card) {
          setTimeout(() => card.classList.remove('is-counting'), 400);
        }
      }
    }

    requestAnimationFrame(step);
  }

  function _initCounters() {
    const els = _qsa('[data-count]');
    if (!els.length) return;

    if (_reducedMotion) {
      els.forEach(el => {
        el.textContent = el.dataset.count;
      });
      return;
    }

    _counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting || _paused) return;
        _animateCounter(entry.target);
        _counterObserver.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    els.forEach(el => _counterObserver.observe(el));
  }

  /* ════════════════════════════════════════════════════════
     3. SKILL BARS
     Lee data-width del elemento .skill-bar-fill y anima
     el width via la variable CSS --skill-fill-width.
  ════════════════════════════════════════════════════════ */
  function _animateSkillBar(el) {
    if (_skillDone.has(el)) return;
    _skillDone.add(el);

    const pct = parseFloat(el.dataset.width) || 80;
    el.style.setProperty('--skill-fill-width', pct + '%');
    el.classList.add('is-visible');
  }

  function _initSkillBars() {
    const bars = _qsa('.skill-bar-fill');
    if (!bars.length) return;

    if (_reducedMotion) {
      bars.forEach(el => {
        const pct = parseFloat(el.dataset.width) || 80;
        el.style.width = pct + '%';
      });
      return;
    }

    _skillObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting || _paused) return;
        _animateSkillBar(entry.target);
        _skillObserver.unobserve(entry.target);
      });
    }, { threshold: 0.4 });

    bars.forEach(el => _skillObserver.observe(el));
  }

  /* ════════════════════════════════════════════════════════
     4. NAV ACTIVA
     Marca el link de navegación cuya sección está visible
     con mayor área en el viewport.
  ════════════════════════════════════════════════════════ */
  function _initNavActive() {
    _navLinks = _qsa('.nav-link[data-section]');
    _sections = _navLinks.map(link => {
      return document.getElementById(link.dataset.section);
    }).filter(Boolean);

    if (!_sections.length) return;

    _sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (_paused) return;
        const id = entry.target.id;
        const link = _navLinks.find(l => l.dataset.section === id);
        if (!link) return;

        if (entry.isIntersecting) {
          /* Desactivar todos, activar el que entra */
          _navLinks.forEach(l => l.classList.remove('is-active'));
          link.classList.add('is-active');
        }
      });
    }, {
      threshold:  0.35,
      rootMargin: `-${_navbar ? _navbar.offsetHeight : 64}px 0px 0px 0px`,
    });

    _sections.forEach(sec => _sectionObserver.observe(sec));
  }

  /* ════════════════════════════════════════════════════════
     5. STAGGER AUTOMÁTICO PARA GRIDS
     Los hijos de grids reciben transition-delay incremental
     para que entren en cascada cuando el contenedor se revela.
  ════════════════════════════════════════════════════════ */
  function _initStagger() {
    const grids = _qsa('.services-grid, .projects-grid, .blockchain-stats');

    grids.forEach(grid => {
      const children = _qsa(
        '.service-card, .project-card, .blockchain-stat-card',
        grid
      );
      children.forEach((child, i) => {
        /* Solo aplicar si el elemento tiene data-animate propio
           o si el padre lo recibe via reveal */
        if (!child.hasAttribute('data-animate')) {
          child.setAttribute('data-animate', 'fade-up');
        }
        /* Delay incremental de 80ms por item */
        const existingDelay = parseFloat(
          getComputedStyle(child).transitionDelay
        ) * 1000 || 0;
        if (existingDelay === 0) {
          child.style.transitionDelay = `${i * 80}ms`;
        }
      });
    });
  }

  /* ════════════════════════════════════════════════════════
     6. PARALLAX SUTIL
     Desplazamiento vertical muy leve en secciones de fondo.
     Solo en desktop y solo si no hay reduced-motion.
  ════════════════════════════════════════════════════════ */
  function _initParallax() {
    if (_reducedMotion || window.innerWidth < 1024) return;

    _parallaxEls = _qsa('.section--about, .section--blockchain').map(el => ({
      el,
      speed: 0.06,
    }));
  }

  function _tickParallax() {
    if (_reducedMotion || _paused || !_parallaxEls.length) return;

    const scrollY = window.scrollY;

    _parallaxEls.forEach(({ el, speed }) => {
      const rect = el.getBoundingClientRect();
      /* Solo mover si está cerca del viewport */
      if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;

      const center    = rect.top + rect.height / 2 - window.innerHeight / 2;
      const offsetY   = center * speed;
      el.style.transform = `translateY(${offsetY.toFixed(2)}px)`;
    });
  }

  /* ════════════════════════════════════════════════════════
     7. NAVBAR SCROLL STATE
     Añade .navbar--scrolled cuando se pasa de 60px.
     (Duplica el listener inline del index.html pero aquí
      se centraliza y se puede pausar/destruir limpiamente.)
  ════════════════════════════════════════════════════════ */
  function _onScroll() {
    if (_paused) return;

    /* Navbar scrolled */
    if (_navbar) {
      _navbar.classList.toggle('navbar--scrolled', window.scrollY > 60);
    }

    /* Parallax */
    _tickParallax();
  }

  /* ════════════════════════════════════════════════════════
     8. REVEAL DE SECCIONES COMPLETAS (data-animate en section)
     Activa el reveal de los hijos cuando la sección entra.
  ════════════════════════════════════════════════════════ */
  function _initSectionReveal() {
    /* Las secciones tienen data-animate="fade-up" en el HTML.
       Queremos que sus hijos directos con clases animables
       también se revelen, no la sección entera (que ocupa
       todo el viewport). Aquí simplemente nos aseguramos
       de que los elementos hijos con [data-animate] sean
       observados por _revealObserver. */

    /* El _initReveal() ya cubre todos los [data-animate] del DOM.
       Esta función agrega los elementos de las secciones que no
       tienen data-animate propio pero deberían animarse. */

    const autoReveal = _qsa(
      '.section-eyebrow, .section-title, .section-subtitle, ' +
      '.about-text, .about-terminal, ' +
      '.skills-grid, .projects-filter, ' +
      '.contact-form-wrap, .contact-info, ' +
      '.blockchain-chains, .footer-container'
    );

    autoReveal.forEach((el, i) => {
      if (el.hasAttribute('data-animate')) return; // ya observado
      el.setAttribute('data-animate', 'fade-up');
      if (_reducedMotion) {
        el.classList.add('is-visible');
        return;
      }
      if (_revealObserver) _revealObserver.observe(el);
    });
  }

  /* ── Scroll listener con rAF throttle ──────────────────── */
  let _scrollPending = false;
  function _onScrollThrottled() {
    if (_scrollPending) return;
    _scrollPending = true;
    requestAnimationFrame(() => {
      _onScroll();
      _scrollPending = false;
    });
  }

  /* ── API PÚBLICA ─────────────────────────────────────────── */

  function init() {
    if (_ready) return;

    _reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener('change', e => { _reducedMotion = e.matches; });

    _navbar = document.getElementById('navbar');

    /* Stagger primero para que los data-animate estén listos */
    _initStagger();

    /* Reveal general */
    _initReveal();
    _initSectionReveal();

    /* Contadores */
    _initCounters();

    /* Skill bars */
    _initSkillBars();

    /* Nav activa */
    _initNavActive();

    /* Parallax */
    _initParallax();

    /* Scroll listener */
    window.addEventListener('scroll', _onScrollThrottled, { passive: true });

    /* Disparo inicial para estado al cargar */
    _onScroll();

    _ready = true;
    console.log('[ScrollAnimations] ✓ Animaciones de scroll activas.');
  }

  /**
   * Re-observa todos los elementos del DOM.
   * Útil si se añaden secciones dinámicamente.
   */
  function refresh() {
    if (!_ready) return;

    /* Desconectar observers actuales */
    [_revealObserver, _counterObserver, _skillObserver, _sectionObserver]
      .forEach(obs => obs && obs.disconnect());

    _revealObserver  = null;
    _counterObserver = null;
    _skillObserver   = null;
    _sectionObserver = null;

    /* Re-inicializar */
    _initStagger();
    _initReveal();
    _initSectionReveal();
    _initCounters();
    _initSkillBars();
    _initNavActive();
    _initParallax();

    console.log('[ScrollAnimations] Refresh completado.');
  }

  function pause()   { _paused = true; }
  function resume()  { _paused = false; }
  function isReady() { return _ready; }

  function destroy() {
    window.removeEventListener('scroll', _onScrollThrottled);

    [_revealObserver, _counterObserver, _skillObserver, _sectionObserver]
      .forEach(obs => obs && obs.disconnect());

    _revealObserver  = null;
    _counterObserver = null;
    _skillObserver   = null;
    _sectionObserver = null;
    _parallaxEls     = [];
    _navLinks        = [];
    _sections        = [];
    _navbar          = null;
    _ready           = false;

    console.log('[ScrollAnimations] Destruido.');
  }

  return {
    init,
    refresh,
    pause,
    resume,
    isReady,
    destroy,
  };

