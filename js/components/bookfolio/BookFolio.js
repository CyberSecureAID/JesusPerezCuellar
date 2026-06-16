/**
 * ════════════════════════════════════════════════════════════════════════════
 * BookFolio 3D — Galería estilo abanico de libros con perspectiva 3D
 * ════════════════════════════════════════════════════════════════════════════
 * VERSIÓN: 3.0.0
 * Efecto visual de libros abiertos en perspectiva 3D estilo abanico
 * Soporta imágenes ultrawide panorámicas (1536x674 píxeles)
 */

class BookFolio {
  constructor(container, options = {}) {
    this.container = document.querySelector(container);
    if (!this.container) {
      console.warn(`[BookFolio] Contenedor "${container}" no encontrado.`);
      return;
    }

    this.projects = options.projects || [];
    this.init();
  }

  init() {
    this.createDOM();
    this.render();
    this.attachEvents();
  }

  createDOM() {
    this.container.innerHTML = `
      <div class="bookfolio-wrapper">
        <div class="bookfolio-fan" id="bookfolio-fan">
          <!-- items generados dinámicamente -->
        </div>
      </div>
    `;

    // Inyectar estilos CSS
    if (!document.getElementById('bookfolio-styles-3d')) {
      const style = document.createElement('style');
      style.id = 'bookfolio-styles-3d';
      style.textContent = this.getStyles();
      document.head.appendChild(style);
    }
  }

  render() {
    const fan = document.getElementById('bookfolio-fan');
    if (!fan) return;

    fan.innerHTML = '';

    const totalItems = this.projects.length;
    const angleSpread = 180; // grados totales del abanico
    const anglePerItem = angleSpread / (totalItems - 1);

    this.projects.forEach((project, index) => {
      const angle = -angleSpread / 2 + index * anglePerItem;
      
      const book = document.createElement('div');
      book.className = 'book-item';
      book.style.setProperty('--book-angle', `${angle}deg`);
      book.style.setProperty('--book-index', index);
      book.dataset.index = index;

      book.innerHTML = `
        <div class="book-container">
          <div class="book-spine" aria-hidden="true"></div>
          <div class="book-cover">
            <img src="${project.image}" alt="${project.title}" class="book-image" loading="lazy" />
            <div class="book-overlay">
              <div class="book-label">
                <span class="book-title">${project.title}</span>
                <span class="book-category">${project.category}</span>
              </div>
            </div>
          </div>
        </div>
      `;

      fan.appendChild(book);
    });
  }

  attachEvents() {
    const books = document.querySelectorAll('.book-item');
    
    books.forEach((book) => {
      book.addEventListener('mouseenter', () => {
        this.highlightBook(book);
      });
      
      book.addEventListener('mouseleave', () => {
        this.unhighlightBook(book);
      });

      book.addEventListener('click', () => {
        const index = parseInt(book.dataset.index, 10);
        const project = this.projects[index];
        if (project.link && project.link !== '#') {
          window.open(project.link, '_blank');
        }
      });
    });
  }

  highlightBook(book) {
    document.querySelectorAll('.book-item').forEach(b => {
      b.classList.remove('highlighted');
    });
    book.classList.add('highlighted');
  }

  unhighlightBook(book) {
    book.classList.remove('highlighted');
  }

  getStyles() {
    return `
      /* ═══════════════════════════════════════════════════════════════════════════
         BOOKFOLIO 3D — Abanico de libros con perspectiva 3D
      ═══════════════════════════════════════════════════════════════════════════ */

      .bookfolio-wrapper {
        width: 100%;
        padding: 3rem 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        perspective: 2000px;
        background: radial-gradient(ellipse at center, rgba(0, 255, 255, 0.02) 0%, rgba(0, 0, 0, 0) 70%);
        min-height: 700px;
      }

      .bookfolio-fan {
        position: relative;
        width: 100%;
        max-width: 1400px;
        height: 600px;
        perspective: 2000px;
        transform-style: preserve-3d;
      }

      /* ITEMS INDIVIDUALES */
      .book-item {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 380px;
        height: 170px;
        margin-left: -190px;
        margin-top: -85px;
        cursor: pointer;
        transform: 
          translateZ(0)
          rotateY(var(--book-angle))
          rotateZ(0deg)
          translateZ(320px);
        transform-style: preserve-3d;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        z-index: calc(20 - abs(var(--book-index, 0) - 5) * 2);
      }

      .book-item:hover {
        transform: 
          translateZ(0)
          rotateY(var(--book-angle))
          rotateZ(0deg)
          translateZ(360px)
          scale(1.05);
        z-index: 100;
      }

      /* CONTENEDOR DEL LIBRO */
      .book-container {
        position: relative;
        width: 100%;
        height: 100%;
        transform-style: preserve-3d;
      }

      /* LOMO LATERAL (spine) */
      .book-spine {
        position: absolute;
        left: -12px;
        top: 0;
        width: 12px;
        height: 100%;
        background: linear-gradient(90deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.3) 100%);
        border-left: 1px solid rgba(0, 255, 255, 0.1);
        transform: rotateY(90deg);
        transform-origin: left center;
      }

      /* CUBIERTA DEL LIBRO */
      .book-cover {
        position: relative;
        width: 100%;
        height: 100%;
        border-radius: 4px;
        overflow: hidden;
        background: #0a0e27;
        border: 2px solid rgba(0, 255, 255, 0.3);
        box-shadow: 
          inset 0 0 20px rgba(0, 0, 0, 0.5),
          -8px 12px 30px rgba(0, 0, 0, 0.6),
          0 0 40px rgba(0, 255, 255, 0.1);
        transform-style: preserve-3d;
      }

      .book-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        display: block;
        transition: transform 0.4s ease;
      }

      .book-item:hover .book-image {
        transform: scale(1.08);
      }

      /* OVERLAY DE INFORMACIÓN */
      .book-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, 
          rgba(0, 0, 0, 0) 0%, 
          rgba(0, 0, 0, 0.3) 50%, 
          rgba(0, 0, 0, 0.7) 100%);
        display: flex;
        align-items: flex-end;
        padding: 1rem;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      }

      .book-item:hover .book-overlay {
        opacity: 1;
      }

      .book-label {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }

      .book-title {
        font-size: 0.95rem;
        font-weight: 700;
        color: #ffffff;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
      }

      .book-category {
        font-size: 0.75rem;
        color: #00ffff;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-weight: 600;
        text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
      }

      /* ESTADO DESTACADO */
      .book-item.highlighted {
        z-index: 100 !important;
        transform: 
          translateZ(0)
          rotateY(var(--book-angle))
          rotateZ(0deg)
          translateZ(360px)
          scale(1.1);
      }

      .book-item.highlighted .book-cover {
        border-color: rgba(0, 255, 255, 0.8);
        box-shadow: 
          inset 0 0 20px rgba(0, 0, 0, 0.5),
          -8px 12px 30px rgba(0, 0, 0, 0.6),
          0 0 60px rgba(0, 255, 255, 0.4);
      }

      /* ANIMACIÓN DE ENTRADA */
      @keyframes bookFanEntry {
        from {
          opacity: 0;
          transform: translateZ(0) rotateY(var(--book-angle)) translateZ(200px) scale(0.8);
        }
        to {
          opacity: 1;
          transform: translateZ(0) rotateY(var(--book-angle)) translateZ(320px) scale(1);
        }
      }

      .book-item {
        animation: bookFanEntry 0.6s ease-out forwards;
        animation-delay: calc(var(--book-index) * 0.05s);
      }

      /* RESPONSIVE */
      @media (max-width: 1200px) {
        .bookfolio-wrapper {
          min-height: 600px;
          padding: 2rem 1rem;
        }

        .bookfolio-fan {
          height: 500px;
        }

        .book-item {
          width: 320px;
          height: 145px;
          margin-left: -160px;
          margin-top: -72.5px;
          transform: 
            translateZ(0)
            rotateY(var(--book-angle))
            translateZ(260px);
        }

        .book-item:hover {
          transform: 
            translateZ(0)
            rotateY(var(--book-angle))
            translateZ(300px)
            scale(1.05);
        }
      }

      @media (max-width: 768px) {
        .bookfolio-wrapper {
          min-height: 500px;
          padding: 1.5rem 0.75rem;
        }

        .bookfolio-fan {
          height: 400px;
        }

        .book-item {
          width: 260px;
          height: 120px;
          margin-left: -130px;
          margin-top: -60px;
          transform: 
            translateZ(0)
            rotateY(var(--book-angle))
            translateZ(200px);
        }

        .book-item:hover {
          transform: 
            translateZ(0)
            rotateY(var(--book-angle))
            translateZ(230px)
            scale(1.04);
        }

        .book-title {
          font-size: 0.85rem;
        }

        .book-category {
          font-size: 0.7rem;
        }
      }

      @media (max-width: 480px) {
        .bookfolio-wrapper {
          min-height: 400px;
          padding: 1rem 0.5rem;
        }

        .bookfolio-fan {
          height: 320px;
        }

        .book-item {
          width: 200px;
          height: 90px;
          margin-left: -100px;
          margin-top: -45px;
          transform: 
            translateZ(0)
            rotateY(var(--book-angle))
            translateZ(140px);
        }

        .book-item:hover {
          transform: 
            translateZ(0)
            rotateY(var(--book-angle))
            translateZ(160px)
            scale(1.03);
        }

        .book-spine {
          width: 8px;
          left: -8px;
        }

        .book-cover {
          border-radius: 2px;
          border-width: 1px;
        }

        .book-label {
          padding: 0.5rem;
          gap: 0.2rem;
        }

        .book-title {
          font-size: 0.75rem;
        }

        .book-category {
          font-size: 0.6rem;
        }
      }

      /* PREFERS REDUCED MOTION */
      @media (prefers-reduced-motion: reduce) {
        .book-item {
          animation: none !important;
          transition: none !important;
        }

        .book-image,
        .book-overlay {
          transition: none !important;
        }
      }

      /* 3D SUPPORT */
      @supports not (transform: rotateY(1deg)) {
        .book-item {
          transform: none;
          display: inline-block;
          margin: 1rem;
        }

        .book-spine {
          display: none;
        }
      }
    `;
  }
}

// Exportar si está disponible module/export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BookFolio;
}
