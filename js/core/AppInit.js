/*
  ============================================================
  CYBER PORTFOLIO — F22 · js/core/AppInit.js
  ============================================================
  ESTADO: ✅ COMPLETADO
  VERSIÓN: 1.2.0 — Eliminadas referencias al robot 3D (Three.js)
  FASE: 8 de 8
  ============================================================
*/

'use strict';

const AppInit = (() => {

  const CAPS = {
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
    CAPS.webAudio     = !!(window.AudioContext || window.webkitAudioContext);
    CAPS.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    CAPS.isMobile     = window.innerWidth < 768;
    CAPS.isTouch      = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    document.body.classList.toggle('is-mobile',       CAPS.isMobile);
    document.body.classList.toggle('is-touch',        CAPS.isTouch);
    document.body.classList.toggle('reduced-motion',  CAPS.reducedMotion);
  }

  /* ── Loader: reutiliza el #loader del HTML ── */
  function _buildLoader() {
    _loaderEl      = document.getElementById('loader');
    _loaderBar     = document.getElementById('loader-bar');
    _loaderPercent = document.getElementById('loader-percent');
  }

  function _setProgress(pct, _status) {
    // El loader (barra + %) lo controla un módulo autónomo en index.html,
    // para que el progreso se vea siempre. Aquí solo guardamos el estado.
    _progress = Math.min(100, Math.max(0, pct));
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

    _setProgress(10);
    await _wait(80);

    // HolographicGrid
    _setProgress(20);
    if (window.HolographicGrid) {
      try { HolographicGrid.init(); } catch (e) { console.warn(e); }
    }
    await _wait(30);

    // MatrixRain
    _setProgress(30);
    if (window.MatrixRain) {
      try { MatrixRain.init(); } catch (e) { console.warn(e); }
    }
    await _wait(30);

    // UI modules
    _setProgress(40);
    const uiModules = ['TopBanner', 'TypeWriter', 'ScrollAnimations', 'GlitchEffect', 'CustomCursor'];
    for (let i = 0; i < uiModules.length; i++) {
      const key = uiModules[i];
      if (window[key]) {
        try { window[key].init(); } catch (e) { console.warn(e); }
      }
      _setProgress(40 + (i + 1) * 8);
      await _wait(20);
    }

    // Section modules
    _setProgress(75);
    const sectionModules = ['ServicesSection', 'ContactSection'];
    for (let i = 0; i < sectionModules.length; i++) {
      const key = sectionModules[i];
      if (window[key]) {
        try { window[key].init(); } catch (e) { console.warn(e); }
      }
      _setProgress(75 + (i + 1) * 6);
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
      'HolographicGrid','MatrixRain','TopBanner','TypeWriter','ScrollAnimations',
      'GlitchEffect','CustomCursor','ServicesSection','ContactSection',
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
