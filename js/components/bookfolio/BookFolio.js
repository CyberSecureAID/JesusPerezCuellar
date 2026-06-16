/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BookFolio — Galería interactiva de proyectos estilo portfolio de libros
 * ═══════════════════════════════════════════════════════════════════════════════
 * VERSIÓN: 1.0.0
 * Presenta proyectos en tarjetas flip 3D con soporte para categorías y filtros.
 */

class BookFolio {
  constructor(container, options = {}) {
    this.container = document.querySelector(container);
    if (!this.container) {
      console.warn(`[BookFolio] Contenedor "${container}" no encontrado.`);
      return;
    }

    this.projects = options.projects || [];
    this.currentFilter = 'all';
    this.init();
  }

  init() {
    // Crear estructura HTML
    this.createDOM();
    // Renderizar proyectos
    this.render();
    // Asignar eventos
    this.attachEvents();
  }

  createDOM() {
    this.container.innerHTML = `
      <div class="bookfolio-wrap">
        <div class="bookfolio-grid" id="bookfolio-grid">
          <!-- tarjetas generadas dinámicamente -->
        </div>
      </div>
    `;

    // Inyectar estilos CSS si no existen
    if (!document.getElementById('bookfolio-styles')) {
      const style = document.createElement('style');
      style.id = 'bookfolio-styles';
      style.textContent = this.getStyles();
      document.head.appendChild(style);
    }
  }

  render() {
    const grid = document.getElementById('bookfolio-grid');
    if (!grid) return;

    grid.innerHTML = '';

    // Filtrar proyectos
    const filtered = this.currentFilter === 'all' 
      ? this.projects 
      : this.projects.filter(p => p.category === this.currentFilter);

    // Generar tarjetas
    filtered.forEach((project, index) => {
      const card = this.createProjectCard(project, index);
      grid.appendChild(card);
    });

    // Animar entrada
    this.animateCards();
  }

  createProjectCard(project, index) {
    const card = document.createElement('div');
    card.className = 'bookfolio-card';
    card.style.animationDelay = `${index * 0.08}s`;

    card.innerHTML = `
      <div class="bookfolio-card-inner">
        <!-- FRENTE -->
        <div class="bookfolio-card-front">
          <img src="${project.image}" alt="${project.title}" class="bookfolio-img" loading="lazy" />
          <div class="bookfolio-overlay">
            <span class="bookfolio-category">${project.category}</span>
          </div>
        </div>
        <!-- REVERSO -->
        <div class="bookfolio-card-back">
          <h3 class="bookfolio-title">${project.title}</h3>
          <p class="bookfolio-description">${project.description}</p>
          ${project.link && project.link !== '#' 
            ? `<a href="${project.link}" class="bookfolio-link" target="_blank" rel="noopener">Ver →</a>` 
            : ''}
        </div>
      </div>
    `;

    // Evento flip al click/hover
    card.addEventListener('mouseenter', () => this.flipCard(card));
    card.addEventListener('mouseleave', () => this.unflipCard(card));
    card.addEventListener('click', () => this.toggleCard(card));

    return card;
  }

  flipCard(card) {
    card.classList.add('flipped');
  }

  unflipCard(card) {
    card.classList.remove('flipped');
  }

  toggleCard(card) {
    card.classList.toggle('flipped');
  }

  animateCards() {
    const cards = document.querySelectorAll('.bookfolio-card');
    cards.forEach((card) => {
      card.style.animation = 'bookfolioFadeIn 0.6s ease-out forwards';
    });
  }

  attachEvents() {
    // Soporte para filtros externos (si existen botones)
    const filterBtns = document.querySelectorAll('[data-bookfolio-filter]');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.bookfolioFilter;
        this.render();
      });
    });
  }

  getStyles() {
    return `
      /* ═══════════════════════════════════════════════════════════
         BOOKFOLIO — Estilos CSS
      ═══════════════════════════════════════════════════════════ */

      .bookfolio-wrap {
        width: 100%;
        padding: 2rem 0;
      }

      .bookfolio-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 2rem;
        width: 100%;
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 1rem;
      }

      /* TARJETAS FLIP 3D */
      .bookfolio-card {
        perspective: 1000px;
        height: 320px;
        cursor: pointer;
        position: relative;
        animation-fill-mode: both;
      }

      .bookfolio-card-inner {
        position: relative;
        width: 100%;
        height: 100%;
        transition: transform 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        transform-style: preserve-3d;
      }

      .bookfolio-card.flipped .bookfolio-card-inner {
        transform: rotateY(180deg);
      }

      .bookfolio-card-front,
      .bookfolio-card-back {
        position: absolute;
        width: 100%;
        height: 100%;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid rgba(0, 255, 255, 0.2);
        background: linear-gradient(135deg, #0a0e27, #1a1a3e);
      }

      /* FRENTE — Imagen + Overlay */
      .bookfolio-card-front {
        align-items: center;
        justify-content: center;
        position: relative;
      }

      .bookfolio-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.4s ease;
      }

      .bookfolio-card:hover .bookfolio-img {
        transform: scale(1.05);
      }

      .bookfolio-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.8) 100%);
        display: flex;
        align-items: flex-end;
        padding: 1.2rem;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .bookfolio-card:hover .bookfolio-overlay {
        opacity: 1;
      }

      .bookfolio-category {
        display: inline-block;
        background: rgba(0, 255, 255, 0.2);
        color: #00ffff;
        padding: 0.4rem 0.8rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        border: 1px solid rgba(0, 255, 255, 0.4);
        backdrop-filter: blur(8px);
      }

      /* REVERSO — Contenido */
      .bookfolio-card-back {
        background: linear-gradient(135deg, #0f0f2e 0%, #1a1a4e 100%);
        transform: rotateY(180deg);
        padding: 1.5rem;
        color: #e0e0e0;
      }

      .bookfolio-title {
        font-size: 1.1rem;
        font-weight: 700;
        color: #00ffff;
        margin-bottom: 0.8rem;
        text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
      }

      .bookfolio-description {
        font-size: 0.85rem;
        line-height: 1.4;
        color: #a0a0c0;
        margin-bottom: 1rem;
        flex: 1;
      }

      .bookfolio-link {
        display: inline-block;
        color: #00ffff;
        text-decoration: none;
        font-weight: 600;
        font-size: 0.9rem;
        padding: 0.5rem 1rem;
        border: 1px solid rgba(0, 255, 255, 0.4);
        border-radius: 4px;
        transition: all 0.3s ease;
        cursor: pointer;
      }

      .bookfolio-link:hover {
        background: rgba(0, 255, 255, 0.1);
        border-color: rgba(0, 255, 255, 0.8);
        box-shadow: 0 0 12px rgba(0, 255, 255, 0.3);
      }

      /* ANIMACIÓN DE ENTRADA */
      @keyframes bookfolioFadeIn {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      /* RESPONSIVE */
      @media (max-width: 768px) {
        .bookfolio-grid {
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 1rem;
          padding: 0 0.5rem;
        }

        .bookfolio-card {
          height: 240px;
        }

        .bookfolio-card-back {
          padding: 1rem;
        }

        .bookfolio-title {
          font-size: 0.95rem;
        }

        .bookfolio-description {
          font-size: 0.75rem;
          margin-bottom: 0.5rem;
        }
      }

      @media (max-width: 480px) {
        .bookfolio-grid {
          grid-template-columns: repeat(2, 1fr);
          gap: 0.8rem;
        }

        .bookfolio-card {
          height: 200px;
        }
      }

      /* RESPETO A PREFERS-REDUCED-MOTION */
      @media (prefers-reduced-motion: reduce) {
        .bookfolio-card-inner {
          transition: none;
        }

        .bookfolio-img {
          transition: none;
        }

        .bookfolio-card {
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
