// Modern product display with mobile-first filters and animated cards

let categories = [];
let products = [];
let activeCategory = 'all';

// Load categories and products
async function loadMenu() {
  console.log('🔄 Loading menu...');
  try {
    const [catRes, prodRes] = await Promise.all([
      fetch('/api/categories'),
      fetch('/api/products')
    ]);
    
    console.log('✅ Categories response:', catRes.status);
    console.log('✅ Products response:', prodRes.status);
    
    categories = await catRes.json();
    products = await prodRes.json();
    
    console.log('📦 Categories loaded:', categories);
    console.log('📦 Products loaded:', products);
    
    // Sort categories by display_order
    categories.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    
    renderFilters();
    renderProducts();
  } catch (err) {
    console.error('❌ Erreur chargement menu:', err);
  }
}

// Render modern filters with icons
function renderFilters() {
  console.log('🎨 Rendering filters...');
  const container = document.getElementById('menuFilters');
  if (!container) {
    console.error('❌ Element #menuFilters not found!');
    return;
  }
  
  const allCount = products.length;
  
  const filters = [
    { slug: 'all', name: 'Tout', icon: '🍽️', count: allCount }
  ];
  
  categories.forEach(cat => {
    const count = products.filter(p => p.category_slug === cat.slug).length;
    if (count > 0) {
      filters.push({ 
        slug: cat.slug, 
        name: cat.name, 
        icon: cat.icon || '📋', 
        count 
      });
    }
  });
  
  console.log('🎯 Filters to render:', filters);
  
  container.innerHTML = filters.map((f, index) => `
    <button 
      class="filter-pill ${f.slug === activeCategory ? 'active' : ''}" 
      data-category="${f.slug}"
      onclick="filterProducts('${f.slug}')"
      style="animation-delay: ${index * 0.05}s">
      <span class="pill-icon">${f.icon}</span>
      <span class="pill-text">
        <span class="pill-name">${f.name}</span>
        <span class="pill-count">${f.count}</span>
      </span>
    </button>
  `).join('');
  
  console.log('✅ Filters rendered');
}

// Filter products
function filterProducts(categorySlug) {
  activeCategory = categorySlug;
  
  // Update button states
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === categorySlug);
  });
  
  renderProducts();
  
  // Smooth scroll to products
  const grid = document.getElementById('productGrid');
  if (grid) {
    const filterHeight = document.querySelector('.menu-filters-wrapper')?.offsetHeight || 0;
    const offset = grid.offsetTop - filterHeight - 20;
    window.scrollTo({ top: offset, behavior: 'smooth' });
  }
}

// Render product cards
function renderProducts() {
  console.log('🎨 Rendering products...');
  const container = document.getElementById('productGrid');
  if (!container) {
    console.error('❌ Element #productGrid not found!');
    return;
  }
  
  let filtered = activeCategory === 'all' 
    ? products 
    : products.filter(p => p.category_slug === activeCategory);
  
  console.log(`📦 Filtered products (${activeCategory}):`, filtered);
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="no-products-icon">😕</div>
        <p class="text-muted mt-3">Aucun produit dans cette catégorie</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = filtered.map((p, index) => createProductCard(p, index)).join('');
  
  console.log('✅ Products rendered');
  
  // Animate cards
  setTimeout(() => {
    document.querySelectorAll('.product-card').forEach((card, i) => {
      setTimeout(() => card.classList.add('card-visible'), i * 50);
    });
  }, 50);
}

// Create modern product card
function createProductCard(product, index) {
  const badges = [];
  if (product.is_new == 1 || product.is_new === true) badges.push({ text: 'Nouveau', class: 'badge-new', icon: '✨' });
  if (product.is_popular == 1 || product.is_popular === true) badges.push({ text: 'Populaire', class: 'badge-popular', icon: '🔥' });
  if (product.is_spicy == 1 || product.is_spicy === true) badges.push({ text: 'Épicé', class: 'badge-spicy', icon: '🌶️' });
  
  let breadTypes = [];
  try {
    if (product.bread_types && product.bread_types !== 'null') {
      breadTypes = JSON.parse(product.bread_types);
    }
  } catch(e) {
    console.warn('Error parsing bread_types:', e);
  }
  const hasBreadOptions = breadTypes.length > 0;
  
  return `
    <div class="col-12 col-sm-6 col-lg-4">
      <div class="product-card" data-id="${product.id}">
        <!-- Image wrapper -->
        <div class="product-image-wrapper">
          <img src="${product.img || '/assets/images/placeholder.jpg'}" 
               alt="${product.title}" 
               class="product-image"
               onerror="this.src='/assets/images/placeholder.jpg'">
          
          <!-- Top badges -->
          ${badges.length > 0 ? `
            <div class="product-badges-top">
              ${badges.map(b => `
                <span class="product-badge ${b.class}">
                  ${b.icon} ${b.text}
                </span>
              `).join('')}
            </div>
          ` : ''}
          
          <!-- Custom badge from product -->
          ${product.badge ? `
            <div class="product-badge-custom">${product.badge}</div>
          ` : ''}
          
          <!-- Overlay with quick view -->
          <div class="product-overlay">
            <button class="btn-quick-view" onclick="openProductDetail(${product.id})">
              <i class="fas fa-eye"></i> Voir détails
            </button>
          </div>
        </div>
        
        <!-- Content -->
        <div class="product-content">
          <!-- Bread type tags for sandwiches -->
          ${hasBreadOptions ? `
            <div class="bread-tags">
              ${breadTypes.map(type => {
                const icons = { pain: '🥖', galette: '🌯', naan: '🫓' };
                const labels = { pain: 'Pain', galette: 'Galette', naan: 'Naan' };
                return `<span class="bread-tag">${icons[type] || '🍞'} ${labels[type] || type}</span>`;
              }).join('')}
            </div>
          ` : ''}
          
          <!-- Title -->
          <h3 class="product-title">${product.title}</h3>
          
          <!-- Description -->
          <p class="product-description">${product.description || ''}</p>
          
          <!-- Footer with price only -->
          <div class="product-footer">
            <div class="product-price">${product.price || 'Prix non défini'}</div>
          </div>
        </div>
        
        <!-- Shimmer effect -->
        <div class="product-shimmer"></div>
      </div>
    </div>
  `;
}

// Open product detail modal (à implémenter)
function openProductDetail(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  
  // TODO: Implement modal with full details
  alert(`Détails de ${product.title}\n\nFonctionnalité à venir...`);
}

// Open customize modal (à implémenter)
function openCustomize(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  
  // TODO: Implement customization modal with supplements
  alert(`Personnalisation de ${product.title}\n\nFonctionnalité à venir...`);
}

// Add to cart (à implémenter)
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  
  // TODO: Implement cart system
  // For now, show a success toast
  showToast(`${product.title} ajouté au panier 🎉`, 'success');
}

// Simple toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  toast.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('toast-show'), 100);
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Sticky filters on scroll - DISABLED (causing glitch)
/*
let lastScroll = 0;
window.addEventListener('scroll', () => {
  const filterWrapper = document.querySelector('.menu-filters-wrapper');
  if (!filterWrapper) return;
  
  const menuSection = document.getElementById('menu');
  if (!menuSection) return;
  
  const menuTop = menuSection.offsetTop;
  const menuBottom = menuTop + menuSection.offsetHeight;
  const scrollPos = window.scrollY;
  
  if (scrollPos > menuTop && scrollPos < menuBottom - 200) {
    filterWrapper.classList.add('filters-sticky');
  } else {
    filterWrapper.classList.remove('filters-sticky');
  }
});
*/

// Initialize
document.addEventListener('DOMContentLoaded', loadMenu);

