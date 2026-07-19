/*
  ============================================================
  CYBER PORTFOLIO — F09 · js/effects/HolographicGrid.js
  ============================================================
  ESTADO: ✅ COMPLETADO
  VERSIÓN: 1.0.0
  FASE: 3 de 8

  DESCRIPCIÓN:
    Grid holográfico perspectivo estilo synthwave sobre el
    #bg-canvas (Canvas 2D). Completamente independiente de
    Three.js — usa la Canvas 2D API directamente.

    Efecto visual: plano de líneas que convergen en un punto
    de fuga (perspectiva) con movimiento de scroll hacia el
    espectador. Líneas de escaneo horizontales superpuestas.
    Velo de viñeta radial sobre todo para dar profundidad.

  DEPENDENCIAS:
    → #bg-canvas   — canvas en index.html (posición fixed, z:-1)
    → css/variables.css (F02) — colores vía getComputedStyle

  TÉCNICA:
    · Canvas 2D con transformaciones manuales de perspectiva.
    · Las líneas del grid se calculan como proyecciones desde
      el punto de fuga central superior.
    · Las líneas horizontales se espacian siguiendo una curva
      exponencial para simular perspectiva correcta.
    · Animación continua: las líneas horizontales avanzan
      hacia el espectador (efecto de movimiento sobre el plano).
    · Scan lines: franjas horizontales sutiles que bajan lentamente.
    · Viñeta: gradiente radial sobre todo el canvas.
    · Parpadeo (flicker): variación muy sutil de opacidad global
      para simular interferencia holográfica.

  API PÚBLICA:
    HolographicGrid.init()
    HolographicGrid.pause()
    HolographicGrid.resume()
    HolographicGrid.setIntensity(val)   → 0.0 – 1.0
    HolographicGrid.isReady()           → boolean
    HolographicGrid.destroy()

  INTEGRACIÓN:
    Inicializar DESPUÉS de que el DOM esté listo.
    No depende de RobotCore ni de Three.js.
    MatrixRain.js (F10) comparte el mismo #bg-canvas —
    ambos deben coordinar el clearRect() en cada frame.
    Por convención: HolographicGrid pinta PRIMERO, luego
    MatrixRain pinta encima con blending aditivo.

  PRÓXIMO ARCHIVO: F10 · js/effects/MatrixRain.js
  ============================================================
*/

'use strict';

const HolographicGrid = (() => {

  /* ── Estado ─────────────────────────────────────────────── */
  let _ready       = false;
  let _paused      = false;
  let _canvas      = null;
  let _ctx         = null;
  let _rafId       = null;
  let _intensity   = 1.0;
  let _reducedMotion = false;

  /* Dimensiones del canvas */
  let _W = 0;
  let _H = 0;

  /* Animación */
  let _elapsed     = 0;
  let _lastTime    = 0;

  /* ── Leer CSS ───────────────────────────────────────────── */
  function _css(v) {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  }

  /* ── Colores (recalculados en cada frame para reducir GC) ─ */
  function _cyanAlpha(a) {
    return `rgba(0,255,255,${(a * _intensity).toFixed(3)})`;
  }
  function _violetAlpha(a) {
    return `rgba(127,90,240,${(a * _intensity).toFixed(3)})`;
  }
  function _bgAlpha(a) {
    return `rgba(5,5,8,${a.toFixed(3)})`;
  }

  /* ── Resize ─────────────────────────────────────────────── */
  function _resize() {
    _W = window.innerWidth;
    _H = window.innerHeight;
    _canvas.width  = _W;
    _canvas.height = _H;
  }

  /* ════════════════════════════════════════════════════════
     DRAW: GRID PERSPECTIVO
     Las líneas parten del punto de fuga (horizonte) y se
     abren hacia el borde inferior del canvas.
     Las líneas horizontales se espacian con curva exponencial
     y se animan avanzando hacia el espectador.
  ════════════════════════════════════════════════════════ */
  function _drawGrid() {
    const ctx = _ctx;
    const W   = _W;
    const H   = _H;

    /* Horizonte: 35% desde arriba */
    const horizonY = H * 0.35;

    /* Punto de fuga en el centro */
    const vpX = W * 0.5;
    const vpY = horizonY;

    /* ── Líneas verticales (divergen del punto de fuga) ── */
    const VERT_LINES = 24;           // número de líneas verticales
    const SPREAD     = W * 1.8;      // ancho del grid en la base

    ctx.save();
    ctx.lineWidth = 0.6;

    for (let i = 0; i <= VERT_LINES; i++) {
      const t      = i / VERT_LINES;            // 0 … 1
      const baseX  = (vpX - SPREAD / 2) + t * SPREAD;
      const alpha  = 0.06 + Math.sin(t * Math.PI) * 0.22; // bordes más tenues

      ctx.beginPath();
      ctx.moveTo(vpX, vpY);
      ctx.lineTo(baseX, H);
      ctx.strokeStyle = _cyanAlpha(alpha);
      ctx.stroke();
    }

    /* ── Líneas horizontales (perspectiva exponencial) ── */
    const HORIZ_LINES = 18;
    const SPEED       = 0.18;        // unidades por segundo

    // El desplazamiento en t crea el movimiento de "avance"
    const scrollT = (_elapsed * SPEED) % 1;

    for (let i = 0; i < HORIZ_LINES; i++) {
      // Valor t en [0,1]: 0 = horizonte, 1 = base del canvas
      // Añadir scroll y remapear
      const rawT = (i / HORIZ_LINES + scrollT) % 1;

      // Perspectiva exponencial: mayor separación hacia la base
      const perspT = rawT * rawT * rawT;  // curva cúbica

      // Y real en pantalla
      const y = vpY + (H - vpY) * perspT;

      if (y <= vpY) continue; // no pintar sobre el horizonte

      // X del grid en este nivel (mismo ángulo que las verticales)
      const halfW   = (SPREAD / 2) * perspT;
      const x0      = vpX - halfW;
      const x1      = vpX + halfW;

      // Opacidad: máxima en la base, mínima en el horizonte
      const alpha   = 0.04 + perspT * 0.28;

      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.lineWidth  = 0.4 + perspT * 1.2;
      ctx.strokeStyle = _cyanAlpha(alpha);
      ctx.stroke();
    }

    ctx.restore();
  }

  /* ════════════════════════════════════════════════════════
     DRAW: LÍNEA DE HORIZONTE
     Línea brillante que separa el plano del fondo.
  ════════════════════════════════════════════════════════ */
  function _drawHorizonLine() {
    const ctx = _ctx;
    const horizonY = _H * 0.35;

    /* Parpadeo muy sutil de la línea */
    const flicker = 0.85 + Math.sin(_elapsed * 7.3) * 0.08 + Math.sin(_elapsed * 13.1) * 0.07;

    const grad = ctx.createLinearGradient(0, horizonY, _W, horizonY);
    grad.addColorStop(0,    _cyanAlpha(0));
    grad.addColorStop(0.15, _cyanAlpha(0.5 * flicker));
    grad.addColorStop(0.4,  _violetAlpha(0.7 * flicker));
    grad.addColorStop(0.5,  _cyanAlpha(0.9 * flicker));
    grad.addColorStop(0.6,  _violetAlpha(0.7 * flicker));
    grad.addColorStop(0.85, _cyanAlpha(0.5 * flicker));
    grad.addColorStop(1,    _cyanAlpha(0));

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0,   horizonY);
    ctx.lineTo(_W,  horizonY);
    ctx.lineWidth   = 1.5;
    ctx.strokeStyle = grad;
    ctx.shadowColor = _cyanAlpha(0.6 * flicker);
    ctx.shadowBlur  = 8;
    ctx.stroke();

    /* Segunda línea de glow más ancha y tenue */
    ctx.lineWidth   = 6;
    ctx.globalAlpha = 0.18 * flicker * _intensity;
    ctx.stroke();

    ctx.restore();
  }

  /* ════════════════════════════════════════════════════════
     DRAW: SCAN LINES
     Franjas sutiles que bajan lentamente — simulan el
     refresco de un monitor CRT o una señal holográfica.
  ════════════════════════════════════════════════════════ */
  function _drawScanLines() {
    const ctx  = _ctx;
    const W    = _W;
    const H    = _H;

    const SCAN_LINES  = 3;
    const SCAN_SPEED  = 0.06;   // pantallas por segundo
    const SCAN_HEIGHT = H * 0.08;

    for (let i = 0; i < SCAN_LINES; i++) {
      const offset = (i / SCAN_LINES);
      const t      = ((_elapsed * SCAN_SPEED + offset) % 1);
      const y      = t * H;

      /* Gradiente vertical de la banda de escaneo */
      const grad = ctx.createLinearGradient(0, y - SCAN_HEIGHT * 0.5, 0, y + SCAN_HEIGHT * 0.5);
      grad.addColorStop(0,   _cyanAlpha(0));
      grad.addColorStop(0.4, _cyanAlpha(0.035));
      grad.addColorStop(0.5, _cyanAlpha(0.06));
      grad.addColorStop(0.6, _cyanAlpha(0.035));
      grad.addColorStop(1,   _cyanAlpha(0));

      ctx.save();
      ctx.fillStyle = grad;
      ctx.fillRect(0, y - SCAN_HEIGHT * 0.5, W, SCAN_HEIGHT);
      ctx.restore();
    }
  }

  /* ════════════════════════════════════════════════════════
     DRAW: VIÑETA RADIAL
     Oscurece los bordes para dar profundidad y foco central.
  ════════════════════════════════════════════════════════ */
  function _drawVignette() {
    const ctx = _ctx;
    const W   = _W;
    const H   = _H;

    const cx = W * 0.5;
    const cy = H * 0.5;
    const r  = Math.sqrt(cx * cx + cy * cy) * 0.98;

    const grad = ctx.createRadialGradient(cx, cy, r * 0.35, cx, cy, r);
    grad.addColorStop(0, _bgAlpha(0));
    grad.addColorStop(1, _bgAlpha(0.75));

    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /* ════════════════════════════════════════════════════════
     DRAW: FLICKER GLOBAL
     Variación muy sutil de opacidad de todo el canvas.
     Simula interferencia holográfica.
  ════════════════════════════════════════════════════════ */
  function _getFlicker() {
    return 0.92 +
      Math.sin(_elapsed * 3.7)  * 0.04 +
      Math.sin(_elapsed * 11.3) * 0.02 +
      Math.sin(_elapsed * 23.1) * 0.01;
  }

  /* ── Frame ──────────────────────────────────────────────── */
  function _frame(timestamp) {
    _rafId = requestAnimationFrame(_frame);

    /* Delta time */
    if (!_lastTime) _lastTime = timestamp;
    const delta = Math.min((timestamp - _lastTime) / 1000, 0.05); // cap 50ms
    _lastTime = timestamp;
    if (!_paused) _elapsed += delta;

    const ctx = _ctx;
    const W   = _W;
    const H   = _H;

    /* Limpiar sólo la mitad inferior (arriba puede compartirse con MatrixRain) */
    ctx.clearRect(0, 0, W, H);

    if (_paused || _reducedMotion) {
      /* En reduced-motion: solo dibujar el grid estático, sin animación */
      ctx.globalAlpha = 0.4 * _intensity;
      _drawGrid();
      _drawHorizonLine();
      _drawVignette();
      ctx.globalAlpha = 1;
      return;
    }

    /* Flicker global sutil */
    ctx.globalAlpha = _getFlicker() * _intensity;

    _drawGrid();
    _drawHorizonLine();
    _drawScanLines();
    _drawVignette();

    ctx.globalAlpha = 1;
  }

  /* ── API PÚBLICA ────────────────────────────────────────── */

  function init() {
    if (_ready) return;

    _canvas = document.getElementById('bg-canvas');
    if (!_canvas) {
      console.error('[HolographicGrid] No se encontró #bg-canvas.');
      return;
    }

    _ctx = _canvas.getContext('2d');
    if (!_ctx) {
      console.error('[HolographicGrid] Canvas 2D no disponible.');
      return;
    }

    _reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener('change', e => { _reducedMotion = e.matches; });

    _resize();
    window.addEventListener('resize', _resize, { passive: true });

    _rafId = requestAnimationFrame(_frame);

    _ready = true;
    console.log('[HolographicGrid] ✓ Grid holográfico activo.');
  }

  function pause()   { _paused = true; }
  function resume()  { _paused = false; }
  function isReady() { return _ready; }

  /**
   * Ajusta la intensidad visual global del grid.
   * @param {number} val — 0.0 (invisible) a 1.0 (plena intensidad)
   */
  function setIntensity(val) {
    _intensity = Math.max(0, Math.min(1, val));
  }

  function destroy() {
    if (_rafId) cancelAnimationFrame(_rafId);
    window.removeEventListener('resize', _resize);
    if (_ctx && _canvas) _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
    _canvas = null;
    _ctx    = null;
    _ready  = false;
  }

  return {
    init,
    pause,
    resume,
    setIntensity,
    isReady,
    destroy,
  };

})();

window.HolographicGrid = HolographicGrid;
