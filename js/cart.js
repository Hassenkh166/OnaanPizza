/**
 * Cart Management Module
 * Handles shopping cart operations including adding items, removing items, and updating UI
 */

const CartManager = (() => {
  const STORAGE_KEY = 'onaanpizza_cart';
  
  /**
   * Get cart from localStorage
   * @returns {Object} Cart object with items array and total
   */
  function getCart() {
    try {
      const cart = localStorage.getItem(STORAGE_KEY);
      return cart ? JSON.parse(cart) : { items: [], total: 0 };
    } catch (error) {
      console.error('Error reading cart from localStorage:', error);
      return { items: [], total: 0 };
    }
  }

  /**
   * Save cart to localStorage
   * @param {Object} cart - Cart object
   */
  function saveCart(cart) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      updateBadge();
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }

  /**
   * Add product to cart
   * @param {Object} product - Product with id, name, price, image, options (optional)
   * @param {number} quantity - Quantity to add (default 1)
   */
  function addToCart(product, quantity = 1) {
    if (!product || !product.id) {
      console.error('Invalid product:', product);
      return false;
    }

    const cart = getCart();
    
    // Create a unique key for this item (considering options if present)
    const optionsKey = product.options ? JSON.stringify(product.options) : '';
    const existingItem = cart.items.find(item => 
      item.id === product.id && 
      (item.optionsKey === optionsKey)
    );

    if (existingItem) {
      // Same product with same options - increase quantity
      existingItem.quantity += quantity;
      console.log(`Updated quantity for ${product.name}: ${existingItem.quantity}`);
    } else {
      // New product or different options - add to cart
      cart.items.push({
        id: product.id,
        name: product.name,
        price: parseFloat(product.price),
        image: product.image || '',
        quantity: quantity,
        options: product.options || {},
        optionsKey: optionsKey
      });
      console.log(`Added ${product.name} to cart`);
    }

    // Recalculate total
    cart.total = calculateTotal(cart.items);
    saveCart(cart);
    
    // Show feedback to user
    showCartNotification(`${product.name} ajouté au panier`);
    
    return true;
  }

  /**
   * Remove product from cart
   * @param {string} productId - ID of product to remove
   */
  function removeFromCart(productId) {
    const cart = getCart();
    const item = cart.items.find(item => item.id === productId);

    if (!item) {
      console.warn(`Product ${productId} not found in cart`);
      return false;
    }

    cart.items = cart.items.filter(item => item.id !== productId);
    cart.total = calculateTotal(cart.items);
    
    saveCart(cart);
    console.log(`Removed product ${productId} from cart`);
    
    return true;
  }

  /**
   * Update product quantity in cart
   * @param {string} productId - ID of product
   * @param {number} quantity - New quantity (0 to remove)
   */
  function updateQuantity(productId, quantity) {
    if (quantity <= 0) {
      return removeFromCart(productId);
    }

    const cart = getCart();
    const item = cart.items.find(item => item.id === productId);

    if (!item) {
      console.warn(`Product ${productId} not found in cart`);
      return false;
    }

    item.quantity = quantity;
    cart.total = calculateTotal(cart.items);
    
    saveCart(cart);
    console.log(`Updated quantity for product ${productId}: ${quantity}`);
    
    return true;
  }

  /**
   * Get cart item count
   * @returns {number} Total number of items in cart
   */
  function getItemCount() {
    const cart = getCart();
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Get all cart items
   * @returns {Array} Array of items in cart
   */
  function getItems() {
    return getCart().items;
  }

  /**
   * Get cart total
   * @returns {number} Total price
   */
  function getTotal() {
    return getCart().total;
  }

  /**
   * Clear entire cart
   */
  function clearCart() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      updateBadge();
      console.log('Cart cleared');
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  }

  /**
   * Calculate total from items
   * @param {Array} items - Items array
   * @returns {number} Total price
   */
  function calculateTotal(items) {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  /**
   * Update cart badge display
   */
  function updateBadge() {
    const badge = document.getElementById('cartBadge');
    const cartBtn = document.getElementById('cartBtn');
    
    if (!badge || !cartBtn) return;

    const count = getItemCount();

    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.classList.remove('d-none');
      cartBtn.classList.add('has-items');
    } else {
      badge.classList.add('d-none');
      cartBtn.classList.remove('has-items');
    }
  }

  /**
   * Show temporary notification
   * @param {string} message - Message to display
   */
  function showCartNotification(message) {
    // Create toast notification
    const toastHTML = `
      <div class="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">
            <i class="fas fa-check-circle me-2"></i>${message}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fermer"></button>
        </div>
      </div>
    `;

    // Create container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toastContainer';
      toastContainer.style.cssText = 'position: fixed; top: 20px; end: 20px; z-index: 1050;';
      document.body.appendChild(toastContainer);
    }

    // Add toast to container
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);

    // Initialize and show toast
    const toastElement = toastContainer.querySelector('.toast:last-child');
    const toast = new bootstrap.Toast(toastElement);
    toast.show();

    // Remove toast element after it's hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
      toastElement.remove();
    });
  }

  /**
   * Initialize cart manager - set up event listeners
   */
  function init() {
    console.log('Initializing CartManager');
    
    // Update badge on page load
    updateBadge();

    // Set up cart button click listener
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) {
      cartBtn.addEventListener('click', () => {
        openCartDrawer();
      });
    }

    // Console for debugging
    console.log('Cart initialized:', {
      itemCount: getItemCount(),
      total: getTotal(),
      items: getItems()
    });
  }

  // Public API
  return {
    addToCart,
    removeFromCart,
    updateQuantity,
    getItemCount,
    getItems,
    getTotal,
    clearCart,
    updateBadge,
    init,
    openCartDrawer: () => openCartDrawer(),
    closeCartDrawer: () => closeCartDrawer(),
    // Loyalty functions - no longer used on client side
    // setUseFreeProduct: (use) => { ... },
    // getUseFreeProduct: () => { ... }
  };
})();

const DELIVERY_RULES = {
  minimumSubtotal: 20,
  freeDeliveryThreshold: 30,
  deliveryFee: 5,
  maxDistanceKm: 2,
};

const RESTAURANT_ADDRESS = "106 Cours de l'Argonne, 33800 Bordeaux, France";
// Plus Code trouvé par l'utilisateur (Google Maps): RCGF+VJ Bordeaux
const RESTAURANT_PLUS_CODE = 'RCGF+VJ Bordeaux';
// Fallback coordinates (approximate) to use if Nominatim fails
const RESTAURANT_COORDS = { lat: 44.8573, lon: -0.5671 };

let currentOrderType = 'pickup';
let restaurantLocationCache = null;
// Autocomplete state
let addressSuggestionsTimer = null;
let lastSelectedAddressLocation = null; // { lat, lon }
let lastSelectedAddressString = '';

/**
 * DRAWER/BOTTOM SHEET MANAGEMENT
 */

function openCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  if (!drawer) return;

  drawer.classList.add('active');
  document.body.style.overflow = 'hidden';
  
  // Rendre les items
  renderCartItems();
  
  // Binder les événements
  setupDrawerEvents();
}

function closeCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  if (!drawer) return;

  // reset any drag transform applied during swipe
  const content = drawer.querySelector('.cart-drawer-content');
  if (content) {
    content.style.transition = '';
    content.style.transform = '';
  }

  drawer.classList.remove('active');
  document.body.style.overflow = 'auto';
}

function renderCartItems() {
  const container = document.getElementById('cartItemsContainer');
  const emptyMsg = document.getElementById('cartEmptyMessage');
  const form = document.getElementById('cartCheckoutForm');
  
  if (!container) return;

  const items = CartManager.getItems();
  const total = CartManager.getTotal();

  if (items.length === 0) {
    container.innerHTML = '';
    emptyMsg.classList.remove('d-none');
    form.style.display = 'none';
    document.querySelector('.cart-drawer-total').style.display = 'none';
    return;
  }

  emptyMsg.classList.add('d-none');
  form.style.display = 'flex';
  document.querySelector('.cart-drawer-total').style.display = 'block';

  container.innerHTML = items.map(item => {
    // Format options display
    let optionsHTML = '';
    if (item.options && Object.keys(item.options).length > 0) {
      optionsHTML = '<div class="cart-item-options">';
      for (const [optionId, optionData] of Object.entries(item.options)) {
        if (optionData && optionData.values) {
          const values = optionData.values.map(v => v.value).join(', ');
          optionsHTML += `<div class="option-line"><small>${optionData.optionName}: ${values}</small></div>`;
        }
      }
      optionsHTML += '</div>';
    }
    
    return `
      <div class="cart-item" data-id="${item.id}">
        <img src="${item.image || '/assets/images/placeholder.jpg'}" 
             alt="${item.name}" 
             class="cart-item-image"
             onerror="this.src='/assets/images/placeholder.jpg'">
        
        <div class="cart-item-details">
          <h4 class="cart-item-title">${item.name}</h4>
          ${optionsHTML}
          <div class="cart-item-price">${(item.price * item.quantity).toFixed(2)} €</div>
          
          <div class="cart-item-quantity">
            <button class="qty-btn" onclick="updateItemQuantity(${item.id}, ${item.quantity - 1})">
              <i class="fas fa-minus"></i>
            </button>
            <input type="number" class="qty-input" value="${item.quantity}" readonly>
            <button class="qty-btn" onclick="updateItemQuantity(${item.id}, ${item.quantity + 1})">
              <i class="fas fa-plus"></i>
            </button>
          </div>
        </div>
        
        <button class="cart-item-remove" onclick="removeItem(${item.id})" title="Supprimer">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
  }).join('');

  updateDeliveryUI();
}

function updateItemQuantity(productId, newQty) {
  if (newQty <= 0) {
    removeItem(productId);
  } else {
    CartManager.updateQuantity(productId, newQty);
    renderCartItems();
    CartManager.updateBadge();
  }
}

function removeItem(productId) {
  CartManager.removeFromCart(productId);
  renderCartItems();
  CartManager.updateBadge();
}

function setupDrawerEvents() {
  const backdrop = document.getElementById('cartBackdrop');
  const closeBtn = document.getElementById('cartDrawerClose');
  const form = document.getElementById('cartCheckoutForm');

  if (backdrop) {
    // click/tap on backdrop should close drawer
    backdrop.addEventListener('click', closeCartDrawer);
    backdrop.addEventListener('pointerdown', (e) => {
      // pointerdown helps on some mobile browsers where click may not fire reliably
      if (e.pointerType === 'touch' || e.pointerType === 'mouse') closeCartDrawer();
    });
    backdrop.addEventListener('touchend', () => closeCartDrawer());
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeCartDrawer);
  }

  if (form) {
    form.removeEventListener('submit', handleCheckoutSubmit);
    form.addEventListener('submit', handleCheckoutSubmit);

    if (!form.dataset.deliveryBound) {
      form.addEventListener('click', (event) => {
        const button = event.target.closest('[data-order-type]');
        if (!button) return;
        event.preventDefault();
        setOrderType(button.dataset.orderType);
      });

      form.addEventListener('input', (event) => {
        if (event.target && event.target.id === 'deliveryAddress') {
          // Clear previous selection when user types
          lastSelectedAddressLocation = null;
          lastSelectedAddressString = '';
          handleAddressInput(event.target.value);
          updateDeliveryUI();
        }
      });

      form.dataset.deliveryBound = 'true';
    }
  }

  // Add swipe-to-close on mobile for the drawer content
  const drawerContent = document.querySelector('#cartDrawer .cart-drawer-content');
  if (drawerContent) {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    const THRESHOLD = 80; // pixels to trigger close

    function onStart(e) {
      // Only start a drag-to-close gesture if the content is scrolled to top
      if (drawerContent.scrollTop > 0) {
        isDragging = false;
        return;
      }
      isDragging = true;
      startY = e.touches ? e.touches[0].clientY : e.clientY;
      drawerContent.style.transition = 'none';
    }

    function onMove(e) {
      if (!isDragging) return;
      currentY = e.touches ? e.touches[0].clientY : e.clientY;
      const diff = Math.max(0, currentY - startY);
      // apply transform only when dragging downwards
      if (diff > 0) drawerContent.style.transform = `translateY(${diff}px)`;
    }

    function onEnd() {
      if (!isDragging) return;
      isDragging = false;
      const diff = currentY - startY;
      drawerContent.style.transition = 'transform 0.25s ease';
      if (diff > THRESHOLD) {
        closeCartDrawer();
      } else {
        drawerContent.style.transform = 'translateY(0)';
      }
      startY = 0; currentY = 0;
    }

    drawerContent.addEventListener('touchstart', onStart, { passive: true });
    drawerContent.addEventListener('touchmove', onMove, { passive: true });
    drawerContent.addEventListener('touchend', onEnd);
    // also support pointer events (desktop drag)
    drawerContent.addEventListener('pointerdown', onStart);
    drawerContent.addEventListener('pointermove', onMove);
    drawerContent.addEventListener('pointerup', onEnd);
    drawerContent.addEventListener('pointercancel', onEnd);
  }
}

function setOrderType(orderType) {
  currentOrderType = orderType || 'pickup';
  updateDeliveryUI();
}

function getDeliveryFee(subtotal) {
  if (currentOrderType !== 'delivery') return 0;
  if (subtotal < DELIVERY_RULES.minimumSubtotal) return null;
  return subtotal >= DELIVERY_RULES.freeDeliveryThreshold ? 0 : DELIVERY_RULES.deliveryFee;
}

function formatCurrency(value) {
  return `${Number(value || 0).toFixed(2)} €`;
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Impossible de vérifier l’adresse pour le moment');
  }

  const results = await response.json();
  if (!results || !results.length) return null;

  return {
    lat: parseFloat(results[0].lat),
    lon: parseFloat(results[0].lon),
    displayName: results[0].display_name || address,
  };
}

// --- Address autocomplete helpers ---
async function fetchAddressSuggestions(query) {
  if (!query || !query.trim()) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(query + ', Bordeaux, France')}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data || []).map(item => {
    const addr = item.address || {};
    // Build compact label: "<house_number> <road>, <postcode> <city>"
    let street = '';
    if (addr.house_number && addr.road) street = `${addr.house_number} ${addr.road}`;
    else if (addr.road) street = addr.road;
    else if (addr.pedestrian) street = addr.pedestrian;

    const city = addr.city || addr.town || addr.village || addr.county || '';
    const postcode = addr.postcode || '';

    let labelParts = [];
    if (street) labelParts.push(street);
    if (postcode || city) labelParts.push(`${postcode}${postcode && city ? ' ' : ''}${city}`);

    const label = labelParts.length ? labelParts.join(', ') : (item.display_name || '').split(',').slice(0,3).join(', ');

    return { label, display_name: item.display_name, lat: parseFloat(item.lat), lon: parseFloat(item.lon), rawAddress: addr };
  });
}

function renderAddressSuggestions(results) {
  const container = document.getElementById('addressSuggestions');
  const input = document.getElementById('deliveryAddress');
  if (!container) return;
  container.innerHTML = '';
  if (!results || !results.length) return;

  results.forEach(r => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'list-group-item list-group-item-action';
    el.textContent = r.label || r.display_name;
    el.addEventListener('click', () => {
      if (input) input.value = r.label || r.display_name;
      lastSelectedAddressLocation = { lat: r.lat, lon: r.lon };
      lastSelectedAddressString = r.label || r.display_name;
      clearAddressSuggestions();
      updateDeliveryUI();
    });
    container.appendChild(el);
  });
}

function clearAddressSuggestions() {
  const container = document.getElementById('addressSuggestions');
  if (container) container.innerHTML = '';
}

function handleAddressInput(value) {
  clearAddressSuggestions();
  if (addressSuggestionsTimer) clearTimeout(addressSuggestionsTimer);
  if (!value || !value.trim()) return;
  addressSuggestionsTimer = setTimeout(async () => {
    try {
      const results = await fetchAddressSuggestions(value);
      renderAddressSuggestions(results);
    } catch (err) {
      console.warn('Address suggestion error', err);
    }
  }, 300);
}


async function getRestaurantLocation() {
  if (restaurantLocationCache) {
    return restaurantLocationCache;
  }

  // Try several variants to increase chance of finding the place on Nominatim
  const candidates = [
    RESTAURANT_ADDRESS,
    // try without abbreviations and with country context
    RESTAURANT_ADDRESS.replace(/Cours?/i, 'Cours'),
    RESTAURANT_ADDRESS + ', France',
    RESTAURANT_PLUS_CODE,
  ];

  for (const q of candidates) {
    try {
      if (!q || !q.trim()) continue;
      const loc = await geocodeAddress(q);
      if (loc) {
        restaurantLocationCache = loc;
        return loc;
      }
    } catch (err) {
      console.warn('Geocode attempt failed for', q, err?.message || err);
    }
  }

  // As a last resort return hardcoded coords (pre-approved fallback)
  console.warn('Falling back to hardcoded restaurant coordinates');
  restaurantLocationCache = { lat: RESTAURANT_COORDS.lat, lon: RESTAURANT_COORDS.lon, displayName: RESTAURANT_ADDRESS };
  return restaurantLocationCache;
}

function updateDeliveryUI() {
  const total = CartManager.getTotal();
  const deliveryAddressGroup = document.getElementById('deliveryAddressGroup');
  const deliveryAddressInput = document.getElementById('deliveryAddress');
  const deliveryInfoBox = document.getElementById('deliveryInfoBox');
  const deliverySummaryBox = document.getElementById('deliverySummaryBox');
  const submitBtn = document.querySelector('.btn-validate-order');
  const orderTypeButtons = document.querySelectorAll('[data-order-type]');
  const cartTotalEl = document.getElementById('cartTotal');

  orderTypeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.orderType === currentOrderType);
  });

  if (!deliveryAddressGroup || !deliveryAddressInput || !deliveryInfoBox || !deliverySummaryBox || !submitBtn || !cartTotalEl) {
    return;
  }

  if (CartManager.getItems().length === 0) {
    deliveryAddressGroup.classList.add('d-none');
    deliverySummaryBox.classList.add('d-none');
    deliveryInfoBox.classList.add('d-none');
    submitBtn.disabled = false;
    cartTotalEl.textContent = formatCurrency(total);
    return;
  }

  const deliveryFee = getDeliveryFee(total);
  const finalTotal = total + (deliveryFee || 0);

  deliverySummaryBox.classList.remove('is-warning');

  if (currentOrderType === 'delivery') {
    deliveryInfoBox.classList.remove('d-none');
    deliveryAddressGroup.classList.remove('d-none');
    deliveryAddressInput.required = true;

    if (total < DELIVERY_RULES.minimumSubtotal) {
      deliverySummaryBox.classList.remove('d-none');
      deliverySummaryBox.innerHTML = `
        <strong>Livraison indisponible</strong><br>
        La livraison est possible à partir de ${formatCurrency(DELIVERY_RULES.minimumSubtotal)} de commande.
      `;
      submitBtn.disabled = true;
      cartTotalEl.textContent = formatCurrency(total);
      return;
    }

    deliverySummaryBox.classList.remove('d-none');
    deliverySummaryBox.innerHTML = deliveryFee === 0
      ? `
        <strong>Livraison offerte</strong><br>
        Votre commande atteint ${formatCurrency(DELIVERY_RULES.freeDeliveryThreshold)} ou plus.
        Total final estimé: ${formatCurrency(finalTotal)}.
      `
      : `
        <strong>Frais de livraison: ${formatCurrency(DELIVERY_RULES.deliveryFee)}</strong><br>
        Entre ${formatCurrency(DELIVERY_RULES.minimumSubtotal)} et ${formatCurrency(DELIVERY_RULES.freeDeliveryThreshold - 0.01)}, la livraison coûte ${formatCurrency(DELIVERY_RULES.deliveryFee)}.
        Total final estimé: ${formatCurrency(finalTotal)}.
      `;
    submitBtn.disabled = false;
    cartTotalEl.textContent = formatCurrency(finalTotal);
    return;
  }

  deliveryAddressGroup.classList.add('d-none');
  deliveryAddressInput.required = false;
  deliveryAddressInput.value = deliveryAddressInput.value.trim();
  deliverySummaryBox.classList.add('d-none');
  deliveryInfoBox.classList.add('d-none');
  submitBtn.disabled = false;
  cartTotalEl.textContent = formatCurrency(total);
}

function showInlineDeliveryWarning(message) {
  const deliverySummaryBox = document.getElementById('deliverySummaryBox');
  if (!deliverySummaryBox) return;

  deliverySummaryBox.classList.remove('d-none');
  deliverySummaryBox.classList.add('is-warning');
  deliverySummaryBox.innerHTML = `<strong>Adresse non livrable</strong><br>${message}`;
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();

  const phone = document.getElementById('phoneInput').value.trim();
  const deliveryAddressInput = document.getElementById('deliveryAddress');
  const deliveryAddress = deliveryAddressInput ? deliveryAddressInput.value.trim() : '';
  
  if (!phone) {
    alert('Veuillez entrer votre numéro de téléphone');
    return;
  }

  const items = CartManager.getItems();
  const subtotal = CartManager.getTotal();
  const orderType = currentOrderType;

  if (items.length === 0) {
    alert('Votre panier est vide');
    return;
  }

  let deliveryDistanceKm = null;
  let deliveryFee = getDeliveryFee(subtotal);
  if (orderType === 'delivery') {
    if (subtotal < DELIVERY_RULES.minimumSubtotal) {
      alert(`La livraison est disponible à partir de ${formatCurrency(DELIVERY_RULES.minimumSubtotal)} de commande.`);
      return;
    }

    if (!deliveryAddress) {
      alert('Veuillez entrer votre adresse de livraison');
      return;
    }

    try {
      const restaurantLocation = await getRestaurantLocation();

      // If the user selected a suggestion earlier and it matches the input, use it
      let customerLocation = null;
      if (lastSelectedAddressLocation && lastSelectedAddressString && lastSelectedAddressString === deliveryAddress) {
        customerLocation = lastSelectedAddressLocation;
      } else {
        customerLocation = await geocodeAddress(deliveryAddress);
      }


      if (!customerLocation) {
        alert('Adresse introuvable. Merci de saisir une adresse plus précise.');
        return;
      }

      deliveryDistanceKm = haversineDistanceKm(
        restaurantLocation.lat,
        restaurantLocation.lon,
        customerLocation.lat,
        customerLocation.lon
      );

      if (deliveryDistanceKm > DELIVERY_RULES.maxDistanceKm) {
        showInlineDeliveryWarning(`Nous ne pouvons pas livrer à cette adresse. La distance dépasse ${DELIVERY_RULES.maxDistanceKm} km.`);
        return;
      }
    } catch (error) {
      console.error('Delivery validation error:', error);
      alert(error.message || 'Impossible de vérifier votre adresse pour le moment');
      return;
    }
  }

  if (deliveryFee === null) {
    alert(`La livraison est disponible à partir de ${formatCurrency(DELIVERY_RULES.minimumSubtotal)} de commande.`);
    return;
  }

  const finalTotal = subtotal + deliveryFee;

  // Désactiver le bouton pendant l'envoi
  const submitBtn = document.querySelector('.btn-validate-order');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Envoi...';

  try {
    const orderItems = {
      items,
      meta: {
        order_type: orderType,
        delivery_address: orderType === 'delivery' ? deliveryAddress : '',
        delivery_distance_km: deliveryDistanceKm,
        delivery_fee: deliveryFee,
        subtotal,
        final_total: finalTotal,
        restaurant_address: RESTAURANT_ADDRESS,
      },
    };

    // Préparer les données de la commande
    const orderData = {
      phone_number: phone,
      items: orderItems,
      total: finalTotal,
      created_at: new Date().toISOString()
    };

    console.log('Sending order:', orderData);

    // Importer FUNCTIONS depuis supabaseClient
    const { FUNCTIONS, roleKey } = await import('./supabaseClient.js');

    // Envoyer la commande à l'Edge Function
    const response = await fetch(FUNCTIONS.createOrder || 'https://YOUR_SUPABASE_URL/functions/v1/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': roleKey,
        'Authorization': `Bearer ${roleKey}`
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      throw new Error(`Erreur serveur: ${response.status}`);
    }

    const result = await response.json();
    console.log('Order created:', result);

    CartManager.clearCart();
    CartManager.updateBadge();
    closeCartDrawer();
    document.getElementById('cartCheckoutForm').reset();
    currentOrderType = 'pickup';
    updateDeliveryUI();

  } catch (error) {
    console.error('Error submitting order:', error);
    alert('❌ Erreur lors de la validation: ' + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-check-circle me-2"></i>Valider la commande';
  }
}

// ===== LOYALTY FUNCTIONS - COMMENTED OUT (Only used by admin) =====
// async function fetchLoyaltyStatus(phone) {
//   ...
// }
// function displayLoyaltyStatus(loyalty) {
//   ...
// }
// function hideLoyaltyStatus() {
//   ...
// }
// function setupLoyaltyEvents() {
//   ...
// }

// Initialize cart when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    CartManager.init();
    setupDrawerEvents();
  });
} else {
  CartManager.init();
  setupDrawerEvents();
}
