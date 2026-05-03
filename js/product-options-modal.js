/**
 * Product Options Modal
 * Displays customization options for products (sauces, supplements, etc.)
 */

const ProductOptionsModal = (() => {
  let currentProduct = null;
  let currentOptions = [];
  let onConfirmCallback = null;

  /**
   * Fetch product options from DB
   */
  async function fetchProductOptions(productId) {
    try {
      const { supabase } = await import('./supabaseClient.js');
      
      const { data, error } = await supabase
        .from('product_options')
        .select('id, name, type, required, product_option_values(id, value, price_modifier)')
        .eq('product_id', productId)
        .order('id', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Failed to fetch product options:', err);
      return [];
    }
  }

  /**
   * Open modal with product options
   */
  async function open(product, onConfirm) {
    currentProduct = product;
    onConfirmCallback = onConfirm;

    console.log('🚀 Opening modal for product:', product);

    const modal = document.getElementById('productOptionsModal');
    if (!modal) {
      console.warn('Product options modal not found');
      return;
    }

    // Load options from DB
    currentOptions = await fetchProductOptions(product.id);
    currentOptions.sort((a, b) => {
      const aIsFries = a.name.toLowerCase().includes('frites');
      const bIsFries = b.name.toLowerCase().includes('frites');
      if (aIsFries && !bIsFries) return -1;
      if (!aIsFries && bIsFries) return 1;
      return (a.id || 0) - (b.id || 0);
    });
    console.log('📦 Options loaded from DB:', currentOptions);

    // Update modal title
    const title = document.getElementById('optionsModalTitle');
    if (title) title.textContent = product.title;

    // Render options
    renderOptions();

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close modal
   */
  function close() {
    const modal = document.getElementById('productOptionsModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = 'auto';
    }
    currentProduct = null;
    currentOptions = [];
  }

  /**
   * Render option groups in modal
   */
  function renderOptions() {
    const container = document.getElementById('optionsContainer');
    if (!container) return;
    container.innerHTML = '';

    currentOptions.forEach((opt) => {
      const group = document.createElement('div');
      group.className = 'option-group';
      group.innerHTML = `<h4 class="option-name">${opt.name}${opt.required ? ' <span class="required">*</span>' : ''}</h4>`;

      const itemsContainer = document.createElement('div');
      itemsContainer.className = `option-items option-type-${opt.type}`;

      if (opt.type === 'radio') {
        opt.product_option_values.forEach((val, idx) => {
          const isFriesOption = opt.name.toLowerCase().includes('frites');
          const isFeaturedChoice = isFriesOption && val.value.toLowerCase().includes('avec');
          const label = document.createElement('label');
          label.className = `option-label${isFeaturedChoice ? ' option-label--featured' : ''}`;
          label.innerHTML = `
            <input type="radio" name="opt_${opt.id}" value="${val.id}" data-value="${val.value}" data-modifier="${val.price_modifier || 0}" ${idx === 0 ? 'checked' : ''}>
            <span class="option-text">
              ${val.value}${val.price_modifier > 0 ? ` (+${val.price_modifier.toFixed(2)}€)` : ''}
              ${isFeaturedChoice ? '<span class="option-badge">Recommandé</span>' : ''}
            </span>
          `;
          itemsContainer.appendChild(label);
        });
      } else if (opt.type === 'checkbox') {
        opt.product_option_values.forEach((val) => {
          const label = document.createElement('label');
          label.className = 'option-label';
          label.innerHTML = `
            <input type="checkbox" name="opt_${opt.id}" value="${val.id}" data-value="${val.value}" data-modifier="${val.price_modifier || 0}">
            <span class="option-text">${val.value}${val.price_modifier > 0 ? ` (+${val.price_modifier.toFixed(2)}€)` : ''}</span>
          `;
          itemsContainer.appendChild(label);
        });
      }

      group.appendChild(itemsContainer);
      container.appendChild(group);
    });

    updateTotalPrice();
  }

  /**
   * Update displayed total price based on selections
   */
  function updateTotalPrice() {
    const priceEl = document.getElementById('optionsModalTotalPrice');
    if (!priceEl || !currentProduct) return;

    console.log('🔍 updateTotalPrice called');
    console.log('currentProduct:', currentProduct);
    console.log('currentProduct.price:', currentProduct.price);

    let total = parseFloat(currentProduct.price) || 0;
    console.log('Base total:', total);

    // Add modifiers for checked/selected options
    const checkedInputs = document.querySelectorAll('#optionsContainer input:checked');
    console.log('Checked inputs:', checkedInputs.length);
    
    checkedInputs.forEach((input) => {
      const modifier = parseFloat(input.dataset.modifier) || 0;
      console.log('Modifier for', input.dataset.value, ':', modifier);
      total += modifier;
    });

    console.log('Final total:', total);
    priceEl.textContent = total.toFixed(2);
  }

  /**
   * Collect selected options
   */
  function getSelectedOptions() {
    const selected = {};

    currentOptions.forEach((opt) => {
      const inputs = document.querySelectorAll(`input[name="opt_${opt.id}"]:checked`);
      if (inputs.length > 0) {
        selected[opt.id] = {
          optionName: opt.name,
          values: Array.from(inputs).map((input) => ({
            valueId: input.value,
            value: input.dataset.value,
            priceModifier: parseFloat(input.dataset.modifier) || 0
          }))
        };
      }
    });

    return selected;
  }

  /**
   * Confirm and add to cart
   */
  function confirm() {
    // Validate required options
    for (const opt of currentOptions) {
      if (opt.required) {
        const inputs = document.querySelectorAll(`input[name="opt_${opt.id}"]:checked`);
        if (inputs.length === 0) {
          alert(`Veuillez sélectionner "${opt.name}"`);
          return;
        }
      }
    }

    const selectedOptions = getSelectedOptions();
    const totalPrice = parseFloat(document.getElementById('optionsModalTotalPrice').textContent);

    if (onConfirmCallback) {
      onConfirmCallback(selectedOptions, totalPrice);
    }

    close();
  }

  /**
   * Initialize event listeners
   */
  function init() {
    const modal = document.getElementById('productOptionsModal');
    if (!modal) return;

    // Close button
    const closeBtn = document.getElementById('optionsModalClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', close);
    }

    // Backdrop click
    const backdrop = document.getElementById('optionsModalBackdrop');
    if (backdrop) {
      backdrop.addEventListener('click', close);
    }

    // Confirm button
    const confirmBtn = document.getElementById('optionsModalConfirm');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', confirm);
    }

    // Option input changes (update price)
    modal.addEventListener('input', (e) => {
      if (e.target.matches('input[type="radio"], input[type="checkbox"]')) {
        updateTotalPrice();
      }
    });
  }

  return {
    open,
    close,
    init,
    getSelectedOptions
  };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ProductOptionsModal.init());
} else {
  ProductOptionsModal.init();
}

// Export globally for async imports
window.ProductOptionsModal = ProductOptionsModal;
