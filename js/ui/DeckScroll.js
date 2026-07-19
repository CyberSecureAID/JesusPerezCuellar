/*
  ============================================================
  CYBER PORTFOLIO — js/ui/DeckScroll.js
  ============================================================
  VERSIÓN: 1.0.0

  DESCRIPCIÓN:
    "Scroll sin scroll". Las secciones se apilan en una ventana
    FIJA y, al hacer scroll (rueda / táctil / teclado), la sección
    activa se DESVANECE y aparece la siguiente superpuesta —
    nunca se baja realmente. Cada sección lleva su imagen de fondo,
    así el crossfade encadena "fotogramas" y da sensación de
    movimiento (entrar a un lugar).

    Si una sección es más alta que la pantalla, primero se
    desplaza por dentro; al llegar al final, el siguiente gesto
    hace el crossfade a la próxima sección (y al revés).

  SEGURIDAD:
    · Solo se activa si NO hay prefers-reduced-motion.
    · Añade la clase .deck-on al <html>; sin JS o con reduced-motion
      el sitio queda como scroll normal (nada se rompe).

  API:
    DeckScroll.init()  ·  DeckScroll.goTo(i)  ·  DeckScroll.destroy()
  ============================================================
*/

'use strict';

window.DeckScroll = (function () {

  const FADE_MS   = 700;    // duración del crossfade
  const LOCK_MS   = 820;    // bloqueo entre cambios (evita saltar varias)
  const WHEEL_MIN = 18;     // umbral de rueda para contar como gesto
  const SWIPE_MIN = 45;     // umbral de swipe táctil (px)
  const EDGE_TOL  = 4;      // tolerancia de píxel para "fin/inicio" de scroll interno

  let _panels   = [];
  let _idx      = 0;
  let _busy     = false;
  let _ready    = false;
  let _reduced  = false;
  let _touchY   = null;
  let _lastNav  = 0;

  function _qsa(sel, root) { return [...(root || document).querySelectorAll(sel)]; }

  /* ── Selección y orden de paneles ─────────────────────────── */
  function _collect() {
    // Todas las secciones + el footer, en orden del documento.
    _panels = _qsa('#main-content > section');
    const footer = document.getElementById('footer');
    if (footer) _panels.push(footer);
    return _panels.length > 0;
  }

  /* ── Activar un panel por índice ──────────────────────────── */
  function _activate(i, initial) {
    if (i < 0 || i >= _panels.length) return;
    if (i === _idx && !initial) return;

    const prev = _panels[_idx];
    const next = _panels[i];
    _idx = i;

    _panels.forEach((p, k) => {
      const active = (k === i);
      p.classList.toggle('is-active', active);
      p.setAttribute('aria-hidden', active ? 'false' : 'true');
      // reinicia el scroll interno del panel que entra
      if (active) { try { p.scrollTop = 0; } catch (e) {} }
    });

    _updateNav();

    if (!initial) {
      _busy = true;
      setTimeout(() => { _busy = false; }, LOCK_MS);
    }
  }

  function goTo(i) { _activate(i, false); }

  /* ── Nav activo ───────────────────────────────────────────── */
  function _updateNav() {
    const id = _panels[_idx] ? _panels[_idx].id : null;
    document.querySelectorAll('.nav-link').forEach(a => {
      const href = (a.getAttribute('href') || '').replace('#', '');
      a.classList.toggle('is-active', href === id);
    });
  }

  /* ── ¿El panel activo puede seguir desplazándose por dentro? ─ */
  function _canScrollDown(el) {
    return el.scrollHeight - el.clientHeight - el.scrollTop > EDGE_TOL;
  }
  function _canScrollUp(el) {
    return el.scrollTop > EDGE_TOL;
  }

  /* ── Avanzar / retroceder ─────────────────────────────────── */
  function _next() { if (_idx < _panels.length - 1) _activate(_idx + 1, false); }
  function _prev() { if (_idx > 0) _activate(_idx - 1, false); }

  /* ── Manejo de gestos ─────────────────────────────────────── */
  function _onWheel(e) {
    const el = _panels[_idx];
    if (!el) return;
    const down = e.deltaY > 0;
    // Si el panel puede desplazarse por dentro en esa dirección, deja el scroll nativo.
    if (down && _canScrollDown(el)) return;
    if (!down && _canScrollUp(el)) return;
    // Estamos en el borde → hacemos crossfade y bloqueamos el scroll real.
    e.preventDefault();
    if (_busy || Math.abs(e.deltaY) < WHEEL_MIN) return;
    down ? _next() : _prev();
  }

  function _onTouchStart(e) { _touchY = e.touches[0].clientY; }
  function _onTouchMove(e) {
    if (_touchY === null) return;
    const el = _panels[_idx];
    if (!el) return;
    const dy = _touchY - e.touches[0].clientY;   // >0 = arrastra hacia arriba = avanzar
    const down = dy > 0;
    if (down && _canScrollDown(el)) return;
    if (!down && _canScrollUp(el)) return;
    e.preventDefault();
    if (_busy || Math.abs(dy) < SWIPE_MIN) return;
    down ? _next() : _prev();
    _touchY = e.touches[0].clientY;
  }
  function _onTouchEnd() { _touchY = null; }

  function _onKey(e) {
    const el = _panels[_idx];
    if (!el) return;
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
      if (_canScrollDown(el)) return;
      e.preventDefault(); _next();
    } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
      if (_canScrollUp(el)) return;
      e.preventDefault(); _prev();
    } else if (e.key === 'Home') { e.preventDefault(); _activate(0, false); }
      else if (e.key === 'End')  { e.preventDefault(); _activate(_panels.length - 1, false); }
  }

  /* ── Navegación por los enlaces de ancla ──────────────────── */
  function _onNavClick(e) {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').replace('#', '');
    const target = _panels.findIndex(p => p.id === id);
    if (target === -1) return;
    e.preventDefault();
    // pequeño anti-rebote para clics repetidos
    const now = Date.now();
    if (now - _lastNav < 250) return;
    _lastNav = now;
    _busy = false;            // los clics de nav SIEMPRE responden (arregla "Inicio no hace nada")
    _activate(target, false);
    // cerrar menú móvil si estuviera abierto
    const mob = document.getElementById('nav-links-mobile');
    const tog = document.getElementById('nav-toggle');
    if (mob && !mob.hidden) { mob.hidden = true; tog && tog.setAttribute('aria-expanded', 'false'); }
  }

  /* ── Init ─────────────────────────────────────────────────── */
  function init() {
    if (_ready) return;
    _reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (_reduced) return;                 // sin efecto: scroll normal
    if (!_collect()) return;

    document.documentElement.classList.add('deck-on');
    _activate(0, true);

    window.addEventListener('wheel', _onWheel, { passive: false });
    window.addEventListener('touchstart', _onTouchStart, { passive: true });
    window.addEventListener('touchmove', _onTouchMove, { passive: false });
    window.addEventListener('touchend', _onTouchEnd, { passive: true });
    window.addEventListener('keydown', _onKey);
    // Captura de clics de nav (logo, links desktop y móvil, footer, botones internos)
    document.addEventListener('click', _onNavClick, true);

    _ready = true;
    console.log('[DeckScroll] ✓ ' + _panels.length + ' paneles.');
  }

  function destroy() {
    document.documentElement.classList.remove('deck-on');
    window.removeEventListener('wheel', _onWheel);
    window.removeEventListener('touchstart', _onTouchStart);
    window.removeEventListener('touchmove', _onTouchMove);
    window.removeEventListener('touchend', _onTouchEnd);
    window.removeEventListener('keydown', _onKey);
    document.removeEventListener('click', _onNavClick, true);
    _panels.forEach(p => { p.classList.remove('is-active'); p.removeAttribute('aria-hidden'); });
    _ready = false;
  }

  return { init, goTo, destroy, isReady: () => _ready };
})();
