/*
  ============================================================
  CYBER PORTFOLIO — F16 · js/ui/GlitchEffect.js
  ============================================================
  ESTADO: ✅ COMPLETADO
  VERSIÓN: 1.0.0
  FASE: 5 de 8

  DESCRIPCIÓN:
    Efecto glitch aplicable a elementos del DOM.
    Desplazamiento RGB via clip-path, shake de transform,
    y sincronía con RobotAnimations.triggerGlitch() (F07).
    Activable en hover, scroll-reveal, o llamada manual.

  DEPENDENCIAS:
    → css/components.css (F12) — .glitch-active, @keyframes
    → RobotAnimations.js (F07) — triggerGlitch() (opcional)

  FEATURES:
    · Auto-bind a elementos [data-glitch] en el DOM
    · Trigger en hover configurable por data-glitch-hover
    · Trigger en IntersectionObserver (data-glitch-scroll)
    · API manual: GlitchEffect.trigger(el, opts)
    · Sincronía automática con el robot 3D (F07)
    · Cola de glitches para no solapar en el mismo elemento
    · Soporte completo reduced-motion

  DATA ATTRIBUTES:
    data-glitch                   → registra el elemento
    data-glitch-hover             → activa en mouseenter
    data-glitch-scroll            → activa al entrar en viewport
    data-glitch-intensity="0.8"   → 0.0 – 1.0 (default 1.0)
    data-glitch-duration="350"    → ms (default 350)
    data-glitch-robot="false"     → desactiva sync con robot

  API PÚBLICA:
    GlitchEffect.init()
    GlitchEffect.trigger(el, opts)   → dispara glitch manual
    GlitchEffect.triggerAll(opts)    → glitch en todos los registrados
    GlitchEffect.pause()
    GlitchEffect.resume()
    GlitchEffect.isReady()           → boolean
    GlitchEffect.destroy()

  INTEGRACIÓN:
    Descomentar en index.html:
      <script src="js/ui/GlitchEffect.js"></script>
    Añadir a la secuencia de init:
      GlitchEffect.init();

  PRÓXIMO ARCHIVO: F17 · js/ui/CustomCursor.js
  ============================================================
*/

'use strict';

const GlitchEffect = (() => {

  /* ── Estado ─────────────────────────────────────────────── */
  let _ready         = false;
  let _paused        = false;
  let _reducedMotion = false;

  /* Mapa de elementos registrados → estado { active, queue } */
  const _registry = new Map();

  /* IntersectionObserver para data-glitch-scroll */
  let _scrollObserver = null;

  /* ── Defaults ───────────────────────────────────────────── */
  const DEFAULTS = {
    duration:  350,    // ms
    intensity: 1.0,    // 0–1
    robot:     true,   // sincronizar con RobotAnimations
    cssClass:  'glitch-active',
  };

  /* ── Helpers ─────────────────────────────────────────────── */
  function _qsa(sel) { return [...document.querySelectorAll(sel)]; }

  function _parseOpts(el) {
    return {
      duration:  parseFloat(el.dataset.glitchDuration)  || DEFAULTS.duration,
      intensity: parseFloat(el.dataset.glitchIntensity) || DEFAULTS.intensity,
      robot:     el.dataset.glitchRobot !== 'false',
    };
  }

  /* ════════════════════════════════════════════════════════
     NÚCLEO: aplicar el glitch a un elemento
  ════════════════════════════════════════════════════════ */
  function _applyGlitch(el, opts) {
    const state = _registry.get(el);
    if (!state) return;

    /* Si ya está activo, encolar y salir */
    if (state.active) {
      state.queue++;
      return;
    }

    const duration  = opts.duration  || DEFAULTS.duration;
    const intensity = opts.intensity || DEFAULTS.intensity;
    const syncRobot = opts.robot !== undefined ? opts.robot : DEFAULTS.robot;

    state.active = true;

    /* Para que ::before/::after puedan usar attr(data-text),
       necesitamos el data-text actualizado */
    if (!el.dataset.text) {
      el.dataset.text = el.textContent.trim();
    }

    /* Añadir la clase CSS que dispara el keyframe de components.css */
    el.classList.add(DEFAULTS.cssClass);

    /* Canvas extra: shake de CSS variable para intensidad */
    el.style.setProperty('--glitch-intensity', intensity);

    /* Sincronizar con el robot 3D */
    if (syncRobot && window.RobotAnimations && window.RobotAnimations.isReady()) {
      window.RobotAnimations.triggerGlitch(duration / 1000, intensity);
    }

    /* Limpiar cuando termina la animación */
    const cleanup = () => {
      el.classList.remove(DEFAULTS.cssClass);
      el.style.removeProperty('--glitch-intensity');
      state.active = false;

      /* Hay elementos en cola: disparar el siguiente */
      if (state.queue > 0) {
        state.queue--;
        /* Micro-delay para que el ojo perciba la separación */
        setTimeout(() => _applyGlitch(el, opts), 80);
      }
    };

    setTimeout(cleanup, duration);
  }

  /* ════════════════════════════════════════════════════════
     REGISTRO: hover
  ════════════════════════════════════════════════════════ */
  function _bindHover(el) {
    const opts = _parseOpts(el);

    el.__glitchHoverHandler = () => {
      if (_paused || _reducedMotion) return;
      _applyGlitch(el, opts);
    };

    el.addEventListener('mouseenter', el.__glitchHoverHandler);
  }

  /* ════════════════════════════════════════════════════════
     REGISTRO: scroll (IntersectionObserver)
  ════════════════════════════════════════════════════════ */
  function _initScrollObserver() {
    const els = _qsa('[data-glitch-scroll]');
    if (!els.length) return;

    _scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting || _paused || _reducedMotion) return;
        const el   = entry.target;
        const opts = _parseOpts(el);
        _applyGlitch(el, opts);
        /* Una sola vez — dejar de observar */
        _scrollObserver.unobserve(el);
      });
    }, {
      threshold:  0.25,
      rootMargin: '0px 0px -40px 0px',
    });

    els.forEach(el => {
      if (!_registry.has(el)) _registry.set(el, { active: false, queue: 0 });
      _scrollObserver.observe(el);
    });
  }

  /* ════════════════════════════════════════════════════════
     REGISTRO: auto-bind a todos los [data-glitch]
  ════════════════════════════════════════════════════════ */
  function _autoRegister() {
    const els = _qsa('[data-glitch]');

    els.forEach(el => {
      if (_registry.has(el)) return;
      _registry.set(el, { active: false, queue: 0 });

      if (el.hasAttribute('data-glitch-hover')) {
        _bindHover(el);
      }
    });
  }

  /* ── API PÚBLICA ─────────────────────────────────────────── */

  function init() {
    if (_ready) return;

    _reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener('change', e => { _reducedMotion = e.matches; });

    _autoRegister();
    _initScrollObserver();

    _ready = true;
    console.log(`[GlitchEffect] ✓ ${_registry.size} elementos registrados.`);
  }

  /**
   * Dispara el efecto glitch en un elemento específico.
   * @param {Element} el
   * @param {object}  opts  — { duration, intensity, robot }
   */
  function trigger(el, opts) {
    if (!el || _paused || _reducedMotion) return;

    /* Registrar on-demand si no estaba en el DOM al init */
    if (!_registry.has(el)) {
      _registry.set(el, { active: false, queue: 0 });
    }

    _applyGlitch(el, { ...DEFAULTS, ...opts });
  }

  /**
   * Dispara el glitch en todos los elementos registrados.
   * @param {object} opts  — { duration, intensity, robot }
   */
  function triggerAll(opts) {
    if (_paused || _reducedMotion) return;
    _registry.forEach((_, el) => trigger(el, opts));
  }

  function pause()   { _paused = true; }
  function resume()  { _paused = false; }
  function isReady() { return _ready; }

  function destroy() {
    /* Limpiar listeners de hover */
    _registry.forEach((_, el) => {
      if (el.__glitchHoverHandler) {
        el.removeEventListener('mouseenter', el.__glitchHoverHandler);
        delete el.__glitchHoverHandler;
      }
      el.classList.remove(DEFAULTS.cssClass);
      el.style.removeProperty('--glitch-intensity');
    });

    if (_scrollObserver) {
      _scrollObserver.disconnect();
      _scrollObserver = null;
    }

    _registry.clear();
    _ready = false;

    console.log('[GlitchEffect] Destruido.');
  }

  return {
    init,
    trigger,
    triggerAll,
    pause,
    resume,
    isReady,
    destroy,
  };

})();

window.GlitchEffect = GlitchEffect;
