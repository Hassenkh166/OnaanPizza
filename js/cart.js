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
   * @param {Object} product - Product with id, name, price, image
   * @param {number} quantity - Quantity to add (default 1)
   */
  function addToCart(product, quantity = 1) {
    if (!product || !product.id) {
      console.error('Invalid product:', product);
      return false;
    }

    const cart = getCart();
    const existingItem = cart.items.find(item => item.id === product.id);

    if (existingItem) {
      // Product already in cart - increase quantity
      existingItem.quantity += quantity;
      console.log(`Updated quantity for ${product.name}: ${existingItem.quantity}`);
    } else {
      // New product - add to cart
      cart.items.push({
        id: product.id,
        name: product.name,
        price: parseFloat(product.price),
        image: product.image || '',
        quantity: quantity
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
    closeCartDrawer: () => closeCartDrawer()
  };
})();

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

  container.innerHTML = items.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <img src="${item.image || '/assets/images/placeholder.jpg'}" 
           alt="${item.name}" 
           class="cart-item-image"
           onerror="this.src='/assets/images/placeholder.jpg'">
      
      <div class="cart-item-details">
        <h4 class="cart-item-title">${item.name}</h4>
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
  `).join('');

  // Update total
  document.getElementById('cartTotal').textContent = total.toFixed(2) + ' €';
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
    backdrop.addEventListener('click', closeCartDrawer);
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeCartDrawer);
  }

  if (form) {
    form.removeEventListener('submit', handleCheckoutSubmit);
    form.addEventListener('submit', handleCheckoutSubmit);
  }
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();

  const phone = document.getElementById('phoneInput').value.trim();
  
  if (!phone) {
    alert('Veuillez entrer votre numéro de téléphone');
    return;
  }

  const items = CartManager.getItems();
  const total = CartManager.getTotal();

  if (items.length === 0) {
    alert('Votre panier est vide');
    return;
  }

  // Désactiver le bouton pendant l'envoi
  const submitBtn = document.querySelector('.btn-validate-order');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Envoi...';

  try {
    // Préparer les données de la commande
    const orderData = {
      phone_number: phone,
      items: items,
      total: total,
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

    // Succès
    alert('✅ Commande validée ! Nous vous appellerons bientôt au ' + phone);
    CartManager.clearCart();
    CartManager.updateBadge();
    closeCartDrawer();
    document.getElementById('cartCheckoutForm').reset();

  } catch (error) {
    console.error('Error submitting order:', error);
    alert('❌ Erreur lors de la validation: ' + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-check-circle me-2"></i>Valider la commande';
  }
}

// Initialize cart when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    CartManager.init();
  });
} else {
  CartManager.init();
}
