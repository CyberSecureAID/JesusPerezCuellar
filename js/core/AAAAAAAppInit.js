/*
  ============================================================
  CYBER PORTFOLIO — F22 · js/core/AppInit.js
  ============================================================
  ESTADO: ✅ COMPLETADO
  VERSIÓN: 1.1.0
  FASE: 8 de 8
  ============================================================
*/

'use strict';

const AppInit = (() => {

  const CAPS = {
    webgl: false,
    webAudio: false,
    reducedMotion: false,
    isMobile: false,
    isTouch: false,
  };

  let _loaderEl     = null;
  let _loaderBar    = null;
  let _loaderPercent = null;
  let _progress     = 0;

  function _qs(sel) { return document.querySelector(sel); }
  function _wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  /* ── Capacidades ── */
  function _detectCapabilities() {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      CAPS.webgl = !!gl;
      if (gl) gl.getExtension('WEBGL_lose_context')?.loseContext();
    } catch (_) { CAPS.webgl = false; }

    CAPS.webAudio     = !!(window.AudioContext || window.webkitAudioContext);
    CAPS.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    CAPS.isMobile     = window.innerWidth < 768;
    CAPS.isTouch      = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    document.body.classList.toggle('no-webgl',       !CAPS.webgl);
    document.body.classList.toggle('is-mobile',       CAPS.isMobile);
    document.body.classList.toggle('is-touch',        CAPS.isTouch);
    document.body.classList.toggle('reduced-motion',  CAPS.reducedMotion);
  }

  /* ── Loader: reutiliza el #loader del HTML ── */
  function _buildLoader() {
    // Usar el loader que ya existe en el HTML
    _loaderEl      = document.getElementById('loader');
    _loaderBar     = document.getElementById('loader-bar');
    _loaderPercent = document.getElementById('loader-percent');
  }

  function _setProgress(pct, _status) {
    _progress = Math.min(100, Math.max(0, pct));
    if (_loaderBar)     _loaderBar.style.width = _progress + '%';
    if (_loaderPercent) _loaderPercent.textContent = Math.round(_progress) + '%';
  }

  async function _hideLoader() {
    _setProgress(100);
    await _wait(300);
    if (_loaderEl) {
      _loaderEl.classList.add('hidden');
    }
  }

  /* ── Reveal página ── */
  async function _revealPage() {
    document.body.classList.add('app-ready');
    const hero = document.getElementById('hero');
    if (hero && !CAPS.reducedMotion) {
      hero.style.opacity   = '0';
      hero.style.transform = 'translateY(16px)';
      hero.style.transition = 'opacity 0.8s cubic-bezier(0.23,1,0.32,1), transform 0.8s cubic-bezier(0.23,1,0.32,1)';
      await _wait(60);
      hero.style.opacity   = '1';
      hero.style.transform = 'translateY(0)';
      hero.addEventListener('transitionend', () => {
        hero.style.transition = '';
        hero.style.opacity    = '';
        hero.style.transform  = '';
      }, { once: true });
    }
  }

  /* ── Init módulos ── */
  async function _initModules() {

    _setProgress(5);
    await _wait(80);

    // RobotCore
    if (CAPS.webgl && window.RobotCore) {
      try {
        await RobotCore.init();
        _setProgress(18);
      } catch (err) {
        console.error('[AppInit] RobotCore failed:', err);
        document.body.classList.add('no-webgl');
      }
    } else {
      _setProgress(18);
      document.body.classList.add('no-webgl');
    }
    await _wait(60);

    // RobotHead
    _setProgress(22);
    if (window.RobotCore && RobotCore.isReady() && window.RobotHead) {
      try { RobotHead.init(); _setProgress(30); } catch (e) { console.warn(e); }
    }
    await _wait(40);

    // RobotTracking
    if (window.RobotHead && RobotHead.isReady() && window.RobotTracking) {
      try { await RobotTracking.init(); _setProgress(36); } catch (e) { console.warn(e); }
    }
    await _wait(30);

    // RobotAnimations
    if (window.RobotHead && RobotHead.isReady() && window.RobotAnimations) {
      try { RobotAnimations.init(); _setProgress(42); } catch (e) { console.warn(e); }
    }
    await _wait(30);

    // ParticleField
    _setProgress(46);
    if (window.RobotCore && RobotCore.isReady() && window.ParticleField) {
      try { ParticleField.init(); _setProgress(52); } catch (e) { console.warn(e); }
    }
    await _wait(30);

    // HolographicGrid
    _setProgress(55);
    if (window.HolographicGrid) {
      try { HolographicGrid.init(); } catch (e) { console.warn(e); }
    }
    await _wait(30);

    // MatrixRain
    _setProgress(60);
    if (window.MatrixRain) {
      try { MatrixRain.init(); } catch (e) { console.warn(e); }
    }
    await _wait(30);

    // UI modules
    _setProgress(65);
    const uiModules = ['TypeWriter', 'ScrollAnimations', 'GlitchEffect', 'CustomCursor'];
    for (let i = 0; i < uiModules.length; i++) {
      const key = uiModules[i];
      if (window[key]) {
        try { window[key].init(); } catch (e) { console.warn(e); }
      }
      _setProgress(65 + (i + 1) * 4);
      await _wait(20);
    }

    // Section modules
    _setProgress(82);
    const sectionModules = ['ServicesSection', 'ProjectsSection', 'ContactSection'];
    for (let i = 0; i < sectionModules.length; i++) {
      const key = sectionModules[i];
      if (window[key]) {
        try { window[key].init(); } catch (e) { console.warn(e); }
      }
      _setProgress(82 + (i + 1) * 4);
      await _wait(20);
    }

    // Audio toggle
    _setProgress(96);
    _bindAudioToggle();
    await _wait(50);
  }

  /* ── Audio toggle ── */
  function _bindAudioToggle() {
    const btn = document.getElementById('audio-toggle');
    if (!btn || !window.audioManager) return;
    _updateAudioBtn(btn, window.audioManager.getMute());
    btn.addEventListener('click', () => {
      const muted = window.audioManager.toggleMute();
      _updateAudioBtn(btn, muted);
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

  /* ── Eventos globales ── */
  function _bindGlobalEvents() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        window.audioManager?.suspend();
        window.HolographicGrid?.pause();
        window.MatrixRain?.pause();
      } else {
        window.audioManager?.resume();
        window.HolographicGrid?.resume();
        window.MatrixRain?.resume();
      }
    });

    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        const target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: CAPS.reducedMotion ? 'auto' : 'smooth', block: 'start' });
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
    });

    // Footer year
    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Navbar mobile toggle
    const navToggle = document.getElementById('nav-toggle');
    const navMobile = document.getElementById('nav-links-mobile');
    if (navToggle && navMobile) {
      navToggle.addEventListener('click', () => {
        const isOpen = !navMobile.hidden;
        navMobile.hidden = isOpen;
        navToggle.setAttribute('aria-expanded', !isOpen);
      });
      // Cerrar al hacer click en un link mobile
      navMobile.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
          navMobile.hidden = true;
          navToggle.setAttribute('aria-expanded', 'false');
        });
      });
    }

    window.addEventListener('error', e => console.error('[AppInit] Error:', e.message));
    window.addEventListener('unhandledrejection', e => console.error('[AppInit] Rejection:', e.reason));
  }

  /* ── BOOT ── */
  async function boot() {
    console.log('[AppInit] Booting…');
    const t0 = performance.now();

    _detectCapabilities();
    _buildLoader();
    _setProgress(0);
    await _wait(120);

    try {
      await _initModules();
    } catch (err) {
      console.error('[AppInit] Boot error:', err);
    }

    await _hideLoader();
    await _revealPage();
    _bindGlobalEvents();

    console.log(`[AppInit] ✓ Boot en ${(performance.now() - t0).toFixed(0)}ms`);
  }

  /* ── DESTROY ── */
  function destroy() {
    [
      'RobotAnimations','RobotTracking','ParticleField','RobotHead','RobotCore',
      'HolographicGrid','MatrixRain','TypeWriter','ScrollAnimations',
      'GlitchEffect','CustomCursor','ServicesSection','ProjectsSection','ContactSection',
    ].forEach(key => {
      try { window[key]?.destroy?.(); } catch (e) { console.warn(e); }
    });
    window.audioManager?.destroy();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  return { boot, destroy };

})();

window.AppInit = AppInit;
