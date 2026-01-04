// Admin Responsive Menu Handler
document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.getElementById('adminHamburger');
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('adminOverlay');

  if (!hamburger || !sidebar || !overlay) return;

  // Toggle menu
  function toggleMenu() {
    hamburger.classList.toggle('active');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    
    // Prevent body scroll when menu is open
    if (sidebar.classList.contains('active')) {
      document.body.style.overflow = 'hidden';
      overlay.style.display = 'block';
    } else {
      document.body.style.overflow = '';
      overlay.style.display = 'none';
    }
  }

  // Close menu
  function closeMenu() {
    hamburger.classList.remove('active');
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    overlay.style.display = 'none';
  }

  // Event listeners
  hamburger.addEventListener('click', toggleMenu);
  overlay.addEventListener('click', closeMenu);

  // Close menu when clicking a nav link
  const navLinks = sidebar.querySelectorAll('.admin-nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      // Small delay to allow navigation
      setTimeout(closeMenu, 150);
    });
  });

  // Close menu on window resize if becomes desktop
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth > 992) {
        closeMenu();
      }
    }, 250);
  });

  // Handle ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('active')) {
      closeMenu();
    }
  });
});
