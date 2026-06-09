/*
  ============================================================
  CYBER PORTFOLIO — F10 · js/effects/MatrixRain.js
  ============================================================
  ESTADO: ✅ COMPLETADO
  VERSIÓN: 1.0.0
  FASE: 3 de 8

  DESCRIPCIÓN:
    Lluvia de caracteres hexadecimales y binarios sobre el
    #bg-canvas (Canvas 2D). Efecto sutil de fondo que refuerza
    la estética cyberpunk sin competir con el robot 3D ni con
    el grid holográfico de F09.

    El efecto ocupa solo los laterales del canvas (columnas
    izquierda y derecha), dejando la zona central limpia para
    el robot y el contenido. Las columnas del centro se
    desactivan progresivamente usando una máscara de opacidad
    radial.

  DEPENDENCIAS:
    → #bg-canvas   — canvas compartido con HolographicGrid (F09)
    → css/variables.css (F02) — colores vía getComputedStyle

  TÉCNICA:
    · Columnas de caracteres que caen a velocidades distintas.
    · Cada columna tiene: posición Y, velocidad, opacidad y
      un charset propio (hex o binario, elegido al inicio).
    · El primer carácter de cada columna es más brillante
      (efecto "cabeza de gota").
    · Las columnas reciben una máscara de opacidad basada en
      su posición X — las del centro son casi invisibles.
    · Paleta: cian primario con ocasionales destellos violeta.
    · Se pinta ENCIMA de HolographicGrid (F09) sin clearRect
      propio — comparte el canvas. El clearRect lo hace F09.

  COORDINACIÓN CON F09:
    · HolographicGrid.js pinta primero y limpia el canvas.
    · MatrixRain pinta después con globalCompositeOperation
      'lighter' para blending aditivo sobre el grid.
    · El orden de init() en index.html debe ser:
        1. HolographicGrid.init()
        2. MatrixRain.init()

  API PÚBLICA:
    MatrixRain.init()
    MatrixRain.pause()
    MatrixRain.resume()
    MatrixRain.setDensity(val)    → 0.0 – 1.0 (default: 0.6)
    MatrixRain.setIntensity(val)  → 0.0 – 1.0 (default: 0.7)
    MatrixRain.isReady()          → boolean
    MatrixRain.destroy()

  PRÓXIMO ARCHIVO: F11 · css/layout.css
  ============================================================
*/

'use strict';

const MatrixRain = (() => {

  /* ── Estado ─────────────────────────────────────────────── */
  let _ready         = false;
  let _paused        = false;
  let _canvas        = null;
  let _ctx           = null;
  let _rafId         = null;
  let _intensity     = 0.7;
  let _density       = 0.6;
  let _reducedMotion = false;

  /* Dimensiones */
  let _W = 0;
  let _H = 0;

  /* Animación */
  let _lastTime  = 0;
  let _accumTime = 0;
  const TICK_MS  = 55; // ms entre actualizaciones de columnas (~18fps para el rain)

  /* Columnas */
  let _columns   = [];
  const COL_W    = 16; // ancho de cada columna en px

  /* Charsets */
  const CHARSET_HEX = '0123456789ABCDEF';
  const CHARSET_BIN = '01';
  const CHARSET_MIX = '0123456789ABCDEF01';

  /* ── Leer CSS ───────────────────────────────────────────── */
  function _css(v) {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  }

  /* ── Máscara de opacidad lateral ────────────────────────── */
  // Columnas en el centro → opacidad mínima
  // Columnas en los extremos → opacidad máxima
  function _lateralMask(x) {
    const cx    = _W * 0.5;
    const dist  = Math.abs(x - cx) / cx;   // 0 = centro, 1 = borde
    // Curva: fuerte atenuación en el centro, plena en los bordes
    const mask  = Math.pow(Math.max(0, dist - 0.15) / 0.85, 1.8);
    return Math.min(1, mask);
  }

  /* ── Crear/reiniciar columnas ───────────────────────────── */
  function _initColumns() {
    _columns = [];
    const numCols = Math.ceil(_W / COL_W);

    for (let i = 0; i < numCols; i++) {
      const x    = i * COL_W;
      const mask = _lateralMask(x + COL_W * 0.5);

      // Columnas con mask muy baja (zona central) no se crean
      if (mask < 0.05) continue;

      // Elegir charset: hex en los bordes, binario en zonas intermedias
      let charset;
      if (mask > 0.7)       charset = CHARSET_HEX;
      else if (mask > 0.4)  charset = CHARSET_MIX;
      else                  charset = CHARSET_BIN;

      _columns.push({
        x,
        y:        -(Math.random() * _H),       // arrancan fuera de pantalla
        speed:    2 + Math.random() * 3,        // px por tick
        opacity:  mask * _density,
        mask,
        charset,
        chars:    [],                           // cola de caracteres visibles
        maxLen:   Math.floor(4 + Math.random() * 12), // longitud de la gota
        bright:   Math.random() > 0.7,         // columna más brillante
      });
    }
  }

  /* ── Obtener un carácter aleatorio del charset ──────────── */
  function _randChar(charset) {
    return charset[Math.floor(Math.random() * charset.length)];
  }

  /* ── Actualizar posiciones de columnas ──────────────────── */
  function _updateColumns() {
    for (let i = 0; i < _columns.length; i++) {
      const col = _columns[i];

      // Añadir nuevo carácter a la cola
      col.chars.unshift(_randChar(col.charset));

      // Limitar longitud de la gota
      if (col.chars.length > col.maxLen) {
        col.chars.pop();
      }

      // Avanzar posición Y
      col.y += col.speed;

      // Reiniciar cuando sale por abajo
      if (col.y - col.chars.length * COL_W > _H) {
        col.y     = -(Math.random() * _H * 0.5);
        col.chars = [];
        col.speed = 2 + Math.random() * 3;
        col.maxLen = Math.floor(4 + Math.random() * 12);
      }

      // Mutación aleatoria de caracteres ya pintados (parpadeo de datos)
      if (Math.random() < 0.08) {
        const idx = Math.floor(Math.random() * col.chars.length);
        col.chars[idx] = _randChar(col.charset);
      }
    }
  }

  /* ── Dibujar columnas ───────────────────────────────────── */
  function _drawColumns() {
    const ctx = _ctx;

    ctx.save();
    ctx.font             = `${COL_W - 2}px 'JetBrains Mono', monospace`;
    ctx.textAlign        = 'center';
    ctx.textBaseline     = 'top';
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < _columns.length; i++) {
      const col = _columns[i];
      const baseOpacity = col.opacity * _intensity;
      if (baseOpacity < 0.005) continue;

      const cx = col.x + COL_W * 0.5;

      for (let j = 0; j < col.chars.length; j++) {
        const cy = col.y - j * COL_W;

        // Solo dibujar si está en pantalla
        if (cy < -COL_W || cy > _H) continue;

        // El primer carácter (cabeza) es más brillante — efecto gota
        const isHead = j === 0;
        let alpha;

        if (isHead) {
          // Cabeza: blanco brillante o cian puro
          alpha = baseOpacity * (col.bright ? 1.4 : 1.0);
          alpha = Math.min(1, alpha);
          // Ocasional destello violeta en la cabeza
          if (Math.random() < 0.04) {
            ctx.fillStyle = `rgba(127,90,240,${alpha})`;
          } else if (col.bright) {
            ctx.fillStyle = `rgba(200,255,255,${alpha})`;
          } else {
            ctx.fillStyle = `rgba(0,255,255,${alpha})`;
          }
        } else {
          // Cola: fade hacia atrás
          const fade = (1 - j / col.maxLen);
          alpha = baseOpacity * fade * 0.75;
          ctx.fillStyle = `rgba(0,255,255,${alpha.toFixed(3)})`;
        }

        ctx.fillText(col.chars[j], cx, cy);
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  /* ── Frame ──────────────────────────────────────────────── */
  function _frame(timestamp) {
    _rafId = requestAnimationFrame(_frame);

    if (_paused || _reducedMotion) return;

    const delta = timestamp - (_lastTime || timestamp);
    _lastTime   = timestamp;

    // Acumular tiempo — solo actualizar columnas cada TICK_MS
    _accumTime += delta;
    if (_accumTime >= TICK_MS) {
      _accumTime -= TICK_MS;
      _updateColumns();
    }

    // Siempre dibujar (smooth visual aunque las posiciones no cambien)
    _drawColumns();
  }

  /* ── Resize ─────────────────────────────────────────────── */
  function _resize() {
    _W = window.innerWidth;
    _H = window.innerHeight;
    // No redimensionamos el canvas (F09 lo hace)
    // Solo reiniciamos las columnas con las nuevas dimensiones
    _initColumns();
  }

  /* ── API PÚBLICA ────────────────────────────────────────── */

  function init() {
    if (_ready) return;

    _canvas = document.getElementById('bg-canvas');
    if (!_canvas) {
      console.error('[MatrixRain] No se encontró #bg-canvas.');
      return;
    }

    _ctx = _canvas.getContext('2d');
    if (!_ctx) {
      console.error('[MatrixRain] Canvas 2D no disponible.');
      return;
    }

    _reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener('change', e => { _reducedMotion = e.matches; });

    _W = window.innerWidth;
    _H = window.innerHeight;

    _initColumns();

    window.addEventListener('resize', _resize, { passive: true });

    _rafId = requestAnimationFrame(_frame);

    _ready = true;
    console.log(`[MatrixRain] ✓ ${_columns.length} columnas activas.`);
  }

  function pause()   { _paused = true; }
  function resume()  { _paused = false; }
  function isReady() { return _ready; }

  /**
   * Densidad de columnas activas.
   * @param {number} val — 0.0 (muy pocas) a 1.0 (máximas)
   */
  function setDensity(val) {
    _density = Math.max(0, Math.min(1, val));
    // Recalcular opacidades
    for (let i = 0; i < _columns.length; i++) {
      _columns[i].opacity = _columns[i].mask * _density;
    }
  }

  /**
   * Intensidad visual global (brillo de los caracteres).
   * @param {number} val — 0.0 (invisible) a 1.0 (plena intensidad)
   */
  function setIntensity(val) {
    _intensity = Math.max(0, Math.min(1, val));
  }

  function destroy() {
    if (_rafId) cancelAnimationFrame(_rafId);
    window.removeEventListener('resize', _resize);
    _columns = [];
    _canvas  = null;
    _ctx     = null;
    _ready   = false;
  }

  return {
    init,
    pause,
    resume,
    setDensity,
    setIntensity,
    isReady,
    destroy,
  };

})();

window.MatrixRain = MatrixRain;
