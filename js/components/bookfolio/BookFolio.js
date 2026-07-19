/**
 * ════════════════════════════════════════════════════════════════════════════
 * BookFolio — Galería profesional de proyectos con panel admin
 * ════════════════════════════════════════════════════════════════════════════
 * VERSIÓN: 4.0.0
 *
 * CARACTERÍSTICAS:
 *  · Grid de tarjetas con hover 3D tilt + glow cian/violeta
 *  · Modal de detalle por proyecto (imagen, descripción, link)
 *  · Filtro por categoría con animación FLIP
 *  · Panel admin oculto: 5 clicks en esquina inferior izquierda
 *  · CRUD completo: crear, editar, eliminar proyectos
 *  · Persistencia en localStorage (datos + orden)
 *  · Diseño 100% coherente con el sistema de diseño del portfolio
 *
 * DATOS DE PROYECTOS (localStorage key: 'bookfolio_projects')
 *  Cada proyecto: { id, title, category, description, link, image }
 *
 * ACCESO ADMIN:
 *  5 clicks en el trigger (div invisible esquina inferior izquierda)
 */

'use strict';

class BookFolio {

  /* ─── Constructor ──────────────────────────────────────────────── */
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!this.container) {
      console.warn('[BookFolio] Contenedor no encontrado.');
      return;
    }

    this._defaultProjects = options.projects || [];

    this._projects      = [];
    this._activeFilter  = 'all';
    /* Paginación: cuántas tarjetas se muestran de entrada y cuántas
       añade cada "Ver más". Evita volcar los 50 proyectos de golpe. */
    this._pageSize      = options.pageSize || 9;
    this._visibleCount  = this._pageSize;
    this._modalOpen     = false;
    this._modalProject  = null;
    this._adminOpen     = false;
    this._editingId     = null;
    this._clickCount    = 0;
    this._clickTimer    = null;
    this._reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this._categories = ['Web3', 'DeFi', 'Dev', 'Trading', 'Blockchain', 'Tools', 'Otro'];

    this._injectStyles();
    this._loadProjects();
    this._render();
    this._bindAdmin();
  }

  /* ═══════════════════════════════════════════════════════════════
     PERSISTENCIA
  ═══════════════════════════════════════════════════════════════ */

  _loadProjects() {
    /* Fuente de la verdad: projects.js (window.NP_PROJECTS). Se ignora
       cualquier copia vieja en localStorage para que los cambios siempre salgan. */
    this._projects = this._defaultProjects.map((p, i) => ({
      id:          p.id || `p_${Date.now()}_${i}`,
      title:       p.title       || 'Proyecto sin título',
      category:    p.category    || 'Dev',
      description: p.description || '',
      link:        p.link        || '#',
      image:       p.image       || '',
    }));
    this._saveProjects();
  }

  _saveProjects() {
    try {
      localStorage.setItem('bookfolio_projects', JSON.stringify(this._projects));
    } catch (_) {}
  }

  _generateId() {
    return `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  /* ═══════════════════════════════════════════════════════════════
     RENDER PRINCIPAL
  ═══════════════════════════════════════════════════════════════ */

  _render() {
    this.container.innerHTML = `
      <div class="bpf-wrapper" id="bpf-wrapper">

        <div class="bpf-header">
          <div class="bpf-eyebrow">
            <span class="bpf-eyebrow-code">// 04</span>
            <span class="bpf-eyebrow-label">PROYECTOS</span>
          </div>
          <h2 class="bpf-section-title">Proyectos desplegados</h2>
          <p class="bpf-section-sub">Una selección de trabajos. El repositorio completo está en GitHub.</p>
        </div>

        <div class="bpf-grid" id="bpf-grid" aria-live="polite"></div>

        <div class="bpf-loadmore">
          <a class="bpf-loadmore-btn" href="https://github.com/CyberSecureAID" target="_blank" rel="noopener">
            Ver todos los proyectos en GitHub
            <span aria-hidden="true">→</span>
          </a>
        </div>

        <div class="bpf-empty" id="bpf-empty" hidden>
          <div class="bpf-empty-icon">⬡</div>
          <p class="bpf-empty-text">No hay proyectos en esta categoría.</p>
        </div>

      </div>

      <!-- MODAL DE PROYECTO -->
      <div class="bpf-modal-backdrop" id="bpf-modal-backdrop" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="bpf-modal-title">
        <div class="bpf-modal" id="bpf-modal">
          <button class="bpf-modal-close" id="bpf-modal-close" aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div class="bpf-modal-img-wrap">
            <img id="bpf-modal-img" src="" alt="" class="bpf-modal-img">
            <div class="bpf-modal-img-overlay"></div>
          </div>
          <div class="bpf-modal-body">
            <div class="bpf-modal-meta">
              <span class="bpf-modal-cat" id="bpf-modal-cat"></span>
            </div>
            <h3 class="bpf-modal-title" id="bpf-modal-title"></h3>
            <p class="bpf-modal-desc" id="bpf-modal-desc"></p>
            <div class="bpf-modal-actions">
              <a class="bpf-modal-link btn btn--primary" id="bpf-modal-link" href="#" target="_blank" rel="noopener">
                Ver proyecto
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- PANEL ADMIN -->
      <div class="bpf-admin-backdrop" id="bpf-admin-backdrop" aria-hidden="true">
        <div class="bpf-admin-panel" id="bpf-admin-panel" role="dialog" aria-modal="true" aria-label="Panel de administración">

          <div class="bpf-admin-header">
            <div class="bpf-admin-header-left">
              <span class="bpf-admin-eyebrow">// ADMIN</span>
              <h2 class="bpf-admin-title">Panel de Proyectos</h2>
            </div>
            <button class="bpf-admin-close" id="bpf-admin-close" aria-label="Cerrar panel">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="bpf-admin-body">

            <div class="bpf-admin-form-col">
              <div class="bpf-admin-form-title" id="bpf-form-mode-label">Nuevo Proyecto</div>
              <div class="bpf-admin-form" id="bpf-form">

                <div class="bpf-form-group">
                  <label class="bpf-form-label" for="bpf-input-title">
                    <span class="bpf-form-label-code">01.</span> Nombre del proyecto
                  </label>
                  <input type="text" id="bpf-input-title" class="bpf-form-input" placeholder="MiSwap — Token Sale dApp" maxlength="80" autocomplete="off">
                  <span class="bpf-form-error" id="bpf-err-title"></span>
                </div>

                <div class="bpf-form-group">
                  <label class="bpf-form-label" for="bpf-input-category">
                    <span class="bpf-form-label-code">02.</span> Categoría
                  </label>
                  <select id="bpf-input-category" class="bpf-form-input bpf-form-select">
                    ${this._categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                  </select>
                </div>

                <div class="bpf-form-group">
                  <label class="bpf-form-label" for="bpf-input-desc">
                    <span class="bpf-form-label-code">03.</span> Descripción
                  </label>
                  <textarea id="bpf-input-desc" class="bpf-form-input bpf-form-textarea" placeholder="Describe el proyecto, tecnologías usadas, resultados..." rows="4" maxlength="500"></textarea>
                  <div class="bpf-char-counter"><span id="bpf-desc-count">0</span> / 500</div>
                  <span class="bpf-form-error" id="bpf-err-desc"></span>
                </div>

                <div class="bpf-form-group">
                  <label class="bpf-form-label" for="bpf-input-link">
                    <span class="bpf-form-label-code">04.</span> URL del proyecto
                  </label>
                  <input type="url" id="bpf-input-link" class="bpf-form-input" placeholder="https://miswap.online" autocomplete="off">
                  <span class="bpf-form-error" id="bpf-err-link"></span>
                </div>

                <div class="bpf-form-group">
                  <label class="bpf-form-label" for="bpf-input-image">
                    <span class="bpf-form-label-code">05.</span> Ruta de imagen
                  </label>
                  <input type="text" id="bpf-input-image" class="bpf-form-input" placeholder="assets/projects/images/image1.webp" autocomplete="off">
                  <div class="bpf-image-preview-wrap">
                    <img id="bpf-img-preview" class="bpf-img-preview" src="" alt="" hidden>
                    <span class="bpf-img-preview-placeholder" id="bpf-img-placeholder">Vista previa de imagen</span>
                  </div>
                  <span class="bpf-form-error" id="bpf-err-image"></span>
                </div>

                <div class="bpf-form-actions">
                  <button class="bpf-btn-save" id="bpf-btn-save">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                    </svg>
                    <span id="bpf-btn-save-text">Guardar proyecto</span>
                  </button>
                  <button class="bpf-btn-cancel" id="bpf-btn-cancel" hidden>Cancelar edición</button>
                </div>

              </div>
            </div>

            <div class="bpf-admin-list-col">
              <div class="bpf-admin-list-header">
                <span class="bpf-admin-form-title">Proyectos guardados</span>
                <span class="bpf-admin-project-count" id="bpf-admin-count">0 proyectos</span>
              </div>
              <div class="bpf-admin-list" id="bpf-admin-list"></div>
            </div>

          </div>

        </div>
      </div>

      <!-- TRIGGER OCULTO ADMIN -->
      <div class="bpf-admin-trigger" id="bpf-admin-trigger" aria-hidden="true" title=""></div>
    `;

    this._updateFilterCounts();
    this._renderGrid();
    this._bindEvents();
  }

  /* ═══════════════════════════════════════════════════════════════
     RENDER DEL GRID
  ═══════════════════════════════════════════════════════════════ */

  _getFilteredProjects() {
    if (this._activeFilter === 'all') return this._projects;
    return this._projects.filter(p => p.category === this._activeFilter);
  }

  _renderGrid() {
    const grid  = document.getElementById('bpf-grid');
    const empty = document.getElementById('bpf-empty');
    if (!grid) return;

    const filtered = this._getFilteredProjects();
    empty.hidden = filtered.length > 0;

    const visible = filtered;

    grid.innerHTML = visible.map((p, i) => `
      <article class="bpf-card" data-id="${p.id}" data-index="${i}"
        tabindex="0" role="button"
        aria-label="Ver proyecto: ${this._esc(p.title)}"
        style="animation-delay:0ms">
        <div class="bpf-card-img-wrap">
          ${p.image
            ? `<img class="bpf-card-img" src="${this._esc(p.image)}" alt="${this._esc(p.title)}" loading="eager" decoding="async" fetchpriority="high" onerror="this.style.display='none'">`
            : ''
          }
          <div class="bpf-card-img-fallback" aria-hidden="true"><span>⬡</span></div>
          <div class="bpf-card-overlay" aria-hidden="true">
            <span class="bpf-card-view-btn">Ver proyecto →</span>
          </div>
        </div>
        <div class="bpf-card-body">
          <div class="bpf-card-meta">
            <span class="bpf-card-cat">${this._esc(p.category)}</span>
          </div>
          <h3 class="bpf-card-title">${this._esc(p.title)}</h3>
          <p class="bpf-card-desc">${this._esc(p.description)}</p>
        </div>
        <div class="bpf-card-corner bpf-card-corner--tl" aria-hidden="true"></div>
        <div class="bpf-card-corner bpf-card-corner--tr" aria-hidden="true"></div>
        <div class="bpf-card-corner bpf-card-corner--bl" aria-hidden="true"></div>
        <div class="bpf-card-corner bpf-card-corner--br" aria-hidden="true"></div>
      </article>
    `).join('');

    grid.querySelectorAll('.bpf-card').forEach(card => {
      card.addEventListener('click',   () => this._openModal(card.dataset.id));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._openModal(card.dataset.id);
        }
      });
      if (!this._reducedMotion) {
        card.addEventListener('mousemove',  e => this._onCardTilt(e, card));
        card.addEventListener('mouseleave', ()  => this._onCardReset(card));
      }
    });
  }

  _updateFilterCounts() {
    const allCount = document.getElementById('bpf-count-all');
    if (allCount) allCount.textContent = this._projects.length ? `(${this._projects.length})` : '';
    this._categories.forEach(cat => {
      const el = document.getElementById(`bpf-count-${cat.toLowerCase()}`);
      if (!el) return;
      const n = this._projects.filter(p => p.category === cat).length;
      el.textContent = n ? `(${n})` : '';
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     TILT 3D
  ═══════════════════════════════════════════════════════════════ */

  _onCardTilt(e, card) {
    const rect = card.getBoundingClientRect();
    const dx   = (e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2);
    const dy   = (e.clientY - rect.top  - rect.height / 2) / (rect.height / 2);
    card.style.transform  = `perspective(900px) rotateX(${(-dy * 7).toFixed(2)}deg) rotateY(${(dx * 7).toFixed(2)}deg) translateZ(6px)`;
    card.style.transition = 'transform 0.08s ease';
  }

  _onCardReset(card) {
    card.style.transform  = '';
    card.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1)';
  }

  /* ═══════════════════════════════════════════════════════════════
     MODAL
  ═══════════════════════════════════════════════════════════════ */

  _openModal(id) {
    const p = this._projects.find(x => x.id === id);
    if (!p) return;
    this._modalProject = p;
    this._modalOpen    = true;

    const img = document.getElementById('bpf-modal-img');
    img.src   = p.image || '';
    img.alt   = p.title;
    img.style.display = p.image ? '' : 'none';

    document.getElementById('bpf-modal-cat').textContent   = p.category;
    document.getElementById('bpf-modal-title').textContent = p.title;
    document.getElementById('bpf-modal-desc').textContent  = p.description;

    const linkEl = document.getElementById('bpf-modal-link');
    linkEl.href = p.link || '#';
    linkEl.style.display = (p.link && p.link !== '#') ? '' : 'none';

    const backdrop = document.getElementById('bpf-modal-backdrop');
    backdrop.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('bpf-modal-backdrop--open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('bpf-modal-close')?.focus(), 60);
  }

  _closeModal() {
    this._modalOpen = false;
    const backdrop = document.getElementById('bpf-modal-backdrop');
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('bpf-modal-backdrop--open');
    document.body.style.overflow = '';
  }

  /* ═══════════════════════════════════════════════════════════════
     FILTROS
  ═══════════════════════════════════════════════════════════════ */

  _applyFilter(cat) {
    if (cat === this._activeFilter) return;
    this._activeFilter = cat;
    /* Al cambiar de categoría se vuelve a la primera "página". */
    this._visibleCount = this._pageSize;

    document.querySelectorAll('.bpf-filter-btn').forEach(btn => {
      const active = btn.dataset.filter === cat;
      btn.classList.toggle('bpf-filter-btn--active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    const grid = document.getElementById('bpf-grid');
    if (!this._reducedMotion) {
      grid.style.opacity   = '0';
      grid.style.transform = 'translateY(8px)';
      setTimeout(() => {
        this._renderGrid();
        grid.style.transition = 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.23,1,0.32,1)';
        grid.style.opacity    = '1';
        grid.style.transform  = 'translateY(0)';
      }, 180);
    } else {
      this._renderGrid();
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     ADMIN — APERTURA SECRETA
  ═══════════════════════════════════════════════════════════════ */

  _bindAdmin() { /* enlazado en _bindEvents */ }

  _handleSecretClick() {
    this._clickCount++;
    clearTimeout(this._clickTimer);
    if (this._clickCount >= 5) {
      this._clickCount = 0;
      this._openAdmin();
      return;
    }
    this._clickTimer = setTimeout(() => { this._clickCount = 0; }, 2000);
  }

  _openAdmin() {
    this._adminOpen = true;
    this._resetAdminForm();
    this._renderAdminList();
    const backdrop = document.getElementById('bpf-admin-backdrop');
    backdrop.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('bpf-admin-backdrop--open');
    document.body.style.overflow = 'hidden';
    document.getElementById('bpf-input-title')?.focus();
  }

  _closeAdmin() {
    this._adminOpen = false;
    const backdrop = document.getElementById('bpf-admin-backdrop');
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('bpf-admin-backdrop--open');
    document.body.style.overflow = '';
    this._resetAdminForm();
  }

  /* ═══════════════════════════════════════════════════════════════
     ADMIN — CRUD
  ═══════════════════════════════════════════════════════════════ */

  _resetAdminForm() {
    this._editingId = null;
    const fields = ['title','category','desc','link','image'];
    const defaults = { category: this._categories[0] };
    fields.forEach(f => {
      const el = document.getElementById(`bpf-input-${f}`);
      if (el) el.value = defaults[f] || '';
    });
    document.getElementById('bpf-desc-count').textContent      = '0';
    document.getElementById('bpf-img-preview').hidden          = true;
    document.getElementById('bpf-img-placeholder').hidden      = false;
    document.getElementById('bpf-btn-save-text').textContent   = 'Guardar proyecto';
    document.getElementById('bpf-form-mode-label').textContent = 'Nuevo Proyecto';
    document.getElementById('bpf-btn-cancel').hidden           = true;
    ['title','desc','link','image'].forEach(k => {
      const err = document.getElementById(`bpf-err-${k}`);
      if (err) err.textContent = '';
    });
  }

  _fillFormForEdit(p) {
    this._editingId = p.id;
    document.getElementById('bpf-input-title').value    = p.title;
    document.getElementById('bpf-input-category').value = p.category;
    document.getElementById('bpf-input-desc').value     = p.description;
    document.getElementById('bpf-input-link').value     = p.link || '';
    document.getElementById('bpf-input-image').value    = p.image || '';
    document.getElementById('bpf-desc-count').textContent      = (p.description || '').length;
    document.getElementById('bpf-btn-save-text').textContent   = 'Actualizar proyecto';
    document.getElementById('bpf-form-mode-label').textContent = 'Editando Proyecto';
    document.getElementById('bpf-btn-cancel').hidden           = false;
    this._updateImagePreview(p.image || '');
    document.getElementById('bpf-input-title')?.focus();
  }

  _validateForm() {
    let ok = true;
    const title = document.getElementById('bpf-input-title').value.trim();
    const desc  = document.getElementById('bpf-input-desc').value.trim();
    const link  = document.getElementById('bpf-input-link').value.trim();

    if (!title) {
      document.getElementById('bpf-err-title').textContent = 'El nombre es requerido.';
      ok = false;
    } else {
      document.getElementById('bpf-err-title').textContent = '';
    }
    if (!desc) {
      document.getElementById('bpf-err-desc').textContent = 'La descripción es requerida.';
      ok = false;
    } else {
      document.getElementById('bpf-err-desc').textContent = '';
    }
    if (link && link !== '#' && !this._isValidUrl(link)) {
      document.getElementById('bpf-err-link').textContent = 'URL no válida (incluye https://)';
      ok = false;
    } else {
      document.getElementById('bpf-err-link').textContent = '';
    }
    return ok;
  }

  _isValidUrl(str) {
    try { return Boolean(new URL(str)); } catch (_) { return false; }
  }

  _saveForm() {
    if (!this._validateForm()) return;

    const data = {
      title:       document.getElementById('bpf-input-title').value.trim(),
      category:    document.getElementById('bpf-input-category').value,
      description: document.getElementById('bpf-input-desc').value.trim(),
      link:        document.getElementById('bpf-input-link').value.trim() || '#',
      image:       document.getElementById('bpf-input-image').value.trim(),
    };

    if (this._editingId) {
      const idx = this._projects.findIndex(p => p.id === this._editingId);
      if (idx !== -1) this._projects[idx] = { ...this._projects[idx], ...data };
    } else {
      this._projects.push({ id: this._generateId(), ...data });
    }

    this._saveProjects();
    this._resetAdminForm();
    this._renderAdminList();
    this._updateFilterCounts();
    this._renderGrid();

    const btn = document.getElementById('bpf-btn-save');
    btn.classList.add('bpf-btn-save--success');
    document.getElementById('bpf-btn-save-text').textContent = '✓ Guardado';
    setTimeout(() => {
      btn.classList.remove('bpf-btn-save--success');
      document.getElementById('bpf-btn-save-text').textContent = 'Guardar proyecto';
    }, 1800);
  }

  _deleteProject(id) {
    if (!confirm('¿Eliminar este proyecto? Esta acción no se puede deshacer.')) return;
    this._projects = this._projects.filter(p => p.id !== id);
    this._saveProjects();
    this._renderAdminList();
    this._updateFilterCounts();
    this._renderGrid();
  }

  _moveProject(id, dir) {
    const idx = this._projects.findIndex(p => p.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= this._projects.length) return;
    [this._projects[idx], this._projects[newIdx]] = [this._projects[newIdx], this._projects[idx]];
    this._saveProjects();
    this._renderAdminList();
    this._renderGrid();
  }

  _updateImagePreview(src) {
    const img = document.getElementById('bpf-img-preview');
    const ph  = document.getElementById('bpf-img-placeholder');
    if (src) {
      img.src = src; img.hidden = false; ph.hidden = true;
    } else {
      img.src = ''; img.hidden = true; ph.hidden = false;
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     ADMIN — RENDER LISTA
  ═══════════════════════════════════════════════════════════════ */

  _renderAdminList() {
    const list  = document.getElementById('bpf-admin-list');
    const count = document.getElementById('bpf-admin-count');
    if (!list) return;

    count.textContent = `${this._projects.length} proyecto${this._projects.length !== 1 ? 's' : ''}`;

    if (!this._projects.length) {
      list.innerHTML = `<div class="bpf-admin-empty">No hay proyectos. Añade uno usando el formulario.</div>`;
      return;
    }

    list.innerHTML = this._projects.map((p, i) => `
      <div class="bpf-admin-item" data-id="${p.id}">
        <div class="bpf-admin-item-img">
          ${p.image
            ? `<img src="${this._esc(p.image)}" alt="" onerror="this.style.display='none'">`
            : `<span>⬡</span>`
          }
        </div>
        <div class="bpf-admin-item-info">
          <div class="bpf-admin-item-title">${this._esc(p.title)}</div>
          <div class="bpf-admin-item-cat">${this._esc(p.category)}</div>
        </div>
        <div class="bpf-admin-item-actions">
          <button class="bpf-admin-action bpf-admin-action--up"   data-action="up"   data-id="${p.id}" ${i === 0 ? 'disabled' : ''} title="Mover arriba">↑</button>
          <button class="bpf-admin-action bpf-admin-action--down" data-action="down" data-id="${p.id}" ${i === this._projects.length - 1 ? 'disabled' : ''} title="Mover abajo">↓</button>
          <button class="bpf-admin-action bpf-admin-action--edit" data-action="edit" data-id="${p.id}" title="Editar">✎</button>
          <button class="bpf-admin-action bpf-admin-action--del"  data-action="del"  data-id="${p.id}" title="Eliminar">✕</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const { action, id } = btn.dataset;
        if (action === 'edit') {
          const p = this._projects.find(x => x.id === id);
          if (p) this._fillFormForEdit(p);
        } else if (action === 'del') {
          this._deleteProject(id);
        } else if (action === 'up') {
          this._moveProject(id, -1);
        } else if (action === 'down') {
          this._moveProject(id, 1);
        }
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     BIND DE EVENTOS
  ═══════════════════════════════════════════════════════════════ */

  _bindEvents() {
    document.getElementById('bpf-filters')?.addEventListener('click', e => {
      const btn = e.target.closest('.bpf-filter-btn');
      if (btn) this._applyFilter(btn.dataset.filter);
    });

    document.getElementById('bpf-modal-close')?.addEventListener('click', () => this._closeModal());
    document.getElementById('bpf-modal-backdrop')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) this._closeModal();
    });

    document.getElementById('bpf-admin-trigger')?.addEventListener('click', () => this._handleSecretClick());
    document.getElementById('bpf-admin-close')?.addEventListener('click',   () => this._closeAdmin());
    document.getElementById('bpf-admin-backdrop')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) this._closeAdmin();
    });

    document.getElementById('bpf-btn-save')?.addEventListener('click',   () => this._saveForm());
    document.getElementById('bpf-btn-cancel')?.addEventListener('click', () => this._resetAdminForm());

    document.getElementById('bpf-input-desc')?.addEventListener('input', e => {
      document.getElementById('bpf-desc-count').textContent = e.target.value.length;
    });

    document.getElementById('bpf-input-image')?.addEventListener('input', e => {
      this._updateImagePreview(e.target.value.trim());
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (this._adminOpen) this._closeAdmin();
        else if (this._modalOpen) this._closeModal();
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     UTILIDADES
  ═══════════════════════════════════════════════════════════════ */

  _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ═══════════════════════════════════════════════════════════════
     ESTILOS INYECTADOS
  ═══════════════════════════════════════════════════════════════ */

  _injectStyles() {
    if (document.getElementById('bookfolio-v4-styles')) return;
    const style = document.createElement('style');
    style.id = 'bookfolio-v4-styles';
    style.textContent = `
.bpf-wrapper { width:100%; max-width:var(--container-max,1200px); margin:0 auto; padding:0 var(--container-padding,1.5rem); }
.bpf-header { margin-bottom:var(--space-10,2.5rem); }
.bpf-eyebrow { display:flex; align-items:center; gap:.75rem; margin-bottom:1.5rem; }
.bpf-eyebrow-code { font-family:var(--font-mono,monospace); font-size:.75rem; color:var(--color-cyan-300,#00cccc); letter-spacing:.02em; }
.bpf-eyebrow-label { font-family:var(--font-display,monospace); font-size:.75rem; font-weight:600; letter-spacing:.2em; text-transform:uppercase; color:var(--color-text-muted,#4a5568); }
.bpf-eyebrow-label::before { content:'—'; margin-right:.5rem; color:rgba(0,255,255,.2); }
.bpf-section-title { font-family:var(--font-display,monospace); font-size:clamp(1.5rem,2.8vw,2rem); font-weight:700; letter-spacing:-.02em; color:var(--color-text-primary,#e8eaf0); margin:0; }
.bpf-section-sub { font-family:var(--font-ui,sans-serif); font-size:.9rem; color:var(--color-text-muted,#8892a4); margin:.6rem 0 0; }

.bpf-filters { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; margin-bottom:2.5rem; }
.bpf-filter-btn { display:inline-flex; align-items:center; gap:.35rem; height:32px; padding:0 1rem; font-family:var(--font-mono,monospace); font-size:.75rem; letter-spacing:.08em; text-transform:uppercase; color:var(--color-text-muted,#4a5568); background:transparent; border:1px solid rgba(255,255,255,.06); border-radius:2px; cursor:pointer; transition:color .15s,border-color .15s,background .15s; }
.bpf-filter-btn:hover { color:var(--color-cyan-400,#00e5e5); border-color:rgba(0,255,255,.2); }
.bpf-filter-btn--active { color:var(--color-cyan-400,#00e5e5); border-color:rgba(0,255,255,.3); background:rgba(0,255,255,.05); }
.bpf-filter-count { font-size:.65rem; color:var(--color-text-muted,#4a5568); }

.bpf-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:1.5rem; transition:opacity .3s ease,transform .3s cubic-bezier(.23,1,.32,1); }

@keyframes bpf-card-in { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
.bpf-card { position:relative; display:flex; flex-direction:column; background:var(--color-bg-surface,#0d0d14); border:1px solid rgba(255,255,255,.06); border-radius:12px; overflow:hidden; cursor:pointer; outline:none; animation:bpf-card-in .28s ease both; transition:border-color .25s,box-shadow .4s; will-change:transform; }
.bpf-card:hover,.bpf-card:focus-visible { border-color:rgba(0,255,255,.25); box-shadow:0 0 20px rgba(0,255,255,.08),0 8px 32px rgba(0,0,0,.4); }
.bpf-card:focus-visible { outline:2px solid rgba(0,255,255,.5); outline-offset:2px; }

.bpf-card-img-wrap { position:relative; aspect-ratio:1200/527; background:var(--color-bg-elevated,#13131e); overflow:hidden; flex-shrink:0; }
.bpf-card-img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transition:transform .5s cubic-bezier(.23,1,.32,1); z-index:1; }
.bpf-card:hover .bpf-card-img { transform:scale(1.05); }
.bpf-card-img-fallback { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:2rem; color:rgba(0,255,255,.12); z-index:0; }
.bpf-card-overlay { position:absolute; inset:0; background:linear-gradient(135deg,rgba(0,255,255,.12),rgba(127,90,240,.12)); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity .3s; z-index:2; }
.bpf-card:hover .bpf-card-overlay { opacity:1; }
.bpf-card-view-btn { font-family:var(--font-mono,monospace); font-size:.75rem; letter-spacing:.15em; text-transform:uppercase; color:var(--color-cyan-400,#00e5e5); padding:.5rem 1rem; border:1px solid rgba(0,255,255,.4); border-radius:2px; background:rgba(0,0,0,.6); backdrop-filter:blur(4px); transform:translateY(4px); transition:transform .3s cubic-bezier(.23,1,.32,1); }
.bpf-card:hover .bpf-card-view-btn { transform:translateY(0); }
.bpf-card-body { padding:1.25rem; display:flex; flex-direction:column; gap:.5rem; flex:1; }
.bpf-card-meta { display:flex; align-items:center; gap:.5rem; }
.bpf-card-cat { font-family:var(--font-mono,monospace); font-size:.65rem; letter-spacing:.15em; text-transform:uppercase; color:var(--color-cyan-300,#00cccc); padding:2px 6px; background:rgba(0,255,255,.06); border:1px solid rgba(0,255,255,.15); border-radius:2px; }
.bpf-card-title { font-family:var(--font-display,monospace); font-size:1rem; font-weight:700; letter-spacing:-.01em; color:var(--color-text-primary,#e8eaf0); margin:0; line-height:1.3; transition:color .15s; }
.bpf-card:hover .bpf-card-title { color:var(--color-cyan-400,#00e5e5); }
.bpf-card-desc { display:none !important; font-family:var(--font-body,sans-serif); font-size:.8125rem; line-height:1.6; color:var(--color-text-secondary,#8892a4); margin:0; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }

.bpf-card-corner { position:absolute; width:12px; height:12px; border-color:rgba(0,255,255,.25); border-style:solid; opacity:0; transition:opacity .25s; }
.bpf-card:hover .bpf-card-corner { opacity:1; }
.bpf-card-corner--tl { top:6px;left:6px;border-width:1px 0 0 1px }
.bpf-card-corner--tr { top:6px;right:6px;border-width:1px 1px 0 0 }
.bpf-card-corner--bl { bottom:6px;left:6px;border-width:0 0 1px 1px }
.bpf-card-corner--br { bottom:6px;right:6px;border-width:0 1px 1px 0 }

.bpf-loadmore { display:flex; justify-content:center; margin-top:2.5rem; }
.bpf-loadmore-btn { display:inline-flex; align-items:center; gap:.5rem; height:48px; padding:0 1.9rem; text-decoration:none; font-family:var(--font-mono,monospace); font-size:.8rem; letter-spacing:.08em; text-transform:uppercase; color:#eafffe; background:linear-gradient(135deg,rgba(0,229,229,.16),rgba(127,90,240,.12)); border:1px solid rgba(0,255,255,.4); border-radius:11px; cursor:pointer; transition:color .2s,border-color .2s,background .2s,box-shadow .3s,transform .2s; }
.bpf-loadmore-btn:hover { background:linear-gradient(135deg,rgba(0,229,229,.24),rgba(127,90,240,.18)); border-color:var(--color-cyan-400,#00e5e5); box-shadow:0 10px 28px rgba(0,229,229,.24); transform:translateY(-2px); }
.bpf-loadmore-btn:focus-visible { outline:2px solid rgba(0,255,255,.5); outline-offset:2px; }
.bpf-loadmore-count { color:var(--color-text-muted,#4a5568); font-size:.72rem; }
.bpf-empty { text-align:center; padding:4rem 0; }
.bpf-empty-icon { font-size:2.5rem; color:rgba(0,255,255,.1); margin-bottom:1rem; }
.bpf-empty-text { font-family:var(--font-mono,monospace); font-size:.875rem; color:var(--color-text-muted,#4a5568); }

.bpf-modal-backdrop { position:fixed; inset:0; background:rgba(5,5,8,.88); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); z-index:200; display:flex; align-items:center; justify-content:center; padding:1.5rem; opacity:0; pointer-events:none; transition:opacity .25s; }
.bpf-modal-backdrop--open { opacity:1; pointer-events:all; }
.bpf-modal { position:relative; width:100%; max-width:680px; max-height:92vh; overflow:hidden auto; background:var(--color-bg-elevated,#13131e); border:1px solid rgba(0,255,255,.2); border-radius:12px; box-shadow:0 0 40px rgba(0,255,255,.08),0 20px 60px rgba(0,0,0,.7); transform:translateY(12px); transition:transform .3s cubic-bezier(.23,1,.32,1); }
.bpf-modal-backdrop--open .bpf-modal { transform:translateY(0); }
.bpf-modal-close { position:absolute; top:.85rem; right:.85rem; z-index:10; width:40px; height:40px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.72); border:1px solid rgba(0,255,255,.4); border-radius:10px; color:#eaf7f7; cursor:pointer; transition:color .15s,border-color .15s,background .15s,transform .15s; }
.bpf-modal-close:hover { color:#00e5e5; border-color:#00e5e5; background:rgba(0,229,229,.12); transform:scale(1.06); }
.bpf-modal-img-wrap { position:relative; width:100%; aspect-ratio:1200/527; background:#05060b; overflow:hidden; }
.bpf-modal-img { width:100%; height:100%; object-fit:contain; }
.bpf-modal-img-overlay { position:absolute; bottom:0; left:0; right:0; height:60%; background:linear-gradient(to top,var(--color-bg-elevated,#13131e),transparent); pointer-events:none; }
.bpf-modal-body { padding:1.5rem; }
.bpf-modal-meta { margin-bottom:.75rem; }
.bpf-modal-cat { font-family:var(--font-mono,monospace); font-size:.65rem; letter-spacing:.15em; text-transform:uppercase; color:var(--color-cyan-300,#00cccc); padding:2px 8px; background:rgba(0,255,255,.06); border:1px solid rgba(0,255,255,.2); border-radius:2px; }
.bpf-modal-title { font-family:var(--font-display,monospace); font-size:1.35rem; font-weight:700; color:var(--color-text-primary,#e8eaf0); letter-spacing:-.02em; margin:0 0 .75rem; line-height:1.25; }
.bpf-modal-desc { font-family:var(--font-body,sans-serif); font-size:.875rem; line-height:1.65; color:var(--color-text-secondary,#8892a4); margin:0 0 1.5rem; }
.bpf-modal-actions { display:flex; gap:.75rem; }

.bpf-admin-backdrop { position:fixed; inset:0; background:rgba(5,5,8,.92); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); z-index:300; display:flex; align-items:stretch; justify-content:flex-end; opacity:0; pointer-events:none; transition:opacity .3s; }
.bpf-admin-backdrop--open { opacity:1; pointer-events:all; }
.bpf-admin-panel { width:100%; max-width:960px; background:var(--color-bg-surface,#0d0d14); border-left:1px solid rgba(0,255,255,.15); display:flex; flex-direction:column; overflow:hidden; transform:translateX(40px); transition:transform .35s cubic-bezier(.23,1,.32,1); }
.bpf-admin-backdrop--open .bpf-admin-panel { transform:translateX(0); }
.bpf-admin-header { display:flex; align-items:center; justify-content:space-between; padding:1.25rem 1.5rem; border-bottom:1px solid rgba(0,255,255,.1); flex-shrink:0; background:rgba(0,255,255,.03); }
.bpf-admin-header-left { display:flex; flex-direction:column; gap:2px; }
.bpf-admin-eyebrow { font-family:var(--font-mono,monospace); font-size:.65rem; letter-spacing:.2em; color:var(--color-cyan-300,#00cccc); text-transform:uppercase; }
.bpf-admin-title { font-family:var(--font-display,monospace); font-size:1.1rem; font-weight:700; color:var(--color-text-primary,#e8eaf0); margin:0; letter-spacing:-.01em; }
.bpf-admin-close { width:34px; height:34px; display:flex; align-items:center; justify-content:center; background:transparent; border:1px solid rgba(255,255,255,.08); border-radius:4px; color:var(--color-text-muted,#4a5568); cursor:pointer; transition:color .15s,border-color .15s; }
.bpf-admin-close:hover { color:var(--color-cyan-400,#00e5e5); border-color:rgba(0,255,255,.3); }
.bpf-admin-body { display:grid; grid-template-columns:1fr 1fr; flex:1; overflow:hidden; }
.bpf-admin-form-col { padding:1.5rem; border-right:1px solid rgba(255,255,255,.05); overflow-y:auto; display:flex; flex-direction:column; gap:1rem; }
.bpf-admin-form-title { font-family:var(--font-mono,monospace); font-size:.7rem; letter-spacing:.15em; text-transform:uppercase; color:var(--color-cyan-300,#00cccc); padding-bottom:.75rem; border-bottom:1px solid rgba(0,255,255,.1); flex-shrink:0; }
.bpf-admin-form { display:flex; flex-direction:column; gap:1rem; flex:1; }
.bpf-form-group { display:flex; flex-direction:column; gap:.4rem; }
.bpf-form-label { display:flex; align-items:center; gap:.4rem; font-family:var(--font-display,monospace); font-size:.7rem; font-weight:500; letter-spacing:.1em; text-transform:uppercase; color:var(--color-text-secondary,#8892a4); }
.bpf-form-label-code { color:var(--color-cyan-300,#00cccc); font-family:var(--font-mono,monospace); }
.bpf-form-input { width:100%; height:40px; padding:0 .875rem; background:var(--color-bg-elevated,#13131e); border:1px solid rgba(255,255,255,.06); border-radius:4px; font-family:var(--font-body,sans-serif); font-size:.8125rem; color:var(--color-text-primary,#e8eaf0); transition:border-color .15s,box-shadow .15s; outline:none; -webkit-appearance:none; appearance:none; }
.bpf-form-input:focus { border-color:rgba(0,255,255,.3); box-shadow:0 0 0 2px rgba(0,255,255,.06); }
.bpf-form-select { cursor:pointer; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2300aaaa' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right .75rem center; padding-right:2.25rem; }
.bpf-form-select option { background:var(--color-bg-elevated,#13131e); color:var(--color-text-primary,#e8eaf0); }
.bpf-form-textarea { height:auto; min-height:90px; padding:.6rem .875rem; resize:vertical; line-height:1.55; }
.bpf-char-counter { font-family:var(--font-mono,monospace); font-size:.65rem; color:var(--color-text-muted,#4a5568); text-align:right; }
.bpf-form-error { font-family:var(--font-body,sans-serif); font-size:.7rem; color:#ff6b81; min-height:1em; }
.bpf-image-preview-wrap { width:100%; aspect-ratio:16/9; background:var(--color-bg-elevated,#13131e); border:1px dashed rgba(0,255,255,.1); border-radius:4px; overflow:hidden; display:flex; align-items:center; justify-content:center; margin-top:.4rem; }
.bpf-img-preview { width:100%; height:100%; object-fit:cover; }
.bpf-img-preview-placeholder { font-family:var(--font-mono,monospace); font-size:.7rem; color:var(--color-text-muted,#4a5568); letter-spacing:.05em; }
.bpf-form-actions { display:flex; flex-direction:column; gap:.5rem; margin-top:.5rem; }
.bpf-btn-save { display:flex; align-items:center; justify-content:center; gap:.5rem; height:42px; padding:0 1.5rem; background:rgba(0,255,255,.1); border:1px solid rgba(0,255,255,.3); border-radius:2px; font-family:var(--font-display,monospace); font-size:.8rem; font-weight:500; letter-spacing:.1em; text-transform:uppercase; color:var(--color-cyan-400,#00e5e5); cursor:pointer; transition:background .15s,box-shadow .3s; }
.bpf-btn-save:hover { background:rgba(0,255,255,.16); box-shadow:0 0 20px rgba(0,255,255,.15); }
.bpf-btn-save--success { background:rgba(44,182,125,.12)!important; border-color:rgba(44,182,125,.35)!important; color:#3dd68c!important; }
.bpf-btn-cancel { height:36px; font-family:var(--font-mono,monospace); font-size:.7rem; letter-spacing:.08em; text-transform:uppercase; color:var(--color-text-muted,#4a5568); background:transparent; border:1px solid rgba(255,255,255,.06); border-radius:2px; cursor:pointer; transition:color .15s,border-color .15s; }
.bpf-btn-cancel:hover { color:#ff6b81; border-color:rgba(255,71,87,.3); }
.bpf-admin-list-col { display:flex; flex-direction:column; overflow:hidden; }
.bpf-admin-list-header { display:flex; align-items:center; justify-content:space-between; padding:1.5rem 1.5rem .75rem; flex-shrink:0; }
.bpf-admin-project-count { font-family:var(--font-mono,monospace); font-size:.65rem; color:var(--color-text-muted,#4a5568); letter-spacing:.05em; }
.bpf-admin-list { flex:1; overflow-y:auto; padding:0 .75rem 1.5rem; display:flex; flex-direction:column; gap:.5rem; }
.bpf-admin-list::-webkit-scrollbar { width:3px; }
.bpf-admin-list::-webkit-scrollbar-thumb { background:rgba(0,255,255,.2); border-radius:9999px; }
.bpf-admin-empty { font-family:var(--font-mono,monospace); font-size:.75rem; color:var(--color-text-muted,#4a5568); text-align:center; padding:2rem 1rem; }
.bpf-admin-item { display:flex; align-items:center; gap:.75rem; padding:.625rem .75rem; background:var(--color-bg-elevated,#13131e); border:1px solid rgba(255,255,255,.04); border-radius:4px; transition:border-color .15s; }
.bpf-admin-item:hover { border-color:rgba(0,255,255,.12); }
.bpf-admin-item-img { width:48px; height:36px; background:var(--color-bg-surface,#0d0d14); border-radius:2px; overflow:hidden; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:1rem; color:rgba(0,255,255,.15); }
.bpf-admin-item-img img { width:100%; height:100%; object-fit:cover; }
.bpf-admin-item-info { flex:1; min-width:0; }
.bpf-admin-item-title { font-family:var(--font-display,monospace); font-size:.8125rem; font-weight:600; color:var(--color-text-primary,#e8eaf0); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.bpf-admin-item-cat { font-family:var(--font-mono,monospace); font-size:.6rem; letter-spacing:.1em; text-transform:uppercase; color:var(--color-cyan-300,#00cccc); margin-top:1px; }
.bpf-admin-item-actions { display:flex; align-items:center; gap:.25rem; flex-shrink:0; }
.bpf-admin-action { width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-size:.75rem; background:transparent; border:1px solid rgba(255,255,255,.06); border-radius:2px; color:var(--color-text-muted,#4a5568); cursor:pointer; transition:color .15s,border-color .15s,background .15s; }
.bpf-admin-action:disabled { opacity:.25; cursor:not-allowed; }
.bpf-admin-action--up:hover:not(:disabled),.bpf-admin-action--down:hover:not(:disabled) { color:var(--color-cyan-400,#00e5e5); border-color:rgba(0,255,255,.25); }
.bpf-admin-action--edit:hover { color:#ffe033; border-color:rgba(255,224,51,.3); background:rgba(255,224,51,.05); }
.bpf-admin-action--del:hover  { color:#ff6b81; border-color:rgba(255,71,87,.3);  background:rgba(255,71,87,.05);  }
.bpf-admin-trigger { position:fixed; bottom:0; left:0; width:48px; height:48px; z-index:9998; cursor:default; -webkit-tap-highlight-color:transparent; }
@media(max-width:900px) { .bpf-admin-body{grid-template-columns:1fr;overflow-y:auto} .bpf-admin-form-col{border-right:none;border-bottom:1px solid rgba(255,255,255,.05)} .bpf-admin-list-col{min-height:280px} }
@media(max-width:768px) { .bpf-grid{grid-template-columns:1fr} .bpf-admin-panel{max-width:100%} }
@media(prefers-reduced-motion:reduce) { .bpf-card,.bpf-modal,.bpf-admin-panel,.bpf-modal-backdrop,.bpf-admin-backdrop{animation:none!important;transition:none!important} }
    `;
    document.head.appendChild(style);
  }

} /* end class BookFolio */

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BookFolio;
}
