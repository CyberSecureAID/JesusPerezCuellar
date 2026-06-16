/**
 * ════════════════════════════════════════════════════════════════════════════
 * BookFolio 2.0 — Carrusel 3D para portafolio con imágenes panorámicas ultrawide
 * ════════════════════════════════════════════════════════════════════════════
 * VERSIÓN: 2.0.0
 * Presentación interactiva estilo abanico/carrusel 3D para imágenes 1536x674 (ultrawide)
 * Soporta rotación, zoom y navegación táctil.
 */

class BookFolio {
  constructor(container, options = {}) {
    this.container = document.querySelector(container);
    if (!this.container) {
      console.warn(`[BookFolio] Contenedor "${container}" no encontrado.`);
      return;
    }

    this.projects = options.projects || [];
    this.currentIndex = 0;
    this.autoRotate = options.autoRotate !== false;
    this.rotationSpeed = options.rotationSpeed || 3;
    this.autoRotateInterval = null;

    this.init();
  }

  init() {
    this.createDOM();
    this.render();
    this.attachEvents();
    if (this.autoRotate) {
      this.startAutoRotate();
    }
  }

  createDOM() {
    this.container.innerHTML = `
      <div class="bookfolio-container">
        <!-- 3D Carousel scene -->
        <div class="bookfolio-scene">
          <div class="bookfolio-carousel" id="bookfolio-carousel">
            <!-- items generados dinámicamente -->
          </div>
        </div>

        <!-- Controles inferiores -->
        <div class="bookfolio-controls">
          <button class="carousel-btn carousel-btn--prev" id="carousel-prev" aria-label="Anterior">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 19l-7-7 7-7"/>
            </svg>
          </button>

          <div class="carousel-indicators" id="carousel-indicators" role="tablist" aria-label="Seleccionar imagen">
            <!-- generados dinámicamente -->
          </div>

          <button class="carousel-btn carousel-btn--next" id="carousel-next" aria-label="Siguiente">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 19l7-7-7-7"/>
            </svg>
          </button>
        </div>

        <!-- Info del proyecto actual -->
        <div class="carousel-info" id="carousel-info">
          <h3 class="carousel-info-title" id="carousel-title">---</h3>
          <p class="carousel-info-desc" id="carousel-desc">---</p>
          <div class="carousel-info-tags" id="carousel-tags"></div>
        </div>
      </div>
    `;

    // Inyectar estilos CSS
    if (!document.getElementById('bookfolio-styles-v2')) {
      const style = document.createElement('style');
      style.id = 'bookfolio-styles-v2';
      style.textContent = this.getStyles();
      document.head.appendChild(style);
    }
  }

  render() {
    const carousel = document.getElementById('bookfolio-carousel');
    const indicators = document.getElementById('carousel-indicators');
    
    if (!carousel || !indicators) return;

    carousel.innerHTML = '';
    indicators.innerHTML = '';

    this.projects.forEach((project, index) => {
      // Item carrusel
      const item = document.createElement('div');
      item.className = 'carousel-item';
      item.dataset.index = index;
      if (index === this.currentIndex) item.classList.add('active');
      
      item.innerHTML = `
        <div class="carousel-item-inner">
          <img src="${project.image}" alt="${project.title}" class="carousel-image" loading="lazy" />
          <div class="carousel-item-overlay" aria-hidden="true"></div>
        </div>
      `;

      carousel.appendChild(item);

      // Indicador
      const indicator = document.createElement('button');
      indicator.className = 'carousel-indicator';
      if (index === this.currentIndex) indicator.classList.add('active');
      indicator.dataset.index = index;
      indicator.role = 'tab';
      indicator.setAttribute('aria-selected', index === this.currentIndex ? 'true' : 'false');
      indicator.setAttribute('aria-label', `Ir a ${project.title}`);
      indicator.innerHTML = `<span class="indicator-dot"></span>`;
      
      indicators.appendChild(indicator);
    });

    this.updateInfo();
  }

  updateInfo() {
    const project = this.projects[this.currentIndex];
    if (!project) return;

    document.getElementById('carousel-title').textContent = project.title;
    document.getElementById('carousel-desc').textContent = project.description;
    
    const tagsContainer = document.getElementById('carousel-tags');
    tagsContainer.innerHTML = '';
    // Mostrar categoría como tag
    const tag = document.createElement('span');
    tag.className = 'carousel-tag';
    tag.textContent = project.category;
    tagsContainer.appendChild(tag);

    // Actualizar indicadores
    document.querySelectorAll('.carousel-indicator').forEach((ind, i) => {
      const isActive = i === this.currentIndex;
      ind.classList.toggle('active', isActive);
      ind.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Actualizar items
    document.querySelectorAll('.carousel-item').forEach((item, i) => {
      const isActive = i === this.currentIndex;
      item.classList.toggle('active', isActive);
      const offset = i - this.currentIndex;
      item.style.setProperty('--item-offset', offset);
    });
  }

  goToSlide(index) {
    if (index >= 0 && index < this.projects.length) {
      this.currentIndex = index;
      this.updateInfo();
      this.resetAutoRotate();
    }
  }

  next() {
    this.goToSlide((this.currentIndex + 1) % this.projects.length);
  }

  prev() {
    this.goToSlide((this.currentIndex - 1 + this.projects.length) % this.projects.length);
  }

  startAutoRotate() {
    if (this.autoRotateInterval) clearInterval(this.autoRotateInterval);
    this.autoRotateInterval = setInterval(() => this.next(), this.rotationSpeed * 1000);
  }

  resetAutoRotate() {
    if (this.autoRotate) {
      clearInterval(this.autoRotateInterval);
      this.startAutoRotate();
    }
  }

  attachEvents() {
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const indicators = document.querySelectorAll('.carousel-indicator');

    prevBtn?.addEventListener('click', () => this.prev());
    nextBtn?.addEventListener('click', () => this.next());

    indicators.forEach(ind => {
      ind.addEventListener('click', () => {
        const index = parseInt(ind.dataset.index, 10);
        this.goToSlide(index);
      });
    });

    // Pausa autorotate en hover
    this.container?.addEventListener('mouseenter', () => {
      if (this.autoRotate) clearInterval(this.autoRotateInterval);
    });
    this.container?.addEventListener('mouseleave', () => {
      if (this.autoRotate) this.startAutoRotate();
    });

    // Soporte teclado
    document.addEventListener('keydown', (e) => {
      if (document.activeElement?.closest('#portfolio')) {
        if (e.key === 'ArrowLeft') this.prev();
        if (e.key === 'ArrowRight') this.next();
      }
    });
  }

  getStyles() {
    return `
      /* ═══════════════════════════════════════════════════════════════════════════
         BOOKFOLIO 2.0 — Carrusel 3D para imágenes panorámicas ultrawide
      ═══════════════════════════════════════════════════════════════════════════ */

      .bookfolio-container {
        width: 100%;
        max-width: 100%;
        margin: 0 auto;
        padding: 2rem 1rem;
        font-family: 'Inter', sans-serif;
      }

      /* ESCENA 3D */
      .bookfolio-scene {
        width: 100%;
        height: 100%;
        perspective: 1200px;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 500px;
        margin-bottom: 2rem;
        background: radial-gradient(ellipse at center, rgba(0, 255, 255, 0.03) 0%, transparent 70%);
        border-radius: 16px;
        overflow: hidden;
      }

      /* CARRUSEL 3D */
      .bookfolio-carousel {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        transform-style: preserve-3d;
      }

      /* ITEMS */
      .carousel-item {
        position: absolute;
        width: 85%;
        max-width: 900px;
        aspect-ratio: 1536 / 674;
        cursor: pointer;
        transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        opacity: 0;
        transform: 
          translateX(calc(var(--item-offset, 0) * 100px))
          rotateY(calc(var(--item-offset, 0) * 35deg))
          scale(calc(1 - abs(var(--item-offset, 0)) * 0.15));
        z-index: calc(10 - abs(var(--item-offset, 0)) * 5);
        pointer-events: none;
      }

      .carousel-item.active {
        opacity: 1;
        pointer-events: auto;
      }

      .carousel-item-inner {
        position: relative;
        width: 100%;
        height: 100%;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 
          0 20px 60px rgba(0, 0, 0, 0.5),
          0 0 40px rgba(0, 255, 255, 0.1);
        border: 1px solid rgba(0, 255, 255, 0.2);
        background: #0a0e27;
      }

      .carousel-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: center;
        display: block;
      }

      .carousel-item-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(0, 255, 255, 0.05) 0%, rgba(127, 90, 240, 0.05) 100%);
        pointer-events: none;
        mix-blend-mode: overlay;
      }

      /* CONTROLES */
      .bookfolio-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 2rem;
        margin-bottom: 2rem;
        flex-wrap: wrap;
      }

      .carousel-btn {
        width: 44px;
        height: 44px;
        border: 1px solid rgba(0, 255, 255, 0.4);
        background: rgba(15, 15, 46, 0.6);
        color: #00ffff;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        backdrop-filter: blur(8px);
        font-weight: 600;
      }

      .carousel-btn:hover {
        background: rgba(0, 255, 255, 0.1);
        border-color: rgba(0, 255, 255, 0.8);
        box-shadow: 0 0 16px rgba(0, 255, 255, 0.3);
        transform: scale(1.08);
      }

      .carousel-btn:active {
        transform: scale(0.96);
      }

      /* INDICADORES */
      .carousel-indicators {
        display: flex;
        gap: 0.8rem;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
      }

      .carousel-indicator {
        padding: 0.4rem 0.8rem;
        background: rgba(15, 15, 46, 0.4);
        border: 1px solid rgba(0, 255, 255, 0.2);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.8rem;
        color: #8892a4;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        backdrop-filter: blur(8px);
      }

      .carousel-indicator:hover {
        border-color: rgba(0, 255, 255, 0.5);
        color: #00ffff;
      }

      .carousel-indicator.active {
        background: rgba(0, 255, 255, 0.15);
        border-color: rgba(0, 255, 255, 0.6);
        color: #00ffff;
        box-shadow: 0 0 12px rgba(0, 255, 255, 0.2);
      }

      .indicator-dot {
        width: 6px;
        height: 6px;
        background: currentColor;
        border-radius: 50%;
        transition: all 0.3s ease;
      }

      .carousel-indicator.active .indicator-dot {
        width: 8px;
        height: 8px;
        box-shadow: 0 0 8px rgba(0, 255, 255, 0.6);
      }

      /* INFO DEL PROYECTO */
      .carousel-info {
        text-align: center;
        padding: 1.5rem;
        background: linear-gradient(135deg, rgba(0, 255, 255, 0.05) 0%, rgba(127, 90, 240, 0.05) 100%);
        border: 1px solid rgba(0, 255, 255, 0.1);
        border-radius: 12px;
        backdrop-filter: blur(8px);
        animation: fadeInUp 0.6s ease-out;
      }

      .carousel-info-title {
        font-size: 1.4rem;
        font-weight: 700;
        color: #00ffff;
        margin-bottom: 0.5rem;
        text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
      }

      .carousel-info-desc {
        font-size: 0.95rem;
        color: #a0a0c0;
        line-height: 1.6;
        margin-bottom: 1rem;
        max-width: 700px;
        margin-left: auto;
        margin-right: auto;
      }

      .carousel-info-tags {
        display: flex;
        gap: 0.5rem;
        justify-content: center;
        flex-wrap: wrap;
      }

      .carousel-tag {
        display: inline-block;
        background: rgba(0, 255, 255, 0.15);
        color: #00ffff;
        padding: 0.35rem 0.75rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border: 1px solid rgba(0, 255, 255, 0.3);
      }

      /* ANIMACIONES */
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* RESPONSIVE */
      @media (max-width: 1024px) {
        .bookfolio-scene {
          min-height: 400px;
        }

        .carousel-item {
          width: 90%;
          max-width: 800px;
        }

        .bookfolio-controls {
          gap: 1.5rem;
        }

        .carousel-info-title {
          font-size: 1.2rem;
        }

        .carousel-info-desc {
          font-size: 0.9rem;
        }
      }

      @media (max-width: 768px) {
        .bookfolio-container {
          padding: 1.5rem 0.75rem;
        }

        .bookfolio-scene {
          min-height: 320px;
          margin-bottom: 1.5rem;
        }

        .carousel-item {
          width: 95%;
          max-width: 600px;
        }

        .carousel-btn {
          width: 40px;
          height: 40px;
        }

        .carousel-indicators {
          gap: 0.5rem;
        }

        .carousel-indicator {
          padding: 0.3rem 0.6rem;
          font-size: 0.7rem;
        }

        .carousel-info {
          padding: 1rem;
        }

        .carousel-info-title {
          font-size: 1.1rem;
        }

        .carousel-info-desc {
          font-size: 0.85rem;
        }
      }

      @media (max-width: 480px) {
        .bookfolio-container {
          padding: 1rem 0.5rem;
        }

        .bookfolio-scene {
          min-height: 280px;
          margin-bottom: 1rem;
        }

        .carousel-item {
          width: 100%;
          max-width: 100%;
        }

        .bookfolio-controls {
          gap: 1rem;
        }

        .carousel-btn {
          width: 36px;
          height: 36px;
          font-size: 0.9rem;
        }

        .carousel-indicators {
          gap: 0.4rem;
        }

        .carousel-indicator {
          padding: 0.25rem 0.5rem;
          font-size: 0.65rem;
        }

        .carousel-info {
          padding: 0.75rem;
        }

        .carousel-info-title {
          font-size: 1rem;
          margin-bottom: 0.4rem;
        }

        .carousel-info-desc {
          font-size: 0.8rem;
          margin-bottom: 0.75rem;
        }
      }

      /* PREFERS REDUCED MOTION */
      @media (prefers-reduced-motion: reduce) {
        .carousel-item,
        .carousel-btn,
        .carousel-indicator,
        .carousel-info {
          transition: none !important;
          animation: none !important;
        }
      }
    `;
  }
}

// Exportar si está disponible module/export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BookFolio;
}
