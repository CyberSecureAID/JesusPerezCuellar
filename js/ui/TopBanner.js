/*
  ============================================================
  CYBER PORTFOLIO — F14 · js/ui/TopBanner.js
  ============================================================
  VERSIÓN: 1.0.0 — Banner promocional sobre el hero, cerrable
  y persistente vía localStorage (no vuelve a mostrarse tras
  cerrarlo en la misma sesión de navegador).
  ============================================================
*/

'use strict';

const TopBanner = (() => {

  const STORAGE_KEY = 'jpc_top_banner_dismissed';

  let _banner = null;
  let _closeBtn = null;
  let _ready = false;

  function _dismiss() {
    if (!_banner) return;
    _banner.style.height = `${_banner.offsetHeight}px`;
    requestAnimationFrame(() => {
      _banner.style.transition = 'opacity 200ms ease, height 250ms ease, margin 250ms ease';
      _banner.style.opacity = '0';
      _banner.style.height = '0';
      _banner.style.marginTop = '0';
      _banner.style.overflow = 'hidden';
    });
    setTimeout(() => {
      if (_banner) _banner.hidden = true;
    }, 260);

    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {
      // localStorage no disponible (modo privado, etc.) — no es crítico
    }
  }

  function init() {
    if (_ready) return;

    _banner = document.getElementById('top-banner');
    if (!_banner) return;

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      dismissed = false;
    }

    if (dismissed) {
      _banner.hidden = true;
      _ready = true;
      return;
    }

    _closeBtn = document.getElementById('top-banner-close');
    if (_closeBtn) {
      _closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        _dismiss();
      });
    }

    _ready = true;
  }

  function destroy() {
    if (_closeBtn) {
      _closeBtn.replaceWith(_closeBtn.cloneNode(true));
    }
    _banner = null;
    _closeBtn = null;
    _ready = false;
  }

  return { init, destroy };

})();
