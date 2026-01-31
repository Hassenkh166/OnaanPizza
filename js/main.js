// Smooth scroll for anchor links and navbar behavior
document.addEventListener('DOMContentLoaded', function() {
    initSite();

  // Pre-insert spinners so a loader is visible immediately while config loads
  function ensureInitialLogoSpinners() {
    const all = document.querySelectorAll('.restaurant-logo, .hero-logo');
    all.forEach(el => {
      if (!el) return;
      // avoid duplicating
      const existing = el.parentNode && el.parentNode.querySelector('.logo-spinner');
      if (existing) return;
      // create spinner and insert after element
      const spinner = document.createElement('span');
      spinner.className = 'logo-spinner';
      el.classList.add('hidden');
      el.parentNode && el.parentNode.insertBefore(spinner, el.nextSibling);
    });
  }
  ensureInitialLogoSpinners();

  /* Newsletter modal: inject enhanced Centre Glass modal with accessibility */
  let _newsletterPreviouslyFocused = null;
  let _newsletterKeyHandler = null;

  function createNewsletterModal() {
    if (document.getElementById('newsletterModal')) return;
    const modal = document.createElement('div');
    modal.id = 'newsletterModal';
    modal.innerHTML = `
      <div class="ns-overlay" data-dismiss="overlay"></div>
      <div class="ns-card" role="dialog" aria-modal="true" aria-labelledby="ns-title" tabindex="-1">
        <button class="ns-close" aria-label="Fermer">×</button>
        <h3 id="ns-title">Recevez nos promotions</h3>
        <p>Inscrivez votre email pour recevoir nos offres et promotions intéressantes.</p>
        <form id="newsletterForm">
          <input id="newsletterEmail" type="email" placeholder="votre@email.com" required aria-label="Email" />
          <div class="ns-actions">
            <button type="submit" class="ns-cta">S'inscrire</button>
            <button type="button" id="newsletterNo" class="ns-secondary">Non merci</button>
          </div>
          <div id="newsletterMsg" aria-live="polite"></div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    // close handlers
    modal.querySelector('.ns-close').addEventListener('click', () => { hideNewsletterModal(true); });
    modal.querySelector('#newsletterNo').addEventListener('click', () => { hideNewsletterModal(true); });
    modal.querySelector('.ns-overlay').addEventListener('click', (ev) => { if (ev.target === ev.currentTarget) hideNewsletterModal(true); });

    const form = modal.querySelector('#newsletterForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('newsletterEmail').value.trim();
      const msgEl = document.getElementById('newsletterMsg');
      msgEl.textContent = '';
      if (!email) { msgEl.textContent = 'Veuillez saisir un email valide.'; return; }
      try {
        const btn = form.querySelector('button[type=submit]');
        btn.disabled = true; btn.textContent = 'Enregistrement...';
        const resp = await fetch(FUNCTIONS.newsletter, { method: 'POST', headers: {'Content-Type':'application/json', 'apikey': roleKey}, body: JSON.stringify({ email }) });
        let jr = {};
        try { jr = await resp.json(); } catch(e){}
        if (resp.ok) {
          msgEl.textContent = "Merci — vous êtes inscrit(e).";
          localStorage.setItem('newsletterSubscribed', '1');
          setTimeout(() => hideNewsletterModal(true), 900);
        } else {
          msgEl.textContent = jr && jr.error ? jr.error : 'Erreur lors de l\'inscription';
        }
      } catch (err) {
        document.getElementById('newsletterMsg').textContent = 'Échec réseau';
      } finally {
        const btn = form.querySelector('button[type=submit]'); if (btn) { btn.disabled = false; btn.textContent = "S'inscrire"; }
      }
    });
  }

  function _newsletterKeydownHandler(e) {
    const modal = document.getElementById('newsletterModal');
    if (!modal) return;
    const card = modal.querySelector('.ns-card');
    if (!card) return;
    if (e.key === 'Escape') {
      e.preventDefault(); hideNewsletterModal(true);
      return;
    }
    if (e.key === 'Tab') {
      // simple focus trap
      const focusable = card.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])');
      if (!focusable || !focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  }

  function showNewsletterModal() {
    if (localStorage.getItem('newsletterSubscribed') === '1' || localStorage.getItem('newsletterDismissed') === '1') return;
    createNewsletterModal();
    const modal = document.getElementById('newsletterModal');
    if (!modal) return;
    _newsletterPreviouslyFocused = document.activeElement;
    modal.classList.add('visible');
    const card = modal.querySelector('.ns-card');
    // set focus inside modal
    setTimeout(() => {
      const input = modal.querySelector('#newsletterEmail');
      if (input) input.focus(); else if (card) card.focus();
    }, 60);
    // attach key handler
    _newsletterKeyHandler = _newsletterKeydownHandler.bind(this);
    document.addEventListener('keydown', _newsletterKeyHandler, true);
  }

  function hideNewsletterModal(dismiss) {
    const modal = document.getElementById('newsletterModal');
    if (!modal) return;
    modal.classList.remove('visible');
    if (dismiss) localStorage.setItem('newsletterDismissed', '1');
    // remove key handler
    if (_newsletterKeyHandler) { document.removeEventListener('keydown', _newsletterKeyHandler, true); _newsletterKeyHandler = null; }
    // restore focus
    if (_newsletterPreviouslyFocused && typeof _newsletterPreviouslyFocused.focus === 'function') {
      try { _newsletterPreviouslyFocused.focus(); } catch(e){}
    }
    _newsletterPreviouslyFocused = null;
  }

  // show modal after a few seconds
  setTimeout(showNewsletterModal, 5500);
  // Smooth scroll for links with .scroll-link
  document.querySelectorAll('a.scroll-link, a#ctaMenu').forEach(function(link) {
    link.addEventListener('click', function(e) {
      var href = this.getAttribute('href');
      // skip plain '#' which breaks querySelector
      if (href && href.startsWith('#') && href.length > 1) {
        e.preventDefault();
        var target = document.querySelector(href);
        if (target) {
          window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 60, behavior: 'smooth' });
        }
        // if mobile nav open, close it
        var bsCollapse = document.querySelector('#mainNav');
        if (bsCollapse && bsCollapse.classList.contains('show')) {
          var collapseInstance = bootstrap.Collapse.getInstance(bsCollapse) || new bootstrap.Collapse(bsCollapse);
          collapseInstance.hide();
        }
      } else if (href === '#') {
        e.preventDefault();
      }
    });
  });

  // Navbar background on scroll
  var navbar = document.getElementById('mainNavbar');
  let scrollTimer = null;
  function onScroll() {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
      // Clear previous timer
      if (scrollTimer) clearTimeout(scrollTimer);
      // Hide background after 1 second of no scrolling
      scrollTimer = setTimeout(() => {
        navbar.classList.remove('scrolled');
      }, 100);
    } else {
      navbar.classList.remove('scrolled');
    }
  }
  onScroll();
  document.addEventListener('scroll', onScroll);

    const slides = document.querySelectorAll(".hero-slideshow .slide");
  let currentSlide = 0;
  // helper to start slideshow
  function startSlideshow(config) {
    const container = document.querySelector('.hero-slideshow');
    const data = config.hero_images || [];

    if (Array.isArray(data) && data.length) {
      container.innerHTML = data
        .map(url => {
          const isVideo = /\.(mp4|webm)$/i.test(url);
          if (isVideo) {
            return `<video class="slide" autoplay muted loop playsinline style="object-fit: cover;" poster="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMTExIi8+PC9zdmc+"><source src="${url}" type="video/mp4"></video>`;
          } else {
            return `<div class="slide" style="background-image:url('${url}')"></div>`;
          }
        })
        .join('');
    } else {
      container.innerHTML = `<div class="slide active" style="background:#111"></div>`;
    }

    const slides = container.querySelectorAll('.slide');
    if (!slides.length) return;

    slides[0].classList.add('active');
    let current = 0;

    setInterval(() => {
      slides[current].classList.remove('active');
      current = (current + 1) % slides.length;
      slides[current].classList.add('active');
    }, 5000);
  }

  // Load and apply general configuration
  function applyGeneralConfig(config){
    try{
      // Apply restaurant name
      const nameElements = document.querySelectorAll('.restaurant-name');
      nameElements.forEach(el => el.textContent = config.restaurant_name || 'O\'naan Pizza');
      
      // Apply logo (only use config.logo; show simple circular spinner while loading)
      const logoElements = document.querySelectorAll('.restaurant-logo');
      logoElements.forEach(el => {
        // remove any existing spinner
        const existingSpinner = el.parentNode && el.parentNode.querySelector('.logo-spinner');
        if (existingSpinner) existingSpinner.remove();
        if (!config.logo) {
          if (el.tagName === 'IMG') el.removeAttribute('src');
          else el.style.backgroundImage = '';
          el.classList.remove('hidden');
          return;
        }
        if (el.tagName === 'IMG') {
          // hide image and show spinner
          el.classList.add('hidden');
          const spinner = document.createElement('span');
          spinner.className = 'logo-spinner';
          el.parentNode && el.parentNode.insertBefore(spinner, el.nextSibling);
          el.onload = () => { el.classList.remove('hidden'); spinner.remove(); };
          el.onerror = () => { el.classList.remove('hidden'); spinner.remove(); };
          el.src = config.logo;
        } else {
          // background image case: preload
          const spinner = document.createElement('span');
          spinner.className = 'logo-spinner';
          el.parentNode && el.parentNode.insertBefore(spinner, el.nextSibling);
          const tmp = new Image();
          tmp.onload = () => { el.style.backgroundImage = `url('${config.logo}')`; spinner.remove(); };
          tmp.onerror = () => { spinner.remove(); };
          tmp.src = config.logo;
        }
      });

      // Also ensure the hero logo (large logo in hero section) uses the same config.logo with spinner
      const heroLogoElements = document.querySelectorAll('.hero-logo');
      heroLogoElements.forEach(el => {
        const existingSpinner = el.parentNode && el.parentNode.querySelector('.logo-spinner');
        if (existingSpinner) existingSpinner.remove();
        if (!config.logo) {
          if (el.tagName === 'IMG') el.removeAttribute('src');
          else el.style.backgroundImage = '';
          el.classList.remove('hidden');
          return;
        }
        if (el.tagName === 'IMG') {
          el.classList.add('hidden');
          const spinner = document.createElement('span');
          spinner.className = 'logo-spinner';
          el.parentNode && el.parentNode.insertBefore(spinner, el.nextSibling);
          el.onload = () => { el.classList.remove('hidden'); spinner.remove(); };
          el.onerror = () => { el.classList.remove('hidden'); spinner.remove(); };
          el.src = config.logo;
        } else {
          const spinner = document.createElement('span');
          spinner.className = 'logo-spinner';
          el.parentNode && el.parentNode.insertBefore(spinner, el.nextSibling);
          const tmp = new Image();
          tmp.onload = () => { el.style.backgroundImage = `url('${config.logo}')`; spinner.remove(); };
          tmp.onerror = () => { spinner.remove(); };
          tmp.src = config.logo;
        }
      });
      
      // Apply contact info
      const addressEl = document.querySelector('.contact-address');
      if (addressEl) addressEl.textContent = config.contact_address || '';
      
      const phoneEl = document.querySelector('.contact-phone');
      if (phoneEl) phoneEl.textContent = config.contact_phone || '';
      
      const emailEl = document.querySelector('.contact-email');
      if (emailEl) {
        emailEl.textContent = config.contact_email || '';
        emailEl.href = `mailto:${config.contact_email || ''}`;
      }
      
      const hoursEl = document.querySelector('.contact-hours');
      if (hoursEl) hoursEl.textContent = config.contact_hours || '';
      
    }catch(e){ 
      console.warn('Could not load general config', e); 
    }
  }

  let cachedConfig = null;

  async function initSite() {
     const { FUNCTIONS, supabaseKey } = await import('./supabaseClient.js');
    try {
      const res = await fetch(FUNCTIONS.getConfig, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey
        }
      });
      if (!res.ok) throw new Error('Config fetch failed');
      cachedConfig = await res.json();
      console.log("---------------");
      console.log(cachedConfig);
      applyGeneralConfig(cachedConfig);
      // Correction: parser hero_images si c'est une chaîne JSON
      let heroImages = cachedConfig.hero_images;
      if (typeof heroImages === 'string') {
        try { heroImages = JSON.parse(heroImages); } catch(e) { heroImages = []; }
      }
      startSlideshow({ ...cachedConfig, hero_images: heroImages });
    } catch (e) {
      console.warn('Init failed', e);
    }
  }


  // Radial menu toggle + dynamic positioning
  const menuToggle = document.getElementById('menuToggle');
  const overlay = document.getElementById('overlay');
  const menuItems = document.querySelectorAll('.radial-menu-wrapper .menu-item');

  if (menuToggle && overlay && menuItems.length) {
    // radius controls how far menu items sit from the central button
    const radius = 180;
    const startAngle = 180; // start downward then sweep toward left (bottom-left quadrant)
    const arcAngle = 90;    // quarter-circle spread
    const angleIncrement = menuItems.length > 1 ? arcAngle / (menuItems.length - 1) : 0;

    const setItems = (isActive) => {
      menuItems.forEach((item, index) => {
        if (isActive) {
          const angle = startAngle + (index * angleIncrement);
          item.style.opacity = '1';
          item.style.pointerEvents = 'auto';
          item.style.transform = `rotate(${angle}deg) translateY(-${radius}px) rotate(${-angle}deg)`;
        } else {
          item.style.opacity = '0';
          item.style.pointerEvents = 'none';
          item.style.transform = 'scale(0.5)';
        }
      });
    };

    const toggleMenu = () => {
      const isActive = menuToggle.classList.toggle('active');
      overlay.classList.toggle('active', isActive);
      const icon = menuToggle.querySelector('i');
      if (icon) icon.className = isActive ? 'fas fa-times' : 'fas fa-bars';
      setItems(isActive);
    };

    setItems(false);
    menuToggle.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', toggleMenu);

    menuItems.forEach(link => {
      link.addEventListener('click', () => {
        if (menuToggle.classList.contains('active')) toggleMenu();
      });
    });
  }
});
