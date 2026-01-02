// Front client : placeholder (promotions désactivées pour l'instant)
function loadPromotions() {
  const container = document.getElementById('promotionsGrid');
  const noPromos = document.getElementById('noPromotions');
  if (container) container.innerHTML = '';
  if (noPromos) noPromos.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', loadPromotions);
