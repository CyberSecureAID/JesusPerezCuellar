/*
  ============================================================
  CYBER PORTFOLIO — js/ui/MagneticButtons.js
  ============================================================
  VERSIÓN: 1.0.0

  DESCRIPCIÓN:
    Efecto "magnético" premium: los botones se atraen sutilmente
    hacia el cursor mientras se les pasa por encima y vuelven a
    su sitio con un rebote suave (spring) al salir.

  COMPORTAMIENTO:
    · Solo en dispositivos con puntero fino (ratón/trackpad).
    · Respeta prefers-reduced-motion (se desactiva por completo).
    · No pelea con el translateY(-1px) del hover: durante el
      efecto el transform inline manda, y al salir se limpia.

  API PÚBLICA:
    MagneticButtons.init()
    MagneticButtons.pause()
    MagneticButtons.resume()
    MagneticButtons.destroy()
    MagneticButtons.isReady()
  ============================================================
*/

'use strict';

window.MagneticButtons = (function () {

  const SELECTOR   = '.btn, .nav-link--cta, .social-link';
  const STRENGTH   = 0.28;   // 0 = nada, 1 = sigue al cursor 1:1
  const MAX_SHIFT  = 14;     // desplazamiento máximo en px (evita saltos feos)

  let _ready    = false;
  let _paused   = false;
  let _bound    = [];        // { el, move, leave } para poder destruir
  let _enabled  = false;

  function _canRun() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePtr = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    return finePtr && !reduced;
  }

  function _clamp(v, max) {
    return Math.max(-max, Math.min(max, v));
  }

  function _bind(el) {
    function move(e) {
      if (_paused) return;
      const r  = el.getBoundingClientRect();
      const mx = e.clientX - (r.left + r.width  / 2);
      const my = e.clientY - (r.top  + r.height / 2);
      const x  = _clamp(mx * STRENGTH, MAX_SHIFT);
      const y  = _clamp(my * STRENGTH, MAX_SHIFT);
      el.style.transition = 'transform 60ms linear';
      el.style.transform  = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
    function leave() {
      // Rebote suave de vuelta al origen
      el.style.transition = 'transform 0.5s cubic-bezier(0.34,1.25,0.64,1)';
      el.style.transform  = '';
    }
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    _bound.push({ el, move, leave });
  }

  function init() {
    if (_ready) return;
    _enabled = _canRun();
    if (!_enabled) { _ready = true; return; }  // en táctil/reduced-motion no hace nada

    document.querySelectorAll(SELECTOR).forEach(_bind);
    _ready = true;
    console.log(`[MagneticButtons] ✓ ${_bound.length} botones magnéticos.`);
  }

  function pause()  { _paused = true; }
  function resume() { _paused = false; }
  function isReady() { return _ready; }

  function destroy() {
    _bound.forEach(({ el, move, leave }) => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      el.style.transition = '';
      el.style.transform  = '';
    });
    _bound = [];
    _ready = false;
  }

  return { init, pause, resume, isReady, destroy };
})();
