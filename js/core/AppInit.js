/*
  ============================================================
  CYBER PORTFOLIO — F22 · js/core/AppInit.js
  ============================================================
  ESTADO: ✅ COMPLETADO
  VERSIÓN: 1.0.0
  FASE: 8 de 8

  DESCRIPCIÓN:
    Bootstrap completo del portfolio. Gestiona la secuencia
    de inicialización de todos los módulos, el loader animado
    de entrada, la detección de capacidades del navegador y
    el manejo global de errores.

  DEPENDENCIAS (orden de carga en index.html):
    → THREE.js (CDN r128)
    → RobotCore.js        (F04)
    → RobotHead.js        (F05)
    → RobotTracking.js    (F06)
    → RobotAnimations.js  (F07)
    → ParticleField.js    (F08)
    → HolographicGrid.js  (F09)
    → MatrixRain.js       (F10)
    → TypeWriter.js       (F14)
    → ScrollAnimations.js (F15)
    → GlitchEffect.js     (F16)
    → CustomCursor.js     (F17)
    → ServicesSection.js  (F18)
    → ProjectsSection.js  (F19)
    → ContactSection.js   (F20)
    → AudioManager.js     (F21)
    → AppInit.js          (F22) ← este archivo, último

  SECUENCIA DE ARRANQUE:
    1. DOM ready
    2. Detectar capacidades (WebGL, Web Audio, reduced-motion)
    3. Mostrar loader animado con barra de progreso
    4. Init módulos en orden de dependencia con progreso real
    5. Fade out del loader
    6. Reveal animado de la página (hero primero)
    7. Iniciar música ambient (si el usuario lo permite)
    8. Bind de eventos globales (visibilidad, resize, errores)

  API PÚBLICA:
    AppInit.boot()     → llamar desde DOMContentLoaded
    AppInit.destroy()  → limpia todos los módulos
  ============================================================
*/

'use strict';

const AppInit = (() => {

  /* ── Flags de capacidades ─────────────────────────────────── */
  const CAPS = {
    webgl:        false,
    webAudio:     false,
    reducedMotion: false,
    isMobile:     false,
    isTouch:      false,
  };

  /* ── Estado del loader ────────────────────────────────────── */
  let _loaderEl      = null;
  let _loaderBar     = null;
  let _loaderStatus  = null;
  let _loaderPercent = null;
  let _progress      = 0;

  /* ── Referencia a todos los módulos ──────────────────────── */
  const MODULES = {
    RobotCore,
    RobotHead,
    RobotTracking,
    RobotAnimations,
    ParticleField,
    HolographicGrid,
    MatrixRain,
    TypeWriter,
    ScrollAnimations,
    GlitchEffect,
    CustomCursor,
    ServicesSection,
    ProjectsSection,
    ContactSection,
  };

  /* ── Helpers ──────────────────────────────────────────────── */
  function _qs(sel) { return document.querySelector(sel); }
  function _wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  /* ════════════════════════════════════════════════════════════
     DETECCIÓN DE CAPACIDADES
  ════════════════════════════════════════════════════════════ */
  function _detectCapabilities() {
    // WebGL
    try {
      const canvas  = document.createElement('canvas');
      const gl      = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      CAPS.webgl    = !!gl;
      if (gl) gl.getExtension('WEBGL_lose_context')?.loseContext();
    } catch (_) {
      CAPS.webgl = false;
    }

    // Web Audio
    CAPS.webAudio = !!(window.AudioContext || window.webkitAudioContext);

    // Reduced motion
    CAPS.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Mobile / touch
    CAPS.isMobile = window.innerWidth < 768;
    CAPS.isTouch  = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Exponer en body para CSS
    document.body.classList.toggle('no-webgl',   !CAPS.webgl);
    document.body.classList.toggle('is-mobile',   CAPS.isMobile);
    document.body.classList.toggle('is-touch',    CAPS.isTouch);
    document.body.classList.toggle('reduced-motion', CAPS.reducedMotion);

    console.log('[AppInit] Capabilities:', CAPS);
  }

  /* ════════════════════════════════════════════════════════════
     LOADER
  ════════════════════════════════════════════════════════════ */
  function _buildLoader() {
    // Si ya existe un loader en el HTML lo usamos; si no, lo creamos
    _loaderEl = document.getElementById('app-loader');

    if (!_loaderEl) {
      _loaderEl = document.createElement('div');
      _loaderEl.id = 'app-loader';
      _loaderEl.setAttribute('role', 'status');
      _loaderEl.setAttribute('aria-live', 'polite');
      _loaderEl.setAttribute('aria-label', 'Cargando portfolio');
      _loaderEl.innerHTML = `
        <div class="loader-inner">
          <div class="loader-logo" aria-hidden="true">
            <span class="loader-bracket">[</span>
            <span class="loader-initials">JPC</span>
            <span class="loader-bracket">]</span>
          </div>
          <div class="loader-bar-wrap" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <div class="loader-bar-fill" id="loader-bar"></div>
          </div>
          <p class="loader-status" id="loader-status" aria-live="assertive">Inicializando…</p>
          <span class="loader-percent" id="loader-percent">0%</span>
        </div>
      `;

      // Estilos inline del loader — no depende de ningún CSS externo
      const style = document.createElement('style');
      style.id    = 'loader-styles';
      style.textContent = `
        #app-loader {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #050508;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        #app-loader.is-hidden {
          opacity: 0;
          pointer-events: none;
        }
        .loader-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          width: min(320px, 80vw);
        }
        .loader-logo {
          font-family: 'JetBrains Mono', monospace;
          font-size: clamp(1.5rem, 4vw, 2rem);
          font-weight: 700;
          letter-spacing: 0.15em;
          color: #00ffff;
          text-shadow: 0 0 20px rgba(0,255,255,0.7);
          animation: loader-pulse 2s ease-in-out infinite;
        }
        .loader-bracket { color: rgba(0,255,255,0.4); }
        .loader-initials {
          margin: 0 0.15em;
          color: #00ffff;
        }
        .loader-bar-wrap {
          width: 100%;
          height: 2px;
          background: rgba(0,255,255,0.12);
          border-radius: 1px;
          overflow: hidden;
        }
        .loader-bar-fill {
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, #7f5af0, #00ffff);
          border-radius: 1px;
          transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 12px rgba(0,255,255,0.5);
        }
        .loader-status {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          letter-spacing: 0.12em;
          color: rgba(0,255,255,0.5);
          text-transform: uppercase;
          margin: 0;
        }
        .loader-percent {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.65rem;
          letter-spacing: 0.1em;
          color: rgba(127,90,240,0.7);
        }
        @keyframes loader-pulse {
          0%, 100% { text-shadow: 0 0 20px rgba(0,255,255,0.7); }
          50%       { text-shadow: 0 0 40px rgba(0,255,255,1), 0 0 80px rgba(0,255,255,0.4); }
        }
        @media (prefers-reduced-motion: reduce) {
          .loader-logo { animation: none; }
          .loader-bar-fill { transition: none; }
          #app-loader { transition: none; }
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(_loaderEl);
    }

    _loaderBar     = document.getElementById('loader-bar');
    _loaderStatus  = document.getElementById('loader-status');
    _loaderPercent = document.getElementById('loader-percent');
  }

  function _setProgress(pct, status) {
    _progress = Math.min(100, Math.max(0, pct));

    if (_loaderBar)     _loaderBar.style.width = _progress + '%';
    if (_loaderPercent) _loaderPercent.textContent = Math.round(_progress) + '%';
    if (_loaderStatus && status) _loaderStatus.textContent = status;

    // Actualizar aria
    const wrap = _loaderEl?.querySelector('[role="progressbar"]');
    if (wrap) wrap.setAttribute('aria-valuenow', Math.round(_progress));
  }

  async function _hideLoader() {
    _setProgress(100, 'Listo');
    await _wait(300);

    if (_loaderEl) {
      _loaderEl.classList.add('is-hidden');
      // Eliminar del DOM tras la transición
      _loaderEl.addEventListener('transitionend', () => {
        _loaderEl?.remove();
        document.getElementById('loader-styles')?.remove();
      }, { once: true });
    }
  }

  /* ════════════════════════════════════════════════════════════
     REVEAL DE LA PÁGINA
  ════════════════════════════════════════════════════════════ */
  async function _revealPage() {
    // La página empieza oculta (opacity:0 o visibility:hidden en CSS)
    // Aquí la revelamos con una transición suave
    document.body.classList.add('app-ready');

    const hero = document.getElementById('hero');
    if (hero && !CAPS.reducedMotion) {
      hero.style.opacity    = '0';
      hero.style.transform  = 'translateY(16px)';
      hero.style.transition = 'opacity 0.8s cubic-bezier(0.23,1,0.32,1), transform 0.8s cubic-bezier(0.23,1,0.32,1)';

      await _wait(60);

      hero.style.opacity   = '1';
      hero.style.transform = 'translateY(0)';

      // Limpiar inline styles tras la animación
      hero.addEventListener('transitionend', () => {
        hero.style.transition = '';
        hero.style.opacity    = '';
        hero.style.transform  = '';
      }, { once: true });
    }
  }

  /* ════════════════════════════════════════════════════════════
     INIT DE MÓDULOS
     Cada paso actualiza la barra de progreso.
     Los errores en módulos no críticos no detienen el boot.
  ════════════════════════════════════════════════════════════ */
  async function _initModules() {

    /* ── FASE 1: Motor 3D (crítico) ─────────────────────── */
    _setProgress(5, 'Iniciando motor 3D…');
    await _wait(80);

    if (CAPS.webgl && window.RobotCore) {
      try {
        await RobotCore.init();
        _setProgress(18, 'Motor 3D listo');
      } catch (err) {
        console.error('[AppInit] RobotCore failed:', err);
        document.body.classList.add('no-webgl');
      }
    } else {
      _setProgress(18, 'WebGL no disponible — modo fallback');
      document.body.classList.add('no-webgl');
    }
    await _wait(60);

    /* ── FASE 2: Robot (depende de RobotCore) ───────────── */
    _setProgress(22, 'Ensamblando robot…');

    if (RobotCore.isReady() && window.RobotHead) {
      try {
        RobotHead.init();
        _setProgress(30, 'Robot ensamblado');
      } catch (err) {
        console.warn('[AppInit] RobotHead failed:', err);
      }
    }
    await _wait(40);

    if (RobotHead?.isReady() && window.RobotTracking) {
      try {
        await RobotTracking.init();
        _setProgress(36, 'Tracking de cursor activo');
      } catch (err) {
        console.warn('[AppInit] RobotTracking failed:', err);
      }
    }
    await _wait(30);

    if (RobotHead?.isReady() && window.RobotAnimations) {
      try {
        RobotAnimations.init();
        _setProgress(42, 'Animaciones idle activas');
      } catch (err) {
        console.warn('[AppInit] RobotAnimations failed:', err);
      }
    }
    await _wait(30);

    /* ── FASE 3: Efectos de ambiente ────────────────────── */
    _setProgress(46, 'Generando campo de partículas…');

    if (RobotCore?.isReady() && window.ParticleField) {
      try {
        ParticleField.init();
        _setProgress(52, 'Partículas activas');
      } catch (err) {
        console.warn('[AppInit] ParticleField failed:', err);
      }
    }
    await _wait(30);

    _setProgress(55, 'Activando grid holográfico…');
    if (window.HolographicGrid) {
      try {
        HolographicGrid.init();
      } catch (err) {
        console.warn('[AppInit] HolographicGrid failed:', err);
      }
    }
    await _wait(30);

    _setProgress(60, 'Iniciando matrix rain…');
    if (window.MatrixRain) {
      try {
        MatrixRain.init();
      } catch (err) {
        console.warn('[AppInit] MatrixRain failed:', err);
      }
    }
    await _wait(30);

    /* ── FASE 4: UI / Interactividad ────────────────────── */
    _setProgress(65, 'Cargando interfaz…');

    const uiModules = [
      { key: 'TypeWriter',       label: 'Typewriter' },
      { key: 'ScrollAnimations', label: 'Scroll animations' },
      { key: 'GlitchEffect',     label: 'Glitch system' },
      { key: 'CustomCursor',     label: 'Custom cursor' },
    ];

    for (let i = 0; i < uiModules.length; i++) {
      const { key, label } = uiModules[i];
      if (window[key]) {
        try {
          window[key].init();
        } catch (err) {
          console.warn(`[AppInit] ${key} failed:`, err);
        }
      }
      _setProgress(65 + (i + 1) * 4, `${label} listo`);
      await _wait(20);
    }

    /* ── FASE 5: Secciones de contenido ─────────────────── */
    _setProgress(82, 'Inicializando secciones…');

    const sectionModules = [
      { key: 'ServicesSection', label: 'Servicios' },
      { key: 'ProjectsSection', label: 'Proyectos' },
      { key: 'ContactSection',  label: 'Contacto' },
    ];

    for (let i = 0; i < sectionModules.length; i++) {
      const { key, label } = sectionModules[i];
      if (window[key]) {
        try {
          window[key].init();
        } catch (err) {
          console.warn(`[AppInit] ${key} failed:`, err);
        }
      }
      _setProgress(82 + (i + 1) * 4, `${label} listo`);
      await _wait(20);
    }

    /* ── FASE 6: Audio ───────────────────────────────────── */
    _setProgress(96, 'Sistema de audio listo');
    // AudioManager se inicializa on-demand (requiere gesto de usuario)
    // Solo conectamos el botón de mute si existe en el DOM
    _bindAudioToggle();

    await _wait(50);
  }

  /* ════════════════════════════════════════════════════════════
     BIND AUDIO TOGGLE
  ════════════════════════════════════════════════════════════ */
  function _bindAudioToggle() {
    const btn = document.getElementById('audio-toggle');
    if (!btn || !window.audioManager) return;

    // Sincronizar estado inicial del botón
    _updateAudioBtn(btn, window.audioManager.getMute());

    btn.addEventListener('click', () => {
      const muted = window.audioManager.toggleMute();
      _updateAudioBtn(btn, muted);

      // Arrancar música la primera vez que se activa el audio
      if (!muted && !window.audioManager.musicPlaying) {
        window.audioManager.startMusic();
      }
    });
  }

  function _updateAudioBtn(btn, isMuted) {
    btn.setAttribute('aria-label', isMuted ? 'Activar audio' : 'Silenciar audio');
    btn.setAttribute('aria-pressed', !isMuted);
    btn.classList.toggle('is-muted', isMuted);
  }

  /* ════════════════════════════════════════════════════════════
     EVENTOS GLOBALES
  ════════════════════════════════════════════════════════════ */
  function _bindGlobalEvents() {
    // Pausar/reanudar audio y animaciones cuando la pestaña pierde foco
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        window.audioManager?.suspend();
        HolographicGrid?.pause();
        MatrixRain?.pause();
      } else {
        window.audioManager?.resume();
        HolographicGrid?.resume();
        MatrixRain?.resume();
      }
    });

    // Smooth scroll para los links del nav
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        const target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({
          behavior: CAPS.reducedMotion ? 'auto' : 'smooth',
          block: 'start',
        });
        // Mover foco al destino para accesibilidad
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
    });

    // Manejo de errores globales no capturados
    window.addEventListener('error', e => {
      console.error('[AppInit] Uncaught error:', e.message, e.filename, e.lineno);
    });

    window.addEventListener('unhandledrejection', e => {
      console.error('[AppInit] Unhandled rejection:', e.reason);
    });
  }

  /* ════════════════════════════════════════════════════════════
     BOOT — punto de entrada público
  ════════════════════════════════════════════════════════════ */
  async function boot() {
    console.log('[AppInit] Booting Cyber Portfolio…');
    const t0 = performance.now();

    // 1. Detectar capacidades
    _detectCapabilities();

    // 2. Construir y mostrar loader
    _buildLoader();
    _setProgress(0, 'Iniciando…');
    await _wait(120);

    // 3. Inicializar todos los módulos con progreso
    try {
      await _initModules();
    } catch (err) {
      console.error('[AppInit] Critical boot error:', err);
    }

    // 4. Ocultar loader
    await _hideLoader();

    // 5. Revelar la página
    await _revealPage();

    // 6. Eventos globales
    _bindGlobalEvents();

    const elapsed = (performance.now() - t0).toFixed(0);
    console.log(`[AppInit] ✓ Boot completo en ${elapsed}ms`);
  }

  /* ════════════════════════════════════════════════════════════
     DESTROY
  ════════════════════════════════════════════════════════════ */
  function destroy() {
    const destroyable = [
      'RobotAnimations', 'RobotTracking', 'ParticleField',
      'RobotHead', 'RobotCore',
      'HolographicGrid', 'MatrixRain',
      'TypeWriter', 'ScrollAnimations', 'GlitchEffect', 'CustomCursor',
      'ServicesSection', 'ProjectsSection', 'ContactSection',
    ];

    destroyable.forEach(key => {
      if (window[key]?.destroy) {
        try { window[key].destroy(); } catch (err) {
          console.warn(`[AppInit] Error destroying ${key}:`, err);
        }
      }
    });

    window.audioManager?.destroy();
    console.log('[AppInit] All modules destroyed.');
  }

  /* ── Arranque automático en DOMContentLoaded ───────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    // DOM ya listo (script cargado con defer o al final del body)
    boot();
  }

  return { boot, destroy };

})();

window.AppInit = AppInit;
