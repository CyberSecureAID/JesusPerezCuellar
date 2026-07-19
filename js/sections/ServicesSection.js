/*
  ============================================================
  CYBER PORTFOLIO — F18 · js/sections/ServicesSection.js
  ============================================================
  ESTADO: ✅ COMPLETADO
  VERSIÓN: 1.0.0
  FASE: 6 de 8

  DESCRIPCIÓN:
    Interactividad de la sección de servicios.
    Hover 3D tilt en cards, íconos SVG animados y modal
    de detalle con información expandida de cada servicio.

  DEPENDENCIAS:
    → index.html (F01) — .service-card, [data-service-id]
    → css/components.css (F12) — .service-modal-backdrop, .glitch-active
    → GlitchEffect.js (F16) — triggerGlitch (opcional)

  FEATURES:
    · Tilt 3D en cards: rotate3d basado en posición del cursor
      dentro de la card (perspectiva 800px)
    · Highlight de brillo que sigue al cursor dentro de la card
    · Modal de detalle por servicio: se abre al hacer click en
      la card o en un botón "Ver más" dinámico que se inyecta
    · Modal accesible: focus trap, Escape para cerrar,
      backdrop click para cerrar, aria-modal, scroll-lock
    · Datos de modal por servicio en objeto _serviceData
    · Reducido-motion: sin tilt, sin highlight, modal sin transición

  API PÚBLICA:
    ServicesSection.init()
    ServicesSection.openModal(serviceId)
    ServicesSection.closeModal()
    ServicesSection.pause()
    ServicesSection.resume()
    ServicesSection.isReady()     → boolean
    ServicesSection.destroy()

  INTEGRACIÓN:
    Descomentar en index.html:
      <script src="js/sections/ServicesSection.js"></script>
    Añadir a la secuencia de init:
      ServicesSection.init();
  ============================================================
*/

'use strict';

const ServicesSection = (() => {

  /* ── Estado ─────────────────────────────────────────────── */
  let _ready         = false;
  let _paused        = false;
  let _reducedMotion = false;
  let _modalOpen     = false;
  let _modalEl       = null;
  let _backdropEl    = null;
  let _lastFocused   = null;

  /* ── Datos del modal por servicio ───────────────────────── */
  const _serviceData = {
    cybersecurity: {
      title:    'Ciberseguridad',
      subtitle: 'Auditoría · Pentesting · Respuesta a Incidentes',
      body: `
        <p>Metodología integral de seguridad ofensiva y defensiva. Cada auditoría cubre
        todas las superficies de ataque relevantes: aplicaciones web, APIs, redes internas,
        infraestructura cloud y factor humano.</p>
        <h4>Proceso de trabajo</h4>
        <ol>
          <li>Reconocimiento y fingerprinting pasivo/activo</li>
          <li>Análisis de vulnerabilidades (OWASP Top 10, CVEs)</li>
          <li>Explotación controlada en entorno acordado</li>
          <li>Post-explotación y escalada de privilegios</li>
          <li>Informe técnico + ejecutivo con CVSS scoring</li>
          <li>Remediación guiada y re-test de vulnerabilidades</li>
        </ol>
        <h4>Herramientas principales</h4>
        <p>Burp Suite Pro · Metasploit · Nmap / Masscan · BloodHound ·
        Nuclei · Shodan · Frida · Ghidra</p>
      `,
      tags: ['OWASP', 'PTES', 'CVSSv3', 'Red Team', 'Bug Bounty'],
    },
    development: {
      title:    'Desarrollo de Software',
      subtitle: 'Full-Stack · APIs · Arquitectura de Sistemas',
      body: `
        <p>Diseño y construcción de sistemas que escalan. Desde MVPs hasta
        plataformas de producción con miles de usuarios concurrentes.
        Arquitectura orientada a seguridad desde el diseño (Secure SDLC).</p>
        <h4>Stack principal</h4>
        <ol>
          <li>Backend: Node.js · Python · Go — microservicios o monolito modular</li>
          <li>Frontend: React · Vanilla JS ES6+ · Three.js · WebGL</li>
          <li>Data: PostgreSQL · MongoDB · Redis · Kafka</li>
          <li>Infra: Docker · Kubernetes · AWS / GCP · Nginx</li>
          <li>CI/CD: GitHub Actions · automated testing · staging environments</li>
        </ol>
        <h4>Garantías</h4>
        <p>Código documentado, testsuite incluido, revisión de seguridad en cada
        entrega y soporte post-lanzamiento.</p>
      `,
      tags: ['Node.js', 'Python', 'React', 'Docker', 'AWS'],
    },
    blockchain: {
      title:    'Blockchain & Web3',
      subtitle: 'Smart Contracts · DeFi · Auditoría · NFT & DAOs',
      body: `
        <p>Especialización completa en el stack Web3: desde el diseño del tokenomics
        hasta el despliegue en mainnet y la auditoría post-producción.
        Énfasis obsesivo en seguridad — cada contrato entregado tiene
        cobertura de ataques conocidos: reentrancy, flash loans, oracle manipulation,
        front-running y más.</p>
        <h4>Servicios blockchain</h4>
        <ol>
          <li>Smart contracts Solidity (ERC-20/721/1155/4626)</li>
          <li>Protocolos DeFi: lending, AMM, staking, yield farming</li>
          <li>Auditoría de seguridad de contratos (manual + Slither/Echidna)</li>
          <li>Integración LayerZero, Chainlink, Uniswap V3</li>
          <li>Frontends Web3 con ethers.js / web3.js</li>
          <li>DAOs con Governor Bravo / OpenZeppelin Governor</li>
        </ol>
        <h4>Chains soportadas</h4>
        <p>Ethereum · BNB Chain · Polygon · Arbitrum · Base · Optimism</p>
      `,
      tags: ['Solidity', 'Hardhat', 'Foundry', 'OpenZeppelin', 'LayerZero'],
    },
    ai: {
      title:    'IA & Tecnologías Emergentes',
      subtitle: 'LLMs · Automatización · Computer Vision · AI Security',
      body: `
        <p>Integración pragmática de inteligencia artificial en productos reales.
        No demos de laboratorio — implementaciones en producción que resuelven
        problemas concretos de negocio y seguridad.</p>
        <h4>Áreas de trabajo</h4>
        <ol>
          <li>LLM integration: OpenAI, Anthropic, Llama — APIs y fine-tuning</li>
          <li>RAG systems y knowledge bases empresariales</li>
          <li>AI para ciberseguridad: detección de anomalías, análisis de logs</li>
          <li>Computer vision con YOLO / MediaPipe para seguridad física</li>
          <li>Agentes autónomos con LangChain / LangGraph</li>
          <li>Automatización inteligente de procesos (RPA + AI)</li>
        </ol>
        <h4>Stack IA</h4>
        <p>Python · TensorFlow · PyTorch · HuggingFace · LangChain ·
        FastAPI · Celery · ChromaDB</p>
      `,
      tags: ['Python', 'LangChain', 'OpenAI', 'TensorFlow', 'RAG'],
    },
  };

  /* ── Helpers ─────────────────────────────────────────────── */
  function _qs(sel, root)  { return (root || document).querySelector(sel); }
  function _qsa(sel, root) { return [...(root || document).querySelectorAll(sel)]; }

  /* ════════════════════════════════════════════════════════
     TILT 3D
     Calcula el ángulo de rotación basado en la posición
     relativa del cursor dentro de la card.
  ════════════════════════════════════════════════════════ */
  function _onCardMouseMove(e, card) {
    if (_reducedMotion || _paused) return;

    const rect     = card.getBoundingClientRect();
    const cx       = rect.left + rect.width  / 2;
    const cy       = rect.top  + rect.height / 2;
    const dx       = (e.clientX - cx) / (rect.width  / 2);  // -1 a 1
    const dy       = (e.clientY - cy) / (rect.height / 2);  // -1 a 1

    const maxTilt  = 8; // grados máximos
    const rotX     = -dy * maxTilt;
    const rotY     =  dx * maxTilt;

    card.style.transform     = `perspective(800px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateZ(4px)`;
    card.style.transition    = 'transform 0.08s ease';

    /* Highlight que sigue al cursor */
    const highlight = card.querySelector('.__card-highlight');
    if (highlight) {
      const px = ((e.clientX - rect.left) / rect.width)  * 100;
      const py = ((e.clientY - rect.top)  / rect.height) * 100;
      highlight.style.background =
        `radial-gradient(circle at ${px.toFixed(1)}% ${py.toFixed(1)}%, rgba(0,255,255,0.07) 0%, transparent 65%)`;
    }
  }

  function _onCardMouseLeave(card) {
    if (_reducedMotion) return;
    card.style.transform  = '';
    card.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1), border-color 0.25s ease, box-shadow 0.4s ease';

    const highlight = card.querySelector('.__card-highlight');
    if (highlight) highlight.style.background = '';
  }

  /* ── Inyectar capa de highlight en cada card ─────────────── */
  function _injectHighlights() {
    _qsa('.service-card').forEach(card => {
      if (card.querySelector('.__card-highlight')) return;
      const div = document.createElement('div');
      div.className  = '__card-highlight';
      div.setAttribute('aria-hidden', 'true');
      div.style.cssText = `
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        transition: background 0.15s ease;
        z-index: 0;
      `;
      /* Asegurar que el contenido quede encima */
      card.style.position = 'relative';
      [...card.children].forEach(child => {
        if (!child.style.position || child.style.position === 'static') {
          child.style.position = 'relative';
          child.style.zIndex   = '1';
        }
      });
      card.prepend(div);
    });
  }

  /* ── Inyectar botón "Ver detalles" en cada card ──────────── */
  function _injectDetailButtons() {
    _qsa('.service-card[data-service-id]').forEach(card => {
      if (card.querySelector('.__detail-btn')) return;

      const btn = document.createElement('button');
      btn.className    = '__detail-btn btn btn--ghost';
      btn.style.cssText = 'margin-top: auto; align-self: flex-start; font-size: 0.75rem;';
      btn.innerHTML    = `
        <span>Ver detalles</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      `;
      btn.setAttribute('aria-label', `Ver detalles del servicio ${card.querySelector('.service-title')?.textContent || ''}`);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = card.dataset.serviceId;
        if (id) openModal(id);
      });

      /* Insertar antes del service-footer si existe */
      const footer = card.querySelector('.service-footer');
      if (footer) {
        card.insertBefore(btn, footer);
      } else {
        card.appendChild(btn);
      }
    });
  }

  /* ════════════════════════════════════════════════════════
     MODAL
  ════════════════════════════════════════════════════════ */

  /* Construir el modal una sola vez y reutilizarlo */
  function _buildModal() {
    if (_backdropEl) return;

    _backdropEl = document.createElement('div');
    _backdropEl.className = 'service-modal-backdrop';
    _backdropEl.setAttribute('role', 'dialog');
    _backdropEl.setAttribute('aria-modal', 'true');
    _backdropEl.setAttribute('aria-labelledby', 'service-modal-title');
    _backdropEl.setAttribute('aria-hidden', 'true');

    _modalEl = document.createElement('div');
    _modalEl.className = 'service-modal';
    _modalEl.innerHTML = `
      <button class="modal-close" id="modal-close-btn" aria-label="Cerrar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <div class="modal-header" style="margin-bottom:1.5rem; padding-right:2rem;">
        <h3 id="service-modal-title" style="font-family:var(--font-display);font-size:var(--text-2xl);font-weight:700;color:var(--color-text-primary);letter-spacing:var(--tracking-tight);margin:0 0 0.25rem;"></h3>
        <p class="modal-subtitle" style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-cyan-300);letter-spacing:var(--tracking-code);margin:0;"></p>
      </div>
      <div class="modal-body" style="font-size:var(--text-sm);line-height:var(--leading-relaxed);color:var(--color-text-secondary);max-height:55vh;overflow-y:auto;padding-right:0.5rem;"></div>
      <div class="modal-tags" style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--color-border);"></div>
    `;

    /* Estilos extra para el body del modal */
    const style = document.createElement('style');
    style.textContent = `
      .modal-body h4 {
        font-family: var(--font-display);
        font-size: var(--text-xs);
        font-weight: 600;
        letter-spacing: var(--tracking-widest);
        text-transform: uppercase;
        color: var(--color-cyan-300);
        margin: 1.25rem 0 0.5rem;
        padding-bottom: 0.375rem;
        border-bottom: 1px solid var(--color-border-cyan);
      }
      .modal-body ol {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
        padding: 0;
        margin: 0;
      }
      .modal-body ol li::before {
        content: '›';
        color: var(--color-cyan-300);
        font-weight: 700;
        margin-right: 0.5rem;
      }
      .modal-body p { margin: 0.5rem 0 0; }
      .modal-body::-webkit-scrollbar { width: 3px; }
      .modal-body::-webkit-scrollbar-thumb { background: var(--color-cyan-200); border-radius: 9999px; }
    `;
    document.head.appendChild(style);

    _backdropEl.appendChild(_modalEl);
    document.body.appendChild(_backdropEl);

    /* Cerrar al hacer click en el backdrop */
    _backdropEl.addEventListener('click', (e) => {
      if (e.target === _backdropEl) closeModal();
    });

    /* Botón de cierre */
    _modalEl.querySelector('#modal-close-btn').addEventListener('click', closeModal);

    /* Escape */
    document.addEventListener('keydown', _onKeyDown);
  }

  function _onKeyDown(e) {
    if (!_modalOpen) return;
    if (e.key === 'Escape') {
      closeModal();
      return;
    }
    /* Focus trap */
    if (e.key === 'Tab') {
      const focusable = _qsa(
        'a[href],button:not([disabled]),input,textarea,select,[tabindex]:not([tabindex="-1"])',
        _modalEl
      );
      if (!focusable.length) { e.preventDefault(); return; }
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  }

  function _populateModal(serviceId) {
    const data = _serviceData[serviceId];
    if (!data || !_modalEl) return;

    _modalEl.querySelector('#service-modal-title').textContent  = data.title;
    _modalEl.querySelector('.modal-subtitle').textContent = data.subtitle;
    _modalEl.querySelector('.modal-body').innerHTML       = data.body;

    const tagsEl = _modalEl.querySelector('.modal-tags');
    tagsEl.innerHTML = data.tags.map(t => `<span class="tag">${t}</span>`).join('');
  }

  /* ── API: openModal ──────────────────────────────────────── */
  function openModal(serviceId) {
    if (!_serviceData[serviceId] || !_backdropEl) return;

    _lastFocused = document.activeElement;
    _populateModal(serviceId);

    _backdropEl.setAttribute('aria-hidden', 'false');
    _backdropEl.classList.add('is-open');
    _modalOpen = true;

    /* Scroll lock */
    document.body.style.overflow = 'hidden';

    /* Focus al botón de cierre */
    requestAnimationFrame(() => {
      const closeBtn = _modalEl.querySelector('#modal-close-btn');
      if (closeBtn) closeBtn.focus();
    });

    /* Glitch sync */
    if (window.GlitchEffect && window.GlitchEffect.isReady()) {
      const titleEl = _modalEl.querySelector('#service-modal-title');
      if (titleEl) window.GlitchEffect.trigger(titleEl, { duration: 280, intensity: 0.7, robot: true });
    } else if (window.RobotAnimations && window.RobotAnimations.isReady()) {
      window.RobotAnimations.triggerGlitch(0.28, 0.6);
    }
  }

  /* ── API: closeModal ─────────────────────────────────────── */
  function closeModal() {
    if (!_modalOpen || !_backdropEl) return;

    _backdropEl.classList.remove('is-open');
    _backdropEl.setAttribute('aria-hidden', 'true');
    _modalOpen = false;

    document.body.style.overflow = '';

    /* Restaurar foco */
    if (_lastFocused && _lastFocused.focus) {
      setTimeout(() => _lastFocused.focus(), 50);
    }
  }

  /* ════════════════════════════════════════════════════════
     BIND DE EVENTOS EN CARDS
  ════════════════════════════════════════════════════════ */
  function _bindCards() {
    _qsa('.service-card').forEach(card => {
      /* Tilt 3D */
      card.addEventListener('mousemove',  e => _onCardMouseMove(e, card), { passive: true });
      card.addEventListener('mouseleave', ()  => _onCardMouseLeave(card));

      /* Click en la card abre modal (si tiene data-service-id) */
      card.addEventListener('click', (e) => {
        /* Evitar doble-trigger si el click viene del botón interno */
        if (e.target.closest('.__detail-btn, a, button')) return;
        const id = card.dataset.serviceId;
        if (id) openModal(id);
      });

      /* Accesibilidad: Enter/Space en la card */
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const id = card.dataset.serviceId;
          if (id) openModal(id);
        }
      });
    });
  }

  /* ── API PÚBLICA ─────────────────────────────────────────── */

  function init() {
    if (_ready) return;

    _reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener('change', e => { _reducedMotion = e.matches; });

    _injectHighlights();
    _injectDetailButtons();
    _buildModal();
    _bindCards();

    _ready = true;
    console.log('[ServicesSection] ✓ Tilt 3D y modal activos.');
  }

  function pause()   { _paused = true; }
  function resume()  { _paused = false; }
  function isReady() { return _ready; }

  function destroy() {
    document.removeEventListener('keydown', _onKeyDown);

    if (_backdropEl && _backdropEl.parentNode) {
      _backdropEl.parentNode.removeChild(_backdropEl);
    }

    _qsa('.service-card').forEach(card => {
      card.style.transform  = '';
      card.style.transition = '';
      card.replaceWith(card.cloneNode(true)); // elimina listeners
    });

    _backdropEl = null;
    _modalEl    = null;
    _ready      = false;

    console.log('[ServicesSection] Destruido.');
  }

  return {
    init,
    openModal,
    closeModal,
    pause,
    resume,
    isReady,
    destroy,
  };

})();

window.ServicesSection = ServicesSection;
