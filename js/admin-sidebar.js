// Inject a canonical admin sidebar and mark active link based on current path
(function(){
  function buildSidebarHtml(activeFile) {
    return `
      <div class="admin-logo">
        <h3>O'naan Pizza</h3>
        <p>Administration</p>
      </div>
      <ul class="admin-nav">
        <li class="admin-nav-item"><a href="admin.html" class="admin-nav-link ${activeFile==='admin.html'?'active':''}"><i class="fas fa-pizza-slice"></i><span>Produits</span></a></li>
        <li class="admin-nav-item"><a href="daily-specials.html" class="admin-nav-link ${activeFile==='daily-specials.html'?'active':''}"><i class="fas fa-star"></i><span>Promotions</span></a></li>
        <li class="admin-nav-item"><a href="site-config.html" class="admin-nav-link ${activeFile==='site-config.html'?'active':''}"><i class="fas fa-cog"></i><span>Configuration</span></a></li>
        <li class="admin-nav-item"><a href="admin-newsletter.html" class="admin-nav-link ${activeFile==='admin-newsletter.html'?'active':''}"><i class="fas fa-envelope"></i><span>Newsletter</span></a></li>
        <li class="admin-nav-item admin-nav-sep"><a href="index.html" target="_blank" class="admin-nav-link"><i class="fas fa-external-link-alt"></i><span>Voir le site</span></a></li>
      </ul>
    `;
  }

  function init() {
    const aside = document.querySelector('aside.admin-sidebar');
    if (!aside) return;
    // derive active file from pathname
    const path = (location.pathname || '').split('/').pop() || 'admin.html';
    aside.innerHTML = buildSidebarHtml(path);
    // ensure id present for existing scripts that reference it
    aside.id = aside.id || 'adminSidebar';
    // mobile hamburger and overlay references exist in admin pages; do not duplicate them.
    // If admin-hamburger exists on the page, wire up toggle behavior if not already wired.
    const burger = document.getElementById('adminHamburger');
    const overlay = document.getElementById('adminOverlay');
    if (burger && overlay) {
      burger.addEventListener('click', () => {
        burger.classList.toggle('active');
        aside.classList.toggle('active');
        overlay.classList.toggle('active');
      });
      overlay.addEventListener('click', () => {
        burger.classList.remove('active');
        aside.classList.remove('active');
        overlay.classList.remove('active');
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
