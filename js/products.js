// Modern product display with mobile-first filters and animated cards

let categories = [];
let products = [];
let activeCategory = '';

// Load categories and products
async function loadMenu() {
  try {
    // Appel Edge Function pour les produits
    // On suppose que la clé roleKey est disponible comme dans newsletter
    const { FUNCTIONS, roleKey ,supabaseKey } = await import('./supabaseClient.js');
    const [catRes, prodRes] = await Promise.all([
      fetch(FUNCTIONS.getCategories, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': roleKey,
          'Authorization': `Bearer ${roleKey}`
        }
      }),
      fetch(FUNCTIONS.getProducts, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': roleKey,
          'Authorization': `Bearer ${roleKey}`
        }
      })
    ]);

    categories = await catRes.json();
    products = await prodRes.json();

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
  
  const filters = [];
  
  categories.forEach(cat => {
    const count = products.filter(p => p.category_id === cat.id).length;
    if (count > 0) {
      filters.push({ 
        slug: cat.slug, 
        name: cat.name, 
        icon: cat.icon || '📋', 
        count 
      });
    }
  });

  // If no active category chosen yet, default to the first available
  if (!activeCategory && filters.length) activeCategory = filters[0].slug;
    
  container.innerHTML = filters.map((f, index) => `
    <button 
      class="filter-pill ${f.slug === activeCategory ? 'active' : ''}" 
      data-category="${f.slug}"
      onclick="filterProducts('${f.slug}')"
      style="animation-delay: ${index * 0.05}s">
      <span class="pill-icon">${(f.icon && (f.icon.startsWith('http') || f.icon.startsWith('/') || /\.(png|jpe?g|gif|svg)$/i.test(f.icon))) ? `<img src="${f.icon}" style="height:18px; width:18px; object-fit:contain; margin-right:6px">` : (f.icon||'')}</span>
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
  const container = document.getElementById('productGrid');
  if (!container) {
    console.error('❌ Element #productGrid not found!');
    return;
  }
  
  let filtered;
  if (activeCategory === 'all') {
    filtered = products;
  } else {
    // Trouver la catégorie sélectionnée
    const cat = categories.find(c => c.slug === activeCategory);
    if (cat && cat.id !== undefined) {
      filtered = products.filter(p => p.category_id === cat.id);
    } else {
      filtered = [];
    }
  }
  
  
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
  
  // For sandwich category always show the three bread options
  let breadTypes = [];
  const isSandwich = product.category_slug === 'sandwichs' || product.category_slug === 'sandwich';
  if (isSandwich) {
    breadTypes = ['pain','galette','naan'];
  } else {
    try {
      if (product.bread_types && product.bread_types !== 'null') {
        breadTypes = JSON.parse(product.bread_types);
      }
    } catch(e) {
      console.warn('Error parsing bread_types:', e);
    }
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
          
          <!-- Note: custom free-form badges are intentionally not displayed; only admin flags control badges -->
        </div>
        
        <!-- Content -->
        <div class="product-content">
          <!-- Bread type tags for sandwiches -->
          ${hasBreadOptions ? `
            <div class="bread-tags">
              ${breadTypes.map(type => {
                const icons = { pain: '🥖', galette: '🌯', naan: '🫓' };
                const labels = { pain: 'Pain maison', galette: 'Galette', naan: 'Naan' };
                return `<span class="bread-tag">${icons[type] || '🍞'} ${labels[type] || type}</span>`;
              }).join('')}
            </div>
          ` : ''}
          
          <!-- Title -->
          <h3 class="product-title">${product.title}</h3>
          
          <!-- Description -->
          <p class="product-description">${product.description || ''}</p>
          
          <!-- Footer with price and button -->
          <div class="product-footer">
            <div class="product-price">${product.price || 'Prix non défini'}</div>
            <button class="btn-add-to-cart-small" onclick="handleAddToCart(${product.id})">
              <i class="fas fa-shopping-cart"></i>
            </button>
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
function addToCart(productId, event) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  
  // Get the button that was clicked
  const button = event ? event.target.closest('button') : null;
  showCheckBadge(button);
}

// Floating check badge animation
function showCheckBadge(button) {
  if (!button) return;
  
  const badge = document.createElement('div');
  badge.className = 'check-badge';
  badge.innerHTML = '<i class="fas fa-check"></i>';
  
  // Position the badge at the button
  const rect = button.getBoundingClientRect();
  badge.style.position = 'fixed';
  badge.style.left = (rect.left + rect.width / 2) + 'px';
  badge.style.top = (rect.top - 10) + 'px';
  
  document.body.appendChild(badge);
  
  // Trigger animation
  setTimeout(() => badge.classList.add('check-badge-show'), 10);
  
  // Remove after animation
  setTimeout(() => {
    badge.classList.remove('check-badge-show');
    setTimeout(() => badge.remove(), 500);
  }, 1500);
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

// Add to cart handler
function handleAddToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) {
    console.error('Product not found:', productId);
    return;
  }

  // Add to cart using CartManager
  CartManager.addToCart({
    id: product.id,
    name: product.title,
    price: product.price,
    image: product.img
  }, 1);
  
  // Show check badge - get the button that was clicked
  const button = event ? event.target.closest('button') : null;
  showCheckBadge(button);
}

// Make function globally accessible
window.handleAddToCart = handleAddToCart;
window.filterProducts = filterProducts;

// Initialize
document.addEventListener('DOMContentLoaded', loadMenu);

