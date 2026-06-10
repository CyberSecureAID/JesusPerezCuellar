/*
  ============================================================
  CYBER PORTFOLIO — F19 · js/sections/ProjectsSection.js
  ============================================================
  ESTADO: ✅ COMPLETADO
  VERSIÓN: 1.0.0
  FASE: 6 de 8

  DESCRIPCIÓN:
    Interactividad de la sección de proyectos.
    Filtro por categoría con animación de grid,
    y scroll horizontal en mobile.

  DEPENDENCIAS:
    → index.html (F01) — .project-card, [data-category],
      .filter-btn, [data-filter], #projects-grid
    → css/components.css (F12) — .is-visible, [data-animate]
    → css/layout.css (F11)    — .projects-grid, .filter-btn--active

  FEATURES:
    · Filtro por categoría: muestra/oculta cards con fade + scale
    · Animación de reflow: las cards visibles se redistribuyen
      suavemente sin saltos de layout (técnica FLIP)
    · Botones de filtro con estado .filter-btn--active
    · Scroll horizontal automático en mobile (<768px) para el
      contenedor de filtros
    · Contador de proyectos visible por categoría
    · Accesibilidad: role="tablist/tab", aria-selected,
      aria-live en el grid para lectores de pantalla
    · Reduced-motion: sin transiciones, cambio instantáneo

  API PÚBLICA:
    ProjectsSection.init()
    ProjectsSection.filter(category)   → aplica filtro
    ProjectsSection.getActive()        → string categoría activa
    ProjectsSection.pause()
    ProjectsSection.resume()
    ProjectsSection.isReady()          → boolean
    ProjectsSection.destroy()

  INTEGRACIÓN:
    Descomentar en index.html:
      <script src="js/sections/ProjectsSection.js"></script>
    Añadir a la secuencia de init:
      ProjectsSection.init();
  ============================================================
*/

'use strict';

const ProjectsSection = (() => {

  /* ── Estado ─────────────────────────────────────────────── */
  let _ready         = false;
  let _paused        = false;
  let _reducedMotion = false;
  let _activeFilter  = 'all';
  let _isAnimating   = false;

  /* Referencias DOM */
  let _grid        = null;
  let _cards       = [];
  let _filterBtns  = [];

  /* ── Helpers ─────────────────────────────────────────────── */
  function _qs(sel, root)  { return (root || document).querySelector(sel); }
  function _qsa(sel, root) { return [...(root || document).querySelectorAll(sel)]; }

  /* ════════════════════════════════════════════════════════
     FILTRO CON ANIMACIÓN FLIP
     FLIP: First, Last, Invert, Play
     Captura posiciones antes y después del cambio de layout,
     luego anima las diferencias para evitar saltos bruscos.
  ════════════════════════════════════════════════════════ */

  /* Captura los bounding rects de las cards visibles */
  function _capturePositions() {
    const map = new Map();
    _cards.forEach(card => {
      map.set(card, card.getBoundingClientRect());
    });
    return map;
  }

  /* Aplica el filtro: muestra/oculta cards sin animación */
  function _applyFilterInstant(category) {
    _cards.forEach(card => {
      const matches = category === 'all' || card.dataset.category === category;
      if (matches) {
        card.style.display = '';
        card.style.opacity = '';
        card.style.transform = '';
        card.style.pointerEvents = '';
      } else {
        card.style.display = 'none';
      }
    });
  }

  /* Aplica visibilidad sin display:none para el FLIP */
  function _applyFilterVisibility(category) {
    _cards.forEach(card => {
      const matches = category === 'all' || card.dataset.category === category;
      card.dataset.filterVisible = matches ? '1' : '0';
      if (!matches) {
        card.style.opacity      = '0';
        card.style.transform    = 'scale(0.92) translateY(8px)';
        card.style.pointerEvents = 'none';
      }
    });
  }

  /* Anima entrada de las cards que coinciden con el filtro */
  function _animateIn(cards) {
    cards.forEach((card, i) => {
      const delay = _reducedMotion ? 0 : i * 55;
      setTimeout(() => {
        card.style.transition = _reducedMotion
          ? 'none'
          : 'opacity 0.35s cubic-bezier(0.23,1,0.32,1), transform 0.35s cubic-bezier(0.23,1,0.32,1)';
        card.style.opacity      = '1';
        card.style.transform    = 'scale(1) translateY(0)';
        card.style.pointerEvents = '';
      }, delay);
    });
  }

  /* Anima salida de las cards que NO coinciden */
  function _animateOut(cards, onDone) {
    if (!cards.length) { onDone(); return; }

    const duration = _reducedMotion ? 0 : 220;

    cards.forEach(card => {
      card.style.transition = _reducedMotion
        ? 'none'
        : 'opacity 0.22s ease, transform 0.22s cubic-bezier(0.4,0,1,1)';
      card.style.opacity      = '0';
      card.style.transform    = 'scale(0.93) translateY(6px)';
      card.style.pointerEvents = 'none';
    });

    setTimeout(onDone, duration);
  }

  /* ── Función principal de filtro ─────────────────────────── */
  function _runFilter(category) {
    if (_isAnimating || category === _activeFilter) return;
    _isAnimating = true;
    _activeFilter = category;

    /* Actualizar botones */
    _filterBtns.forEach(btn => {
      const isActive = btn.dataset.filter === category;
      btn.classList.toggle('filter-btn--active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    /* Anunciar cambio a lectores de pantalla */
    if (_grid) {
      _grid.setAttribute('aria-busy', 'true');
    }

    const outgoing = _cards.filter(card =>
      category !== 'all' && card.dataset.category !== category
    );
    const incoming = _cards.filter(card =>
      category === 'all' || card.dataset.category === category
    );

    /* Si reduced-motion: cambio instantáneo */
    if (_reducedMotion) {
      _applyFilterInstant(category);
      _updateCounter(incoming.length);
      _isAnimating = false;
      if (_grid) _grid.setAttribute('aria-busy', 'false');
      return;
    }

    /* 1. Animar salida de las que no coinciden */
    _animateOut(outgoing, () => {
      /* 2. Ocultar (display:none) las que salieron */
      outgoing.forEach(card => {
        card.style.display = 'none';
      });

      /* 3. Mostrar las que entran (opacity:0 inicialmente) */
      incoming.forEach(card => {
        card.style.display      = '';
        card.style.opacity      = '0';
        card.style.transform    = 'scale(0.92) translateY(8px)';
        card.style.pointerEvents = 'none';
      });

      /* 4. Forzar reflow */
      void _grid?.offsetHeight;

      /* 5. Animar entrada */
      _animateIn(incoming);

      /* 6. Fin de animación */
      const maxDelay = incoming.length * 55 + 350;
      setTimeout(() => {
        _isAnimating = false;
        if (_grid) _grid.setAttribute('aria-busy', 'false');
        _updateCounter(incoming.length);
      }, maxDelay);
    });
  }

  /* ════════════════════════════════════════════════════════
     CONTADOR DE PROYECTOS
  ════════════════════════════════════════════════════════ */
  let _counterEl = null;

  function _injectCounter() {
    const filter = _qs('.projects-filter');
    if (!filter || _counterEl) return;

    _counterEl = document.createElement('span');
    _counterEl.className  = '__project-count';
    _counterEl.setAttribute('aria-live', 'polite');
    _counterEl.setAttribute('aria-atomic', 'true');
    _counterEl.style.cssText = `
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      letter-spacing: var(--tracking-code);
      color: var(--color-text-muted);
      margin-left: auto;
      align-self: center;
      white-space: nowrap;
    `;
    filter.style.alignItems = 'center';
    filter.appendChild(_counterEl);
    _updateCounter(_cards.length);
  }

  function _updateCounter(visible) {
    if (!_counterEl) return;
    const total = _cards.length;
    _counterEl.textContent = visible === total
      ? `${total} proyectos`
      : `${visible} / ${total}`;
  }

  /* ════════════════════════════════════════════════════════
     SCROLL HORIZONTAL MOBILE EN FILTROS
  ════════════════════════════════════════════════════════ */
  function _initFilterScroll() {
    const filterEl = _qs('.projects-filter');
    if (!filterEl) return;

    /* En mobile: permitir scroll horizontal con swipe */
    let startX   = 0;
    let scrollLeft = 0;

    filterEl.addEventListener('pointerdown', e => {
      startX     = e.clientX;
      scrollLeft = filterEl.scrollLeft;
    }, { passive: true });

    filterEl.addEventListener('pointermove', e => {
      const diff = startX - e.clientX;
      filterEl.scrollLeft = scrollLeft + diff;
    }, { passive: true });
  }

  /* ════════════════════════════════════════════════════════
     BIND DE EVENTOS
  ════════════════════════════════════════════════════════ */
  function _bindFilterButtons() {
    _filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (_paused) return;
        const category = btn.dataset.filter || 'all';
        filter(category);
      });

      /* Accesibilidad: teclado */
      btn.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          btn.click();
        }
        /* Navegación con flechas entre tabs */
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const idx  = _filterBtns.indexOf(btn);
          const next = e.key === 'ArrowRight'
            ? (idx + 1) % _filterBtns.length
            : (idx - 1 + _filterBtns.length) % _filterBtns.length;
          _filterBtns[next].focus();
        }
      });
    });
  }

  /* ── API PÚBLICA ─────────────────────────────────────────── */

  /**
   * Aplica un filtro por categoría.
   * @param {string} category — 'all' | 'security' | 'web3' | 'dev' | 'ai'
   */
  function filter(category) {
    if (!_ready || _paused) return;
    _runFilter(category);
  }

  function getActive() { return _activeFilter; }
  function pause()     { _paused = true; }
  function resume()    { _paused = false; }
  function isReady()   { return _ready; }

  function init() {
    if (_ready) return;

    _grid       = document.getElementById('projects-grid');
    _cards      = _qsa('.project-card', _grid);
    _filterBtns = _qsa('.filter-btn');

    if (!_grid || !_cards.length) {
      console.warn('[ProjectsSection] No se encontró #projects-grid o .project-card.');
      return;
    }

    _reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener('change', e => { _reducedMotion = e.matches; });

    /* Roles ARIA para el filtro */
    const filterEl = _qs('.projects-filter');
    if (filterEl) filterEl.setAttribute('role', 'tablist');

    _filterBtns.forEach(btn => {
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', btn.dataset.filter === _activeFilter ? 'true' : 'false');
    });

    if (_grid) {
      _grid.setAttribute('role', 'tabpanel');
      _grid.setAttribute('aria-live', 'polite');
      _grid.setAttribute('aria-busy', 'false');
    }

    /* Asegurar que todas las cards estén visibles al inicio */
    _cards.forEach(card => {
      card.style.opacity      = '1';
      card.style.transform    = '';
      card.style.display      = '';
      card.style.pointerEvents = '';
    });

    _injectCounter();
    _bindFilterButtons();
    _initFilterScroll();

    _ready = true;
    console.log(`[ProjectsSection] ✓ ${_cards.length} proyectos, ${_filterBtns.length} filtros activos.`);
  }

  function destroy() {
    /* Restaurar cards */
    _cards.forEach(card => {
      card.style.opacity      = '';
      card.style.transform    = '';
      card.style.display      = '';
      card.style.transition   = '';
      card.style.pointerEvents = '';
      delete card.dataset.filterVisible;
    });

    /* Eliminar counter */
    if (_counterEl && _counterEl.parentNode) {
      _counterEl.parentNode.removeChild(_counterEl);
    }

    /* Limpiar listeners — clonar y reemplazar botones */
    _filterBtns.forEach(btn => {
      btn.replaceWith(btn.cloneNode(true));
    });

    _grid        = null;
    _cards       = [];
    _filterBtns  = [];
    _counterEl   = null;
    _activeFilter = 'all';
    _isAnimating  = false;
    _ready        = false;

    console.log('[ProjectsSection] Destruido.');
  }

  return {
    init,
    filter,
    getActive,
    pause,
    resume,
    isReady,
    destroy,
  };

})();

window.ProjectsSection = ProjectsSection;
