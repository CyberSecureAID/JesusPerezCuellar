/*
  ============================================================
  CYBER PORTFOLIO — F14 · js/ui/TopBanner.js
  ============================================================
  VERSIÓN: 2.0.0 — El banner de portada es permanente.
  Ya NO es descartable: se eliminó el botón de cerrar y la
  persistencia en localStorage. Sirve como cabecera de inicio
  (ancla #inicio) y siempre está visible.
  ============================================================
*/

'use strict';

const TopBanner = (() => {

  // Clave antigua: se limpia por si algún visitante cerró el banner
  // en la versión anterior y quedó oculto en su navegador.
  const LEGACY_KEY = 'jpc_top_banner_dismissed';

  let _ready = false;

  function init() {
    if (_ready) return;

    try { localStorage.removeItem(LEGACY_KEY); } catch (e) {}

    const banner = document.getElementById('inicio')
                || document.querySelector('.top-banner');

    // Aseguramos que siempre se vea (revierte cualquier estado previo).
    if (banner) {
      banner.hidden = false;
      banner.style.removeProperty('height');
      banner.style.removeProperty('opacity');
      banner.style.removeProperty('overflow');
    }

    _ready = true;
  }

  function destroy() { _ready = false; }

  return { init, destroy };

})();
