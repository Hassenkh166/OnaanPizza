/**
 * Product Options Modal
 * Displays customization options for products (sauces, supplements, etc.)
 */

const ProductOptionsModal = (() => {
  let currentProduct = null;
  let currentOptions = [];
  let onConfirmCallback = null;

  /**
   * Fonction pour formater et vérifier le prix (ajoute € si absent)
   */
  function formatPrice(price) {
    if (!price) return 'Prix non défini';
    const priceStr = String(price).trim();
    // Si le prix ne finit pas par €, on l'ajoute
    if (!priceStr.endsWith('€')) {
      return `${priceStr} €`;
    }
    return priceStr;
  }

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

    // For tacos, remove supplementary meat options
    const isTaco = /tacos?/i.test(product.title);
    if (isTaco) {
      currentOptions = currentOptions.filter(opt => {
        const optName = opt.name.toLowerCase();
        // Exclude options like "viande supplémentaire", "viande extra", "supplément viande"
        return !(optName.includes('supplémentaire') || optName.includes('extra') || optName.includes('supplément'));
      });
    }

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
   * Extract number of meats from product name (e.g., "Tacos 1 viande" => 1)
   */
  function extractMeatCount(productTitle) {
    const match = productTitle.match(/(\d+)\s*viande/i);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Render option groups in modal
   */
  function renderOptions() {
    const container = document.getElementById('optionsContainer');
    if (!container) return;
    container.innerHTML = '';

    // Extract meat count if this is a taco product
    const meatCount = extractMeatCount(currentProduct.title);
    let forcedMeatType = null;
    if (meatCount && meatCount > 1) {
      forcedMeatType = 'checkbox';
    }

    currentOptions.forEach((opt) => {
      const group = document.createElement('div');
      group.className = 'option-group';
      
      // Determine option type: force checkbox if meat count > 1 and this is a meat option
      let optionType = opt.type;
      const isMeatOption = opt.name.toLowerCase().includes('viande') || opt.name.toLowerCase().includes('meat');
      if (meatCount && isMeatOption && meatCount > 1) {
        optionType = 'checkbox';
      }

      // Simplify meat option name for tacos
      let displayName = opt.name;
      const isTaco = /tacos?/i.test(currentProduct.title);
      if (isTaco && isMeatOption) {
        displayName = 'Viandes';
      }
      
      // Add title
      group.innerHTML = `<h4 class="option-name">${displayName}${opt.required ? ' <span class="required">*</span>' : ''}</h4>`;
      
      // Add limit info if applicable - DIRECTLY AFTER TITLE
      if (meatCount && isMeatOption && optionType === 'checkbox') {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'option-info';
        infoDiv.textContent = `Sélectionnez ${meatCount} viande${meatCount > 1 ? 's' : ''}`;
        group.appendChild(infoDiv);
      }

      const itemsContainer = document.createElement('div');
      itemsContainer.className = `option-items option-type-${optionType}`;

      if (optionType === 'radio') {
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
      } else if (optionType === 'checkbox') {
        opt.product_option_values.forEach((val) => {
          const label = document.createElement('label');
          label.className = 'option-label';
          
          label.innerHTML = `
            <input type="checkbox" name="opt_${opt.id}" value="${val.id}" data-value="${val.value}" data-modifier="${val.price_modifier || 0}" 
                   data-meat-count="${meatCount || 0}" data-is-meat="${isMeatOption ? 'true' : 'false'}">
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
    priceEl.textContent = `${total.toFixed(2)} €`;
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
    // Extract meat count for validation
    const meatCount = extractMeatCount(currentProduct.title);

    // Validate required options
    for (const opt of currentOptions) {
      if (opt.required) {
        const inputs = document.querySelectorAll(`input[name="opt_${opt.id}"]:checked`);
        
        // Special validation for meat options in tacos
        const isMeatOption = opt.name.toLowerCase().includes('viande') || opt.name.toLowerCase().includes('meat');
        if (meatCount && isMeatOption && meatCount > 1) {
          if (inputs.length !== meatCount) {
            alert(`Veuillez sélectionner exactement ${meatCount} viande${meatCount > 1 ? 's' : ''}`);
            return;
          }
        } else if (inputs.length === 0) {
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
   * Validate checkbox selection limits
   */
  function validateCheckboxLimits(e) {
    const input = e.target;
    if (input.type !== 'checkbox') return;

    const isMeat = input.dataset.isMeat === 'true';
    const meatCount = parseInt(input.dataset.meatCount) || 0;

    // Only validate meat options with a meat count limit
    if (!isMeat || meatCount <= 1) return;

    // Get all checkboxes in the same group
    const groupName = input.name;
    const checkboxes = document.querySelectorAll(`input[name="${groupName}"]:checked`);

    // If selection exceeds limit, uncheck this one silently
    if (checkboxes.length > meatCount) {
      input.checked = false;
      updateTotalPrice();
      return;
    }

    updateTotalPrice();
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

    // Option input changes (update price) + validate limits
    modal.addEventListener('change', (e) => {
      if (e.target.matches('input[type="radio"]')) {
        updateTotalPrice();
      } else if (e.target.matches('input[type="checkbox"]')) {
        validateCheckboxLimits(e);
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
