// Gestion des avis Google Maps
document.addEventListener('DOMContentLoaded', function() {
  loadReviews();
});

// Avis exemple (fallback si l'API n'est pas accessible)
const mockReviews = [
  {
    author: "Sophie Martin",
    rating: 5,
    date: "Il y a 2 jours",
    text: "Excellente pizzeria ! Les pizzas sont délicieuses avec une pâte fine et croustillante. Le kebab est généreux et les frites maison sont un régal. Service rapide et accueillant. Je recommande vivement !"
  },
  {
    author: "Ahmed Benali",
    rating: 5,
    date: "Il y a 1 semaine",
    text: "Meilleur naan de la région ! La viande est halal et de qualité. Les portions sont généreuses et les prix très corrects. L'équipe est sympa et professionnelle. Mon QG pour les soirées entre amis."
  },
  {
    author: "Marie Dubois",
    rating: 4,
    date: "Il y a 2 semaines",
    text: "Très bon rapport qualité-prix. Les pizzas sont savoureuses et bien garnies. Petit bémol sur l'attente en soirée mais ça vaut le coup d'attendre. La sauce blanche est divine !"
  },
  {
    author: "Lucas Bernard",
    rating: 5,
    date: "Il y a 3 semaines",
    text: "Super découverte ! Le crousty chicken est incroyable, croustillant à souhait. Les sandwichs sont copieux et les ingrédients frais. Livraison rapide via Deliveroo. Top !"
  },
  {
    author: "Fatima Zahra",
    rating: 5,
    date: "Il y a 1 mois",
    text: "Restaurant familial chaleureux. Les naans garnis sont authentiques et délicieux. Les enfants adorent les pizzas 4 fromages. Prix très abordables pour la qualité offerte. Bravo !"
  },
  {
    author: "Thomas Lefebvre",
    rating: 4,
    date: "Il y a 1 mois",
    text: "Bonne adresse pour manger rapidement. Les kebabs sont bien garnis avec beaucoup de viande. La salade est fraîche. Dommage qu'il n'y ait pas plus de places assises mais sinon c'est parfait."
  },
  {
    author: "Yasmine Kaci",
    rating: 5,
    date: "Il y a 2 mois",
    text: "Je commande régulièrement et je ne suis jamais déçue ! Les pizzas sont toujours chaudes et délicieuses. Le tacos est un délice. L'accueil est toujours souriant. Mon resto préféré du quartier !"
  }
];

function loadReviews() {
  const container = document.getElementById('reviewsCarouselInner');
  if (!container) return;

  // Attempt to fetch latest snapshot from server; fall back to mocks on error
  (async () => {
    let reviewsSource = mockReviews;
    try {
      // fetch a larger set and filter client-side for rating > 3
      const resp = await fetch('/api/reviews?provider=google&place_id=ChIJa6txmmEnVQ0RZxi6aogq6fw&limit=50');
      if (resp.ok) {
        const data = await resp.json();
        // if endpoint returns wrapper with reviews, use it
        if (data && Array.isArray(data.reviews) && data.reviews.length) {
          // map Google-like reviews to the shape used by the renderer
          reviewsSource = data.reviews.map(r => ({
            author: r.author || r.author_name || 'Utilisateur',
            rating: r.rating || 0,
            date: r.relative_time_description || (r.time ? new Date(r.time*1000).toLocaleDateString() : ''),
            text: r.text || r.content || ''
          }));
          // keep only reviews with rating > 3
          reviewsSource = reviewsSource.filter(rv => Number(rv.rating || 0) > 3);
          // expose average/total if elements exist
          const avgEl = document.getElementById('reviewsAvg');
          const totEl = document.getElementById('reviewsTotal');
          if (avgEl && typeof data.avg_rating !== 'undefined') {
            const n = Number(data.avg_rating);
            avgEl.textContent = Number.isFinite(n) ? n.toFixed(1) : data.avg_rating;
          }
          if (totEl && typeof data.total_reviews !== 'undefined') {
            totEl.textContent = String(data.total_reviews);
          }
        } else {
          // server returned no snapshot: treat as "no reviews" (do not use mocks)
          reviewsSource = [];
        }
      }
    } catch (e) {
      // ignore — we'll use mockReviews
      console.warn('Failed to fetch reviews snapshot, using mocks', e);
    }
    // If there are no reviews available from server, hide the reviews section.
    if (!reviewsSource || reviewsSource.length === 0) {
      const reviewsSection = document.getElementById('reviews');
      if (reviewsSection) reviewsSection.style.display = 'none';
      return;
    }
    // Grouper les avis par slides (3 avis par slide sur desktop, 1 sur mobile)
    const reviewsPerSlide = window.innerWidth >= 992 ? 3 : 1;
    const slides = [];
    for (let i = 0; i < reviewsSource.length; i += reviewsPerSlide) {
      slides.push(reviewsSource.slice(i, i + reviewsPerSlide));
    }

    container.innerHTML = slides.map((slideReviews, slideIndex) => {
      const isActive = slideIndex === 0 ? ' active' : '';
      const reviewsHTML = slideReviews.map(review => createReviewCard(review)).join('');
      return `
      <div class="carousel-item${isActive}">
        <div class="row g-4 justify-content-center">
          ${reviewsHTML}
        </div>
      </div>
    `;
    }).join('');
  })();
}

function createReviewCard(review) {
  const initial = review.author.charAt(0).toUpperCase();
  const stars = generateStars(review.rating);
  
  const colClass = window.innerWidth >= 992 ? 'col-md-4' : 'col-12';
  
  return `
    <div class="${colClass}">
      <div class="review-card">
        <div class="review-header">
          <div class="review-avatar">${initial}</div>
          <div class="review-info">
            <div class="review-author">${escapeHTML(review.author)}</div>
            <div class="review-date">${escapeHTML(review.date)}</div>
            <div class="review-stars">${stars}</div>
          </div>
        </div>
        <div class="review-text">“${escapeHTML(review.text)}”</div>
      </div>
    </div>
  `;
}

function generateStars(rating) {
  let starsHTML = '';
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  
  for (let i = 0; i < fullStars; i++) {
    starsHTML += '<i class="fas fa-star"></i>';
  }
  
  if (hasHalfStar) {
    starsHTML += '<i class="fas fa-star-half-alt"></i>';
  }
  
  const emptyStars = 5 - Math.ceil(rating);
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += '<i class="far fa-star"></i>';
  }
  
  return starsHTML;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Recharger le carousel lors du redimensionnement de la fenêtre
let resizeTimer;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function() {
    loadReviews();
  }, 250);
});
