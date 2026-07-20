/*
  ============================================================
  CYBER PORTFOLIO — F17 · js/ui/CustomCursor.js
  ============================================================
  ESTADO: ✅ COMPLETADO
  VERSIÓN: 1.1.0 — FIX: centrado correcto dot + ring
  FASE: 5 de 8

  FIX v1.1.0:
    El ring y el dot se posicionan con top/left en la posición
    exacta del cursor. El centrado se delega 100% al CSS via
    transform: translate(-50%, -50%) — NO se usan márgenes
    negativos en JS (causaban doble-offset con el transform
    del CSS, desplazando el ring fuera del dot).

    Cambios respecto a v1.0.0:
    · _applyRingStyle() elimina marginLeft/marginTop de todos
      los estados — el centrado ya lo hace components.css
    · _tick() mueve dot y ring con left/top directos (sin offset)
    · CSS de components.css ya tiene transform:translate(-50%,-50%)
      en ambos #cursor-dot y #cursor-ring — no tocar
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
  let _wrapper = null;
  let _dot     = null;
  let _ring    = null;

  /* Canvas del trail */
  let _trailCanvas = null;
  let _trailCtx    = null;

  /* Posiciones */
  let _mouseX = -200;
  let _mouseY = -200;
  let _ringX  = -200;
  let _ringY  = -200;

  /* Estado hover */
  let _hoverState = 'default';

  /* Estado de arrastre (clic izquierdo mantenido) */
  let _dragging = false;

  /* Trail particles */
  let _particles = [];

  const C_CYAN   = '#00ffff';
  const C_VIOLET = '#7f5af0';
  /* Colores de chispa de soldadura (blanco incandescente -> naranja -> amarillo, con toque cian) */
  const SPARK_COLORS = ['#ffffff', '#fff2c4', '#ffd24a', '#ff9a3c', '#ff6a1a', '#00ffff'];

  /* Emitir chispas de soldadura mientras se arrastra */
  function _emitSparks(x, y) {
    const n = 7 + (Math.random() * 5 | 0);
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 3.8;
      _particles.push({
        x, y,
        px:    x, py: y,
        vx:    Math.cos(angle) * speed,
        vy:    Math.sin(angle) * speed - 0.6,
        r:     Math.random() * 1.6 + 0.6,
        life:  1.0,
        decay: 0.045 + Math.random() * 0.05,
        grav:  0.12 + Math.random() * 0.10,
        spark: true,
        color: SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0],
      });
    }
  }

  /* ── Helpers ─────────────────────────────────────────────── */
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

  /* ── Generar partícula de trail ─────────────────────────── */
  function _spawnParticle(x, y) {
    const isCyan = Math.random() > 0.28;
    _particles.push({
      x,
      y,
      vx:    (Math.random() - 0.5) * 0.8,
      vy:    (Math.random() - 0.5) * 0.8,
      r:     Math.random() * 1.8 + 0.6,
      life:  1.0,
      decay: 0.06 + Math.random() * 0.06,
      color: isCyan ? C_CYAN : C_VIOLET,
    });
  }

  /* ── Actualizar y dibujar trail ─────────────────────────── */
  let _spawnThrottle = 0;
  function _tickTrail() {
    if (!_trailCtx) return;

    _trailCtx.clearRect(0, 0, _trailCanvas.width, _trailCanvas.height);

    /* Estela continua DESACTIVADA: dejaba una "chispita" detrás del
       cursor al moverse. Se conservan el punto, el anillo y el burst
       del clic. Para reactivarla, descomenta el bloque de abajo.
    _spawnThrottle++;
    if (_spawnThrottle >= 2) {
      _spawnThrottle = 0;
      _spawnParticle(_mouseX, _mouseY);
    }
    */

    for (let i = _particles.length - 1; i >= 0; i--) {
      const p = _particles[i];

      if (p.spark) {
        /* ── Chispa de soldadura ── */
        p.px = p.x; p.py = p.y;
        p.vy += p.grav;          // gravedad
        p.vx *= 0.98;            // rozamiento del aire
        p.x  += p.vx;
        p.y  += p.vy;
        p.life -= p.decay;

        if (p.life <= 0) { _particles.splice(i, 1); continue; }

        _trailCtx.save();
        _trailCtx.globalCompositeOperation = 'lighter';   // brillo aditivo
        /* estela (pequeña línea desde la posición anterior) */
        _trailCtx.globalAlpha = p.life * 0.7;
        _trailCtx.strokeStyle = p.color;
        _trailCtx.lineWidth   = p.r * p.life;
        _trailCtx.shadowColor = p.color;
        _trailCtx.shadowBlur  = 8;
        _trailCtx.beginPath();
        _trailCtx.moveTo(p.px, p.py);
        _trailCtx.lineTo(p.x, p.y);
        _trailCtx.stroke();
        /* núcleo brillante */
        _trailCtx.globalAlpha = p.life;
        _trailCtx.fillStyle   = p.color;
        _trailCtx.beginPath();
        _trailCtx.arc(p.x, p.y, Math.max(0.4, p.r * p.life), 0, Math.PI * 2);
        _trailCtx.fill();
        _trailCtx.restore();
        continue;
      }

      /* ── Partícula normal (burst del clic) ── */
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

    if (target.closest('.service-card, .project-card, .blockchain-stat-card')) {
      return 'card';
    }
    if (target.closest('a, button, [role="button"], [tabindex], .nav-link, .filter-btn, .copy-btn')) {
      return 'link';
    }
    if (target.closest('input, textarea, select')) {
      return 'text';
    }
    return 'default';
  }

  /* ════════════════════════════════════════════════════════
     _applyRingStyle — FIX v1.1.0
     ─────────────────────────────────────────────────────────
     Se eliminan todos los marginLeft / marginTop negativos.
     El centrado ya lo hace components.css con:
       transform: translate(-50%, -50%)
     Si añadimos margin negativo aquí, se suma al transform
     y el ring queda desplazado respecto al dot.

     Para cambiar el tamaño del ring manteniendo el centrado,
     solo cambiamos width / height — el translate(-50%,-50%)
     del CSS siempre centra en base al tamaño actual.
  ════════════════════════════════════════════════════════ */
  function _applyRingStyle() {
    if (!_ring) return;

    switch (_hoverState) {

      case 'link':
        _ring.style.width        = '48px';
        _ring.style.height       = '48px';
        _ring.style.borderColor  = 'rgba(127,90,240,0.75)';
        _ring.style.borderRadius = '50%';
        break;

      case 'card':
        _ring.style.width        = '64px';
        _ring.style.height       = '40px';
        _ring.style.borderColor  = 'rgba(0,255,255,0.35)';
        _ring.style.borderRadius = '4px';
        break;

      case 'text':
        _ring.style.width        = '2px';
        _ring.style.height       = '28px';
        _ring.style.borderColor  = 'rgba(0,255,255,0.8)';
        _ring.style.borderRadius = '1px';
        break;

      default:
        _ring.style.width        = '32px';
        _ring.style.height       = '32px';
        _ring.style.borderColor  = 'rgba(0,255,255,0.5)';
        _ring.style.borderRadius = '50%';
        break;
    }
  }

  /* ── Burst en click ──────────────────────────────────────── */
  function _onMouseDown(e) {
    if (!_dot || _paused) return;
    /* Solo el clic izquierdo activa el arrastre con chispas */
    if (!e || e.button === 0) {
      _dragging = true;
      document.body.classList.add('cursor-dragging');
    }
    _dot.style.transform = 'translate(-50%, -50%) scale(2.4)';
    _dot.style.opacity   = '0.6';
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
    _dragging = false;
    document.body.classList.remove('cursor-dragging');
    if (!_dot) return;
    _dot.style.transform = 'translate(-50%, -50%) scale(1)';
    _dot.style.opacity   = '1';
  }

  /* ── Handlers de mouse ───────────────────────────────────── */
  function _onMouseMove(e) {
    _mouseX = e.clientX;
    _mouseY = e.clientY;

    /* Chispas de soldadura SOLO mientras se arrastra con el clic */
    if (_dragging && !_reducedMotion) {
      _emitSparks(_mouseX, _mouseY);
    }

    const state = _detectHoverState(e);
    if (state !== _hoverState) {
      _hoverState = state;
      _applyRingStyle();
    }
  }

  function _onMouseLeave() {
    if (_wrapper) _wrapper.style.opacity = '0';
  }

  function _onMouseEnter() {
    if (_wrapper) _wrapper.style.opacity = '1';
  }

  /* ════════════════════════════════════════════════════════
     _tick — FIX v1.1.0
     ─────────────────────────────────────────────────────────
     Movemos dot y ring con left/top apuntando al pixel exacto
     del cursor. El centrado (−50%) lo hace el transform del CSS.
     NO sumamos ningún offset aquí.
  ════════════════════════════════════════════════════════ */
  function _tick() {
    _rafId = requestAnimationFrame(_tick);
    if (_paused) return;

    /* Dot: sigue al cursor sin lag */
    if (_dot) {
      _dot.style.left = _mouseX + 'px';
      _dot.style.top  = _mouseY + 'px';
    }

    /* Ring: lerp suave */
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

    if (_reducedMotion) {
      console.log('[CustomCursor] Reduced-motion: cursor nativo conservado.');
      return;
    }

    _wrapper = document.getElementById('custom-cursor');
    _dot     = document.getElementById('cursor-dot');
    _ring    = document.getElementById('cursor-ring');

    if (!_wrapper || !_dot || !_ring) {
      console.error('[CustomCursor] No se encontraron #custom-cursor, #cursor-dot o #cursor-ring.');
      return;
    }

    _createTrailCanvas();

    document.body.classList.add('js-cursor-active');
    _wrapper.classList.add('is-ready');

    _ringX = _ringY = -200;

    /* Transición suave al cambiar de estado hover */
    _ring.style.transition =
      'width 0.2s cubic-bezier(0.23,1,0.32,1), ' +
      'height 0.2s cubic-bezier(0.23,1,0.32,1), ' +
      'border-color 0.15s ease, ' +
      'border-radius 0.2s cubic-bezier(0.23,1,0.32,1)';

    /* Estado inicial */
    _applyRingStyle();

    /* El dot ya tiene transform:translate(-50%,-50%) en el CSS;
       lo aplicamos también inline para el click-burst */
    _dot.style.transform  = 'translate(-50%, -50%) scale(1)';
    _dot.style.transition = 'transform 0.1s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.1s ease';

    /* FIX: evitar el arrastre nativo (imagen/elemento) y la selección
       durante el arrastre, que provocaban el icono 🚫 y que el cursor
       "se separara" de su animación. */
    window.addEventListener('dragstart', function (e) { e.preventDefault(); });
    document.addEventListener('selectstart', function (e) { if (_dragging) e.preventDefault(); });

    /* Event listeners */
    window.addEventListener('mousemove',    _onMouseMove,  { passive: true });
    window.addEventListener('mousedown',    _onMouseDown,  { passive: false });
    window.addEventListener('mouseup',      _onMouseUp,    { passive: true });
    document.addEventListener('mouseleave', _onMouseLeave);
    document.addEventListener('mouseenter', _onMouseEnter);
    window.addEventListener('resize',       _onResize,     { passive: true });

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

    _rafId = requestAnimationFrame(_tick);

    _ready = true;
    console.log('[CustomCursor] ✓ Cursor personalizado activo (v1.1.0).');
  }

  function pause() {
    _paused = true;
    if (_wrapper) _wrapper.style.opacity = '0';
  }

  function resume() {
    _paused = false;
    if (_wrapper) _wrapper.style.opacity = '1';
  }

  function isReady() { return _ready; }

  function destroy() {
    if (_rafId) cancelAnimationFrame(_rafId);

    window.removeEventListener('mousemove',    _onMouseMove);
    window.removeEventListener('mousedown',    _onMouseDown);
    window.removeEventListener('mouseup',      _onMouseUp);
    document.removeEventListener('mouseleave', _onMouseLeave);
    document.removeEventListener('mouseenter', _onMouseEnter);
    window.removeEventListener('resize',       _onResize);

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

  return { init, pause, resume, isReady, destroy };

})();

window.CustomCursor = CustomCursor;
