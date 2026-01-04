// Smooth scroll for anchor links and navbar behavior
document.addEventListener('DOMContentLoaded', function() {
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
  async function startSlideshow(){
    const container = document.querySelector('.hero-slideshow');
    let slides = document.querySelectorAll('.hero-slideshow .slide');
    try{
      const res = await fetch('/api/config');
      if (res.ok){
        const config = await res.json();
        const data = config.hero_images || [];
        if (Array.isArray(data) && data.length){
          container.innerHTML = data.map(d => `<div class="slide" style="background-image:url('${d.path || d}')"></div>`).join('');
        } else {
          // fallback to default images if no config
          container.innerHTML = `
            <div class="slide active" style="background-image: url('./assets/images/prod_melaoui.png');"></div>
            <div class="slide" style="background-image: url('./assets/images/pate.jpg');"></div>
            <div class="slide" style="background-image: url('./assets/images/prod_fricasse.png');"></div>
          `;
        }
      } else {
        // fallback if API fails
        container.innerHTML = `
          <div class="slide active" style="background-image: url('./assets/images/prod_melaoui.png');"></div>
          <div class="slide" style="background-image: url('./assets/images/pate.jpg');"></div>
          <div class="slide" style="background-image: url('./assets/images/prod_fricasse.png');"></div>
        `;
      }
    }catch(e){ 
      console.warn('Could not fetch hero config', e); 
      // fallback
      container.innerHTML = `
        <div class="slide active" style="background-image: url('./assets/images/prod_melaoui.png');"></div>
        <div class="slide" style="background-image: url('./assets/images/pate.jpg');"></div>
        <div class="slide" style="background-image: url('./assets/images/prod_fricasse.png');"></div>
      `;
    }

    slides = document.querySelectorAll('.hero-slideshow .slide');
    if (!slides.length) return;
    slides[0].classList.add('active');
    currentSlide = 0;
    setInterval(() => {
      slides[currentSlide].classList.remove('active');
      currentSlide = (currentSlide + 1) % slides.length;
      slides[currentSlide].classList.add('active');
    }, 5000);
  }

  // Load and apply general configuration
  async function loadGeneralConfig(){
    try{
      const res = await fetch('/api/config');
      if (res.ok){
        const config = await res.json();
        
        // Apply restaurant name
        const nameElements = document.querySelectorAll('.restaurant-name');
        nameElements.forEach(el => el.textContent = config.restaurant_name || 'O\'naan Pizza');
        
        // Apply logo
        const logoElements = document.querySelectorAll('.restaurant-logo');
        logoElements.forEach(el => {
          if (el.tagName === 'IMG') {
            el.src = config.logo || '/assets/images/logo.png';
          } else {
            el.style.backgroundImage = `url('${config.logo || '/assets/images/logo.png'}')`;
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
        
      }
    }catch(e){ 
      console.warn('Could not load general config', e); 
    }
  }

  // Load configuration first, then start slideshow
  loadGeneralConfig().then(() => startSlideshow());

  // Radial menu toggle + dynamic positioning
  const menuToggle = document.getElementById('menuToggle');
  const overlay = document.getElementById('overlay');
  const menuItems = document.querySelectorAll('.radial-menu-wrapper .menu-item');

  if (menuToggle && overlay && menuItems.length) {
    const radius = 120;
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
