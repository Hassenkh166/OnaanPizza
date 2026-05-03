// Gestion des avis Google Maps
document.addEventListener('DOMContentLoaded', function() {
  loadReviews();
});



function loadReviews() {
  const container = document.getElementById('reviewsCarouselInner');
  if (!container) return;

  // Attempt to fetch latest snapshot from server; fall back to mocks on error
  (async () => {
    let reviewsSource = [];
    try {
      // Appel à la fonction Edge Supabase pour récupérer les reviews
      const { FUNCTIONS, supabaseKey } = await import('./supabaseClient.js');
      console.log("Clé utilisée :", supabaseKey);
      const resp = await fetch(`${FUNCTIONS.reviews}?provider=google&place_id=ChIJa6txmmEnVQ0RZxi6aogq6fw&limit=50`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      if (resp.ok) {
        const data = await resp.json();
        
        // Handle case where data might be an array (from Supabase query)
        let reviewData = data;
        if (Array.isArray(data)) {
          reviewData = data[0] || {};
        }
        
        // Parse reviews from either `reviews` (new payload) or `reviews_json` (legacy payload)
        let reviews = [];
        if (Array.isArray(reviewData.reviews)) {
          reviews = reviewData.reviews;
        } else if (reviewData.reviews_json) {
          try {
            reviews = JSON.parse(reviewData.reviews_json);
            console.log('Parsed reviews:', reviews);
          } catch (e) {
            console.warn('Failed to parse reviews_json:', e);
            reviews = [];
          }
        }
        
        // if endpoint returns wrapper with reviews, use it
        if (reviews && reviews.length) {
          // map Google-like reviews to the shape used by the renderer
          reviewsSource = reviews.map(r => ({
            author: r.author || r.author_name || 'Utilisateur',
            rating: r.rating || 0,
            date: r.relative_time_description || (r.time ? new Date(r.time*1000).toLocaleDateString() : ''),
            text: r.text || r.content || ''
          }));
          // keep only strong reviews, but do not hide all reviews if none are > 4
          const filtered = reviewsSource.filter(rv => Number(rv.rating || 0) > 4);
          reviewsSource = filtered.length ? filtered : reviewsSource;
          // expose average/total if elements exist
          const avgEl = document.getElementById('reviewsAvg');
          const totEl = document.getElementById('reviewsTotal');
          if (avgEl && typeof reviewData.avg_rating !== 'undefined') {
            const n = Number(reviewData.avg_rating);
            avgEl.textContent = Number.isFinite(n) ? n.toFixed(1) : reviewData.avg_rating;
          }
          if (totEl && typeof reviewData.total_reviews !== 'undefined') {
            totEl.textContent = String(reviewData.total_reviews);
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
