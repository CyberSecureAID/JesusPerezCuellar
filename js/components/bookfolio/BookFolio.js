/**
 * BookFolio.js — Premium Portfolio Pages Module
 * Folder: /components/bookfolio/BookFolio.js
 *
 * Usage:
 *   import BookFolio from './components/bookfolio/BookFolio.js';
 *   const gallery = new BookFolio('#portfolio', { projects: [...] });
 *
 * Each project object:
 * {
 *   id: 'unique-id',
 *   image: 'path/to/image.jpg',
 *   title: 'Project Title',
 *   category: 'Category',
 *   description: 'Short description',
 *   link: 'https://...',
 * }
 */

(() => {
  'use strict';

  /* ─────────────────────────────────────────────
     CSS INJECTION
  ───────────────────────────────────────────── */
  const CSS = `
    :root {
      --bf-bg:            #0a0a0c;
      --bf-bg2:           #0f0f14;
      --bf-page-w:        clamp(120px, 14vw, 220px);
      --bf-page-h:        clamp(320px, 55vh, 620px);
      --bf-gap:           clamp(4px, 0.6vw, 10px);
      --bf-perspective:   1100px;
      --bf-shadow:        0 8px 48px rgba(0,0,0,0.72);
      --bf-accent:        rgba(200,210,230,0.08);
      --bf-text:          #e8eaf2;
      --bf-muted:         rgba(220,225,240,0.45);
      --bf-font-display:  'Inter', system-ui, sans-serif;
      --bf-font-body:     'Inter', system-ui, sans-serif;
      --bf-radius:        4px;
      --bf-transition:    cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .bf-section {
      position: relative;
      width: 100%;
      min-height: clamp(500px, 70vh, 800px);
      background: var(--bf-bg);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      isolation: isolate;
    }

    /* Ambient gradient glow */
    .bf-section::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 80% 50% at 50% 60%, rgba(60,80,140,0.13) 0%, transparent 70%),
        radial-gradient(ellipse 50% 30% at 20% 80%, rgba(40,50,100,0.07) 0%, transparent 60%),
        radial-gradient(ellipse 50% 30% at 80% 20%, rgba(40,50,100,0.07) 0%, transparent 60%);
      pointer-events: none;
      z-index: 0;
    }

    /* Ground reflection line */
    .bf-section::after {
      content: '';
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(150,160,200,0.15) 30%, rgba(150,160,200,0.15) 70%, transparent);
      z-index: 1;
    }

    .bf-stage {
      position: relative;
      width: 100%;
      height: clamp(500px, 70vh, 800px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      perspective: var(--bf-perspective);
      perspective-origin: 50% 48%;
    }

    .bf-track {
      position: absolute;
      display: flex;
      align-items: center;
      gap: var(--bf-gap);
      will-change: transform;
      transform-style: preserve-3d;
      /* width set by JS */
    }

    /* ── Individual page card ── */
    .bf-page {
      position: relative;
      flex-shrink: 0;
      width: var(--bf-page-w);
      height: var(--bf-page-h);
      border-radius: var(--bf-radius);
      overflow: hidden;
      cursor: pointer;
      will-change: transform;
      transform-style: preserve-3d;
      transform-origin: center center;
      backface-visibility: hidden;
      transition:
        transform 0.55s var(--bf-transition),
        box-shadow 0.55s var(--bf-transition);
      box-shadow: var(--bf-shadow);
      outline: none;
    }

    /* Default rotated closed state — set per-page by JS */
    .bf-page__img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      display: block;
      transform: scale(1.08);
      transition: transform 0.55s var(--bf-transition), opacity 0.4s ease;
      will-change: transform;
      pointer-events: none;
      background: #111118;
    }

    .bf-page__img[data-loaded="false"] {
      opacity: 0;
    }

    /* Shimmer skeleton while loading */
    .bf-page__skeleton {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        110deg,
        #16161e 25%,
        #22222e 50%,
        #16161e 75%
      );
      background-size: 200% 100%;
      animation: bf-shimmer 1.6s infinite linear;
    }

    @keyframes bf-shimmer {
      from { background-position: 200% 0 }
      to   { background-position: -200% 0 }
    }

    /* Glossy edge sheen */
    .bf-page__sheen {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: linear-gradient(
        92deg,
        transparent 0%,
        rgba(255,255,255,0.035) 40%,
        rgba(255,255,255,0.08) 50%,
        rgba(255,255,255,0.035) 60%,
        transparent 100%
      );
      border-left: 1px solid rgba(255,255,255,0.07);
      border-right: 1px solid rgba(255,255,255,0.04);
      z-index: 2;
      transition: opacity 0.4s ease;
    }

    /* Content overlay revealed on hover/focus */
    .bf-page__content {
      position: absolute;
      inset: 0;
      z-index: 3;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: clamp(12px, 2vw, 22px);
      background: linear-gradient(
        to top,
        rgba(5,5,12,0.92) 0%,
        rgba(5,5,12,0.5) 40%,
        transparent 75%
      );
      opacity: 0;
      transform: translateY(6px);
      transition:
        opacity 0.4s var(--bf-transition),
        transform 0.4s var(--bf-transition);
      pointer-events: none;
    }

    .bf-page.bf-is-active .bf-page__content,
    .bf-page:focus-visible .bf-page__content {
      opacity: 1;
      transform: translateY(0);
    }

    .bf-page.bf-is-active .bf-page__img,
    .bf-page:focus-visible .bf-page__img {
      transform: scale(1);
    }

    .bf-page.bf-is-active .bf-page__sheen,
    .bf-page:focus-visible .bf-page__sheen {
      opacity: 0.4;
    }

    .bf-page__category {
      font-family: var(--bf-font-display);
      font-size: clamp(8px, 0.9vw, 11px);
      font-weight: 600;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--bf-muted);
      margin-bottom: 5px;
    }

    .bf-page__title {
      font-family: var(--bf-font-display);
      font-size: clamp(13px, 1.4vw, 18px);
      font-weight: 700;
      color: var(--bf-text);
      line-height: 1.25;
      margin: 0 0 6px;
    }

    .bf-page__desc {
      font-family: var(--bf-font-body);
      font-size: clamp(10px, 1vw, 13px);
      color: var(--bf-muted);
      line-height: 1.5;
      margin: 0 0 12px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .bf-page__link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: var(--bf-font-display);
      font-size: clamp(9px, 0.9vw, 11px);
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--bf-text);
      text-decoration: none;
      pointer-events: auto;
      border-bottom: 1px solid rgba(255,255,255,0.25);
      padding-bottom: 2px;
      transition: border-color 0.2s, color 0.2s;
    }

    .bf-page__link:hover,
    .bf-page__link:focus-visible {
      color: #fff;
      border-color: rgba(255,255,255,0.7);
    }

    /* Focus ring for keyboard nav */
    .bf-page:focus-visible {
      outline: 2px solid rgba(180,200,255,0.6);
      outline-offset: 3px;
    }

    /* ── Keyboard navigation hint (sr) ── */
    .bf-sr {
      position: absolute;
      width: 1px; height: 1px;
      overflow: hidden;
      clip: rect(0,0,0,0);
      white-space: nowrap;
    }

    /* ── Reduced motion ── */
    @media (prefers-reduced-motion: reduce) {
      .bf-track { animation: none !important; }
      .bf-page { transition: none !important; }
    }
  `;

  /* ─────────────────────────────────────────────
     DEFAULT DEMO PROJECTS
  ───────────────────────────────────────────── */
  const DEMO_PROJECTS = [
    {
      id: 'p01',
      image: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80',
      title: 'Concrete Haven',
      category: 'Architecture',
      description: 'Brutalist residence merging indoor and outdoor living through exposed concrete volumes.',
      link: '#'
    },
    {
      id: 'p02',
      image: 'https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?w=600&q=80',
      title: 'Lake Mirror House',
      category: 'Residential',
      description: 'Lakefront retreat where water reflections become an architectural element.',
      link: '#'
    },
    {
      id: 'p03',
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80',
      title: 'Cortado Lofts',
      category: 'Urban Living',
      description: 'Adaptive reuse of an industrial warehouse into twenty-four curated loft apartments.',
      link: '#'
    },
    {
      id: 'p04',
      image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80',
      title: 'Obsidian Villa',
      category: 'Luxury',
      description: 'Black-box villa embedded into a hillside, oriented toward a panoramic mountain skyline.',
      link: '#'
    },
    {
      id: 'p05',
      image: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=600&q=80',
      title: 'Birch Pavilion',
      category: 'Interiors',
      description: 'A meditation retreat lined in pale birch, designed for silence and natural light.',
      link: '#'
    },
    {
      id: 'p06',
      image: 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=600&q=80',
      title: 'Copper Atrium',
      category: 'Commercial',
      description: 'Office campus anchored by a patinated copper atrium that ages with the institution.',
      link: '#'
    },
    {
      id: 'p07',
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80',
      title: 'Dune Residence',
      category: 'Residential',
      description: 'Sand-formed curves shelter a seaside home from wind without sacrificing ocean views.',
      link: '#'
    },
    {
      id: 'p08',
      image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&q=80',
      title: 'Glass Terrace',
      category: 'High Rise',
      description: 'Cantilevered terraces cascade down a glass tower, creating private sky gardens.',
      link: '#'
    },
    {
      id: 'p09',
      image: 'https://images.unsplash.com/photo-1531971589569-0d9370cbe1e5?w=600&q=80',
      title: 'Raven Studio',
      category: 'Workspace',
      description: 'Creative studio carved into bedrock, where darkness amplifies focus and craft.',
      link: '#'
    },
    {
      id: 'p10',
      image: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&q=80',
      title: 'Timber Fold',
      category: 'Residential',
      description: 'Mass-timber roof folds across a family home, becoming both structure and sculpture.',
      link: '#'
    },
    {
      id: 'p11',
      image: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600&q=80',
      title: 'Slate Gallery',
      category: 'Cultural',
      description: 'Museum clad in dark slate rises from the urban fabric as a monolithic cultural beacon.',
      link: '#'
    },
    {
      id: 'p12',
      image: 'https://images.unsplash.com/photo-1592595896551-12b371d546d5?w=600&q=80',
      title: 'Horizon Spa',
      category: 'Hospitality',
      description: 'Wellness retreat where every treatment room frames an uninterrupted horizon line.',
      link: '#'
    }
  ];

  /* ─────────────────────────────────────────────
     HELPERS
  ───────────────────────────────────────────── */
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp  = (a, b, t)    => a + (b - a) * t;

  /* Ease in-out quad */
  const ease = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

  /* ─────────────────────────────────────────────
     BOOKFOLIO CLASS
  ───────────────────────────────────────────── */
  class BookFolio {
    /**
     * @param {string|Element} selector  – mount point
     * @param {object}         options
     * @param {Array}          options.projects   – project data array
     * @param {number}         options.speed      – px per second (default 60)
     * @param {number}         options.rotationSpread – max rotateY in degrees for flanking pages (default 78)
     */
    constructor(selector, options = {}) {
      this._root = typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;

      if (!this._root) throw new Error(`BookFolio: mount point "${selector}" not found`);

      this._opts = {
        projects: DEMO_PROJECTS,
        speed: 55,             // px/s baseline
        rotationSpread: 76,    // max wing rotation
        ...options
      };

      this._projects  = this._opts.projects;
      this._offset    = 0;     // current scroll offset (px)
      this._velocity  = this._opts.speed;
      this._targetVel = this._opts.speed;
      this._raf       = null;
      this._lastTime  = null;
      this._activeIdx = -1;
      this._pages     = [];
      this._trackW    = 0;
      this._pageW     = 0;
      this._gap       = 0;
      this._isHovering = false;

      this._injectCSS();
      this._build();
      this._measure();
      this._bindEvents();
      this._startLoop();
    }

    /* ── CSS ── */
    _injectCSS() {
      if (document.getElementById('bf-styles')) return;
      const s = document.createElement('style');
      s.id = 'bf-styles';
      s.textContent = CSS;
      document.head.appendChild(s);
    }

    /* ── DOM build ── */
    _build() {
      this._root.setAttribute('role', 'region');
      this._root.setAttribute('aria-label', 'Portfolio projects gallery');
      this._root.classList.add('bf-section');

      const srHint = document.createElement('p');
      srHint.className = 'bf-sr';
      srHint.textContent = 'Use Tab to navigate projects, Enter or Space to open.';
      this._root.appendChild(srHint);

      this._stage = document.createElement('div');
      this._stage.className = 'bf-stage';
      this._stage.setAttribute('aria-hidden', 'true'); // real items below for a11y

      this._track = document.createElement('div');
      this._track.className = 'bf-track';

      // triple-clone for seamless loop
      const all = [...this._projects, ...this._projects, ...this._projects];

      all.forEach((proj, i) => {
        const page = this._buildPage(proj, i);
        this._track.appendChild(page);
        this._pages.push(page);
      });

      this._stage.appendChild(this._track);
      this._root.appendChild(this._stage);

      /* Accessible list hidden off-screen for screen readers */
      const list = document.createElement('ul');
      list.className = 'bf-sr';
      list.setAttribute('role', 'list');
      this._projects.forEach(p => {
        const li  = document.createElement('li');
        const lnk = document.createElement('a');
        lnk.href = p.link || '#';
        lnk.textContent = `${p.title} — ${p.category}`;
        li.appendChild(lnk);
        list.appendChild(li);
      });
      this._root.appendChild(list);
    }

    _buildPage(proj, idx) {
      const page = document.createElement('article');
      page.className = 'bf-page';
      page.setAttribute('tabindex', idx < this._projects.length ? '0' : '-1');
      page.setAttribute('role', 'article');
      page.setAttribute('aria-label', `${proj.title}, ${proj.category}`);
      page.dataset.projId = proj.id;
      page.dataset.idx    = idx;

      /* Skeleton */
      const skel = document.createElement('div');
      skel.className = 'bf-page__skeleton';
      page.appendChild(skel);

      /* Image (lazy) */
      const img = document.createElement('img');
      img.className  = 'bf-page__img';
      img.alt        = proj.title;
      img.loading    = 'lazy';
      img.decoding   = 'async';
      img.dataset.loaded = 'false';
      img.onload  = () => {
        img.dataset.loaded = 'true';
        skel.style.display = 'none';
      };
      img.onerror = () => {
        img.dataset.loaded = 'true';
        skel.style.background = '#1a1a22';
        skel.style.animation  = 'none';
      };
      img.src = proj.image;
      page.appendChild(img);

      /* Glossy sheen */
      const sheen = document.createElement('div');
      sheen.className = 'bf-page__sheen';
      page.appendChild(sheen);

      /* Content */
      const content = document.createElement('div');
      content.className = 'bf-page__content';

      const cat = document.createElement('p');
      cat.className   = 'bf-page__category';
      cat.textContent = proj.category || '';
      content.appendChild(cat);

      const title = document.createElement('h3');
      title.className   = 'bf-page__title';
      title.textContent = proj.title || 'Untitled';
      content.appendChild(title);

      if (proj.description) {
        const desc = document.createElement('p');
        desc.className   = 'bf-page__desc';
        desc.textContent = proj.description;
        content.appendChild(desc);
      }

      if (proj.link) {
        const link = document.createElement('a');
        link.className  = 'bf-page__link';
        link.href       = proj.link;
        link.textContent = 'View project';
        if (proj.link !== '#') {
          link.target = '_blank';
          link.rel    = 'noopener noreferrer';
        }
        content.appendChild(link);
      }

      page.appendChild(content);

      return page;
    }

    /* ── Measure ── */
    _measure() {
      const styles = getComputedStyle(this._root);
      this._pageW = parseFloat(styles.getPropertyValue('--bf-page-w')) || 180;
      this._gap   = parseFloat(styles.getPropertyValue('--bf-gap')) || 7;

      // One full "set" of projects
      const perSet = this._projects.length;
      this._trackW = (this._pageW + this._gap) * perSet;

      // Position track so the center set is visible
      this._offset = this._trackW; // start at second copy

      this._track.style.width = `${this._trackW * 3}px`;
    }

    /* ── Events ── */
    _bindEvents() {
      // Hover (desktop)
      this._stage.addEventListener('pointerenter', e => {
        if (e.pointerType === 'mouse') this._isHovering = true;
      });
      this._stage.addEventListener('pointerleave', e => {
        if (e.pointerType === 'mouse') {
          this._isHovering = false;
          this._deactivate();
        }
      });

      // Page pointer interactions
      this._track.addEventListener('pointerover', e => {
        const page = e.target.closest('.bf-page');
        if (page && e.pointerType === 'mouse') this._activate(page);
      });

      this._track.addEventListener('pointerout', e => {
        const page = e.target.closest('.bf-page');
        if (page && e.pointerType === 'mouse') this._deactivate();
      });

      // Touch tap
      this._track.addEventListener('pointerdown', e => {
        if (e.pointerType === 'touch') {
          const page = e.target.closest('.bf-page');
          if (page) {
            const prevIdx = this._activeIdx;
            this._deactivate();
            if (parseInt(page.dataset.idx) !== prevIdx) this._activate(page);
          } else {
            this._deactivate();
          }
        }
      });

      // Keyboard
      this._track.addEventListener('keydown', e => {
        const page = e.target.closest('.bf-page');
        if (!page) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._activate(page);
        }
        if (e.key === 'Escape') this._deactivate();
      });
      this._track.addEventListener('focusin', e => {
        const page = e.target.closest('.bf-page');
        if (page) this._activate(page);
      });
      this._track.addEventListener('focusout', () => this._deactivate());

      // Resize
      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => this._measure(), 150);
      });
    }

    _activate(page) {
      this._deactivate(false);
      this._activeIdx = parseInt(page.dataset.idx);
      page.classList.add('bf-is-active');
      this._isHovering = true;
    }

    _deactivate(resetHover = true) {
      this._pages.forEach(p => p.classList.remove('bf-is-active'));
      this._activeIdx = -1;
      if (resetHover) this._isHovering = false;
    }

    /* ── Main RAF loop ── */
    _startLoop() {
      const loop = (ts) => {
        this._raf = requestAnimationFrame(loop);

        const dt = this._lastTime ? Math.min((ts - this._lastTime) / 1000, 0.05) : 0;
        this._lastTime = ts;

        // Velocity: decelerate when hovering
        this._targetVel = this._isHovering ? this._opts.speed * 0.04 : this._opts.speed;
        this._velocity  = lerp(this._velocity, this._targetVel, 0.04);

        // Advance offset
        this._offset += this._velocity * dt;

        // Seamless loop — snap back by one set when we've passed through it
        if (this._offset >= this._trackW * 2) this._offset -= this._trackW;
        if (this._offset < this._trackW)      this._offset += this._trackW;

        this._render();
      };
      this._raf = requestAnimationFrame(loop);
    }

    /* ── Render ── */
    _render() {
      const stageW     = this._root.offsetWidth;
      const center     = stageW / 2;
      const perSet     = this._projects.length;
      const step       = this._pageW + this._gap;
      const totalPages = this._pages.length; // 3x

      // Translate track: offset from center of second set
      const baseX = center - this._offset;
      this._track.style.transform = `translate3d(${baseX}px, 0, 0)`;

      this._pages.forEach((page, i) => {
        const pageCenter = i * step + this._pageW / 2;
        const screenX   = pageCenter + baseX;
        const distFromC = screenX - center;
        const normDist  = distFromC / (stageW * 0.55); // -1..1 across stage

        /* rotateY: pages fan out from center */
        const rot = clamp(normDist * -this._opts.rotationSpread, -this._opts.rotationSpread, this._opts.rotationSpread);

        /* Scale: pages near center are slightly larger */
        const proximity  = 1 - Math.abs(normDist);
        const baseScale  = 0.82 + proximity * 0.18;

        /* Z depth: center pages closer */
        const depth = proximity * 60 - 30;

        /* Active override */
        const isActive = parseInt(page.dataset.idx) === this._activeIdx;
        const scaleBoost = isActive ? 1.15 : 1;
        const rotBoost   = isActive ? 0.35 : 1;
        const zBoost     = isActive ? 80 : 0;

        /* Apply */
        const finalScale = baseScale * scaleBoost;
        const finalRot   = rot * rotBoost;
        const finalZ     = depth + zBoost;

        page.style.transform = `translate3d(0, 0, ${finalZ}px) rotateY(${finalRot}deg) scale(${finalScale})`;

        /* Opacity: fade far edges */
        const edgeFade = clamp(1 - (Math.abs(normDist) - 0.85) / 0.15, 0, 1);
        page.style.opacity = edgeFade.toFixed(3);

        /* Box shadow — deeper for active */
        const shadowY   = isActive ? 28 : 8;
        const shadowB   = isActive ? 80 : 48;
        const shadowA   = isActive ? 0.9 : 0.7;
        page.style.boxShadow = `0 ${shadowY}px ${shadowB}px rgba(0,0,0,${shadowA})`;
      });
    }

    /* ── Public API ── */
    destroy() {
      if (this._raf) cancelAnimationFrame(this._raf);
      this._root.innerHTML = '';
    }

    updateProjects(projects) {
      this._projects = projects;
      this._root.innerHTML = '';
      this._pages = [];
      this._build();
      this._measure();
    }
  }

  /* ─────────────────────────────────────────────
     EXPORT
  ───────────────────────────────────────────── */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BookFolio;
  } else if (typeof define === 'function' && define.amd) {
    define([], () => BookFolio);
  } else {
    window.BookFolio = BookFolio;
  }
})();
