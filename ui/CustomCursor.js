/*
  ============================================================
  CYBER PORTFOLIO — F17 · js/ui/CustomCursor.js
  ============================================================
  ESTADO: ✅ COMPLETADO
  VERSIÓN: 1.0.0
  FASE: 5 de 8

  DESCRIPCIÓN:
    Cursor personalizado cian con halo exterior, morphing en
    hover sobre elementos interactivos y trail de partículas
    canvas que siguen al cursor con fade-out.

    Reemplaza el cursor nativo del sistema en toda la página.
    La clase .js-cursor-active en <body> activa el cursor:none
    definido en base.css (F03).

  DEPENDENCIAS:
    → #custom-cursor  — div en index.html
    → #cursor-dot     — punto central
    → #cursor-ring    — anillo exterior
    → css/components.css (F12) — estilos base del cursor
    → css/base.css (F03)       — .js-cursor-active { cursor: none }

  COMPORTAMIENTO:
    · #cursor-dot   → sigue al cursor con posición directa (0 lag)
    · #cursor-ring  → sigue con lerp suave (lag intencional)
    · Hover sobre a, button, [role="button"], [tabindex] →
        ring se expande, cambia a color violeta + mezcla
    · Hover sobre .service-card, .project-card →
        ring se transforma en un rectángulo tenue
    · Click → micro-burst: dot escala a 2.5× y vuelve
    · Trail → canvas overlay con partículas que decaen
    · Visible solo si prefers-reduced-motion es false

  API PÚBLICA:
    CustomCursor.init()
    CustomCursor.pause()
    CustomCursor.resume()
    CustomCursor.isReady()   → boolean
    CustomCursor.destroy()

  INTEGRACIÓN:
    Descomentar en index.html:
      <script src="js/ui/CustomCursor.js"></script>
    Añadir a la secuencia de init:
      CustomCursor.init();

  PRÓXIMO ARCHIVO: F18 · js/sections/ServicesSection.js
  ============================================================
*/

'use strict';

const CustomCursor = (() => {

  /* ── Estado ─────────────────────────────────────────────── */
  let _ready         = false;
  let _paused        = false;
  let _reducedMotion = false;
  let _rafId         = null;

  /* Elementos DOM */
  let _wrapper = null;   // #custom-cursor
  let _dot     = null;   // #cursor-dot
  let _ring    = null;   // #cursor-ring

  /* Canvas del trail */
  let _trailCanvas  = null;
  let _trailCtx     = null;

  /* Posiciones */
  let _mouseX  = -200;
  let _mouseY  = -200;
  let _ringX   = -200;
  let _ringY   = -200;

  /* Estado hover */
  let _hoverState = 'default'; // 'default' | 'link' | 'card' | 'text'

  /* Trail particles */
  let _particles = [];

  /* Colores desde CSS */
  const C_CYAN   = '#00ffff';
  const C_VIOLET = '#7f5af0';

  /* ── Helpers ─────────────────────────────────────────────── */
  function _css(v) {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  }

  function _lerp(a, b, t) { return a + (b - a) * t; }

  /* ── Crear canvas para el trail ─────────────────────────── */
  function _createTrailCanvas() {
    _trailCanvas = document.createElement('canvas');
    _trailCanvas.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none;
      z-index: 499;
    `;
    _trailCanvas.width  = window.innerWidth;
    _trailCanvas.height = window.innerHeight;
    document.body.appendChild(_trailCanvas);
    _trailCtx = _trailCanvas.getContext('2d');
  }

  /* ── Resize ─────────────────────────────────────────────── */
  function _onResize() {
    if (_trailCanvas) {
      _trailCanvas.width  = window.innerWidth;
      _trailCanvas.height = window.innerHeight;
    }
  }

  /* ── Generar partícula de trail ──────────────────────────── */
  function _spawnParticle(x, y) {
    const isCyan = Math.random() > 0.28;
    _particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      r:  Math.random() * 1.8 + 0.6,
      life: 1.0,
      decay: 0.06 + Math.random() * 0.06,
      color: isCyan ? C_CYAN : C_VIOLET,
    });
  }

  /* ── Actualizar y dibujar trail ──────────────────────────── */
  let _spawnThrottle = 0;
  function _tickTrail() {
    if (!_trailCtx) return;

    _trailCtx.clearRect(0, 0, _trailCanvas.width, _trailCanvas.height);

    _spawnThrottle++;
    if (_spawnThrottle >= 2) {
      _spawnThrottle = 0;
      _spawnParticle(_mouseX, _mouseY);
    }

    for (let i = _particles.length - 1; i >= 0; i--) {
      const p = _particles[i];
      p.x    += p.vx;
      p.y    += p.vy;
      p.life -= p.decay;

      if (p.life <= 0) {
        _particles.splice(i, 1);
        continue;
      }

      _trailCtx.save();
      _trailCtx.globalAlpha = p.life * 0.55;
      _trailCtx.fillStyle   = p.color;
      _trailCtx.shadowColor = p.color;
      _trailCtx.shadowBlur  = 4;
      _trailCtx.beginPath();
      _trailCtx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      _trailCtx.fill();
      _trailCtx.restore();
    }
  }

  /* ── Determinar hover state ──────────────────────────────── */
  function _detectHoverState(e) {
    const target = e.target;

    /* Card hover */
    if (target.closest('.service-card, .project-card, .blockchain-stat-card')) {
      return 'card';
    }

    /* Link / button hover */
    if (
      target.closest('a, button, [role="button"], [tabindex], .nav-link, .filter-btn, .copy-btn')
    ) {
      return 'link';
    }

    /* Input / textarea */
    if (target.closest('input, textarea, select')) {
      return 'text';
    }

    return 'default';
  }

  /* ── Aplicar estilo del ring según hover state ───────────── */
  function _applyRingStyle() {
    if (!_ring) return;

    switch (_hoverState) {

      case 'link':
        _ring.style.width        = '48px';
        _ring.style.height       = '48px';
        _ring.style.marginLeft   = '-24px';
        _ring.style.marginTop    = '-24px';
        _ring.style.borderColor  = 'rgba(127,90,240,0.75)';
        _ring.style.borderRadius = '50%';
        _ring.style.mixBlendMode = 'normal';
        break;

      case 'card':
        _ring.style.width        = '64px';
        _ring.style.height       = '40px';
        _ring.style.marginLeft   = '-32px';
        _ring.style.marginTop    = '-20px';
        _ring.style.borderColor  = 'rgba(0,255,255,0.35)';
        _ring.style.borderRadius = '4px';
        _ring.style.mixBlendMode = 'normal';
        break;

      case 'text':
        _ring.style.width        = '2px';
        _ring.style.height       = '28px';
        _ring.style.marginLeft   = '-1px';
        _ring.style.marginTop    = '-14px';
        _ring.style.borderColor  = 'rgba(0,255,255,0.8)';
        _ring.style.borderRadius = '1px';
        _ring.style.mixBlendMode = 'normal';
        break;

      default: /* 'default' */
        _ring.style.width        = '32px';
        _ring.style.height       = '32px';
        _ring.style.marginLeft   = '-16px';
        _ring.style.marginTop    = '-16px';
        _ring.style.borderColor  = 'rgba(0,255,255,0.5)';
        _ring.style.borderRadius = '50%';
        _ring.style.mixBlendMode = 'normal';
        break;
    }
  }

  /* ── Burst en click ──────────────────────────────────────── */
  function _onMouseDown() {
    if (!_dot || _paused) return;
    _dot.style.transform  = 'translate(-50%, -50%) scale(2.4)';
    _dot.style.opacity    = '0.6';
    /* Emitir varias partículas en el click */
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const speed = 1.5 + Math.random() * 1.5;
      _particles.push({
        x:     _mouseX,
        y:     _mouseY,
        vx:    Math.cos(angle) * speed,
        vy:    Math.sin(angle) * speed,
        r:     1.2 + Math.random() * 1.2,
        life:  1.0,
        decay: 0.04 + Math.random() * 0.04,
        color: Math.random() > 0.4 ? C_CYAN : C_VIOLET,
      });
    }
  }

  function _onMouseUp() {
    if (!_dot) return;
    _dot.style.transform = 'translate(-50%, -50%) scale(1)';
    _dot.style.opacity   = '1';
  }

  /* ── Handlers de mouse ───────────────────────────────────── */
  function _onMouseMove(e) {
    _mouseX = e.clientX;
    _mouseY = e.clientY;

    const state = _detectHoverState(e);
    if (state !== _hoverState) {
      _hoverState = state;
      _applyRingStyle();
    }
  }

  /* Ocultar al salir de la ventana */
  function _onMouseLeave() {
    if (_wrapper) _wrapper.style.opacity = '0';
  }

  function _onMouseEnter() {
    if (_wrapper) _wrapper.style.opacity = '1';
  }

  /* ── Loop principal ──────────────────────────────────────── */
  function _tick() {
    _rafId = requestAnimationFrame(_tick);
    if (_paused) return;

    /* Mover dot directamente */
    if (_dot) {
      _dot.style.left = _mouseX + 'px';
      _dot.style.top  = _mouseY + 'px';
    }

    /* Ring con lerp */
    _ringX = _lerp(_ringX, _mouseX, 0.14);
    _ringY = _lerp(_ringY, _mouseY, 0.14);

    if (_ring) {
      _ring.style.left = _ringX + 'px';
      _ring.style.top  = _ringY + 'px';
    }

    /* Trail */
    _tickTrail();
  }

  /* ── API PÚBLICA ─────────────────────────────────────────── */

  function init() {
    if (_ready) return;

    _reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* En reduced-motion no activar cursor custom */
    if (_reducedMotion) {
      console.log('[CustomCursor] Reduced-motion: cursor nativo conservado.');
      return;
    }

    _wrapper = document.getElementById('custom-cursor');
    _dot     = document.getElementById('cursor-dot');
    _ring    = document.getElementById('cursor-ring');

    if (!_wrapper || !_dot || !_ring) {
      console.error('[CustomCursor] No se encontraron elementos #custom-cursor, #cursor-dot o #cursor-ring.');
      return;
    }

    /* Crear canvas del trail */
    _createTrailCanvas();

    /* Activar estilos */
    document.body.classList.add('js-cursor-active');
    _wrapper.classList.add('is-ready');

    /* Posición inicial fuera de pantalla */
    _ringX = _ringY = -200;

    /* Estilo inicial del ring */
    _ring.style.transition = 'width 0.2s cubic-bezier(0.23,1,0.32,1), height 0.2s cubic-bezier(0.23,1,0.32,1), border-color 0.15s ease, border-radius 0.2s cubic-bezier(0.23,1,0.32,1), margin 0.2s cubic-bezier(0.23,1,0.32,1)';
    _applyRingStyle();

    /* Estilo del dot */
    _dot.style.transform  = 'translate(-50%, -50%) scale(1)';
    _dot.style.transition = 'transform 0.1s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.1s ease';

    /* Event listeners */
    window.addEventListener('mousemove',  _onMouseMove,  { passive: true });
    window.addEventListener('mousedown',  _onMouseDown,  { passive: true });
    window.addEventListener('mouseup',    _onMouseUp,    { passive: true });
    document.addEventListener('mouseleave', _onMouseLeave);
    document.addEventListener('mouseenter', _onMouseEnter);
    window.addEventListener('resize', _onResize, { passive: true });

    /* Reduced-motion listener en tiempo real */
    window.matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener('change', e => {
        _reducedMotion = e.matches;
        if (_reducedMotion) {
          document.body.classList.remove('js-cursor-active');
          _wrapper.style.opacity = '0';
        } else {
          document.body.classList.add('js-cursor-active');
          _wrapper.style.opacity = '1';
        }
      });

    /* Arrancar loop */
    _rafId = requestAnimationFrame(_tick);

    _ready = true;
    console.log('[CustomCursor] ✓ Cursor personalizado activo.');
  }

  function pause()   {
    _paused = true;
    if (_wrapper) _wrapper.style.opacity = '0';
  }

  function resume()  {
    _paused = false;
    if (_wrapper) _wrapper.style.opacity = '1';
  }

  function isReady() { return _ready; }

  function destroy() {
    if (_rafId) cancelAnimationFrame(_rafId);

    window.removeEventListener('mousemove',  _onMouseMove);
    window.removeEventListener('mousedown',  _onMouseDown);
    window.removeEventListener('mouseup',    _onMouseUp);
    document.removeEventListener('mouseleave', _onMouseLeave);
    document.removeEventListener('mouseenter', _onMouseEnter);
    window.removeEventListener('resize', _onResize);

    document.body.classList.remove('js-cursor-active');

    if (_trailCanvas && _trailCanvas.parentNode) {
      _trailCanvas.parentNode.removeChild(_trailCanvas);
    }

    _particles   = [];
    _trailCanvas = null;
    _trailCtx    = null;
    _wrapper     = null;
    _dot         = null;
    _ring        = null;
    _ready       = false;

    console.log('[CustomCursor] Destruido.');
  }

  return {
    init,
    pause,
    resume,
    isReady,
    destroy,
  };

})();

window.CustomCursor = CustomCursor;
