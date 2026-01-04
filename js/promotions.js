/**
 * @file promotions.js
 * Version la plus simple possible du carrousel.
 * Le carrousel s'arrête à la première et à la dernière diapositive.
 * Pas de boucle infinie.
 */

async function setupSimpleCarousel() {
  // 1. Sélection des éléments du DOM
  const swiperContainer = document.querySelector('.promotions-carousel');
  const wrapper = document.getElementById('promotionsWrapper');
  const emptyState = document.getElementById('noPromotions');

  if (!swiperContainer || !wrapper) {
    console.error("Conteneurs Swiper introuvables.");
    return;
  }

  try {
    // 2. Récupération des données
    const response = await fetch('/api/promotions');
    if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
    const promotions = await response.json();

    console.log('Promotions reçues:', promotions); // DEBUG

    // Gestion du cas où il n'y a aucune promotion
    if (!promotions || promotions.length === 0) {
      if (emptyState) emptyState.classList.remove('d-none');
      return;
    }

    // 3. Construction et injection du HTML
    const slidesHtml = promotions.map(promo => {
      const imageUrl = promo.image_url || 'assets/images/placeholder.png';
      const title = promo.title || 'Offre spéciale';
      const subtitle = promo.subtitle || '';
      const badgeText = promo.badge_text || '';
      
      return `
        <div class="swiper-slide promotion-slide">
          <div class="promo-card-classic">
            <img src="${imageUrl}" alt="${title}" class="promo-card-classic__bg-image">
            <div class="promo-card-classic__overlay">
              <div class="promo-card-classic__header">
                <div class="promo-card-classic__title">${title}</div>
              </div>
              ${subtitle ? `<div class="promo-card-classic__body"><p class="promo-card-classic__description">${subtitle}</p></div>` : ''}
              ${badgeText ? `<div class="promo-card-classic__price-tag"><span class="promo-card-classic__price-new">${badgeText}</span></div>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    wrapper.innerHTML = slidesHtml;

    // ==================================================================
    // ==================   CONFIGURATION SIMPLIFIÉE   ==================
    // ==================================================================
    const initialSlide = promotions.length > 1 ? 1 : 0; // démarrer sur la 2e image si disponible

    new Swiper(swiperContainer, {
      // Large slide style: we let CSS set width (70vw), so use auto
      slidesPerView: 'auto',
      spaceBetween: 1,
      speed: 800,

      // Centre la diapositive active
      centeredSlides: true,

      // La boucle est désactivée. C'est tout.
      loop: false,
      initialSlide,

      // Lecture automatique
      autoplay: {
        delay: 4000,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      },

      // Navigation avec les flèches
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },

      // Pagination (indicateurs)
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
    });

  } catch (error) {
    console.error("Échec du chargement des promotions :", error);
    if (emptyState) {
        wrapper.innerHTML = '';
        emptyState.classList.remove('d-none');
    }
  }
}

document.addEventListener('DOMContentLoaded', setupSimpleCarousel);
