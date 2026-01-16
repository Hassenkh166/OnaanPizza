// Admin page for newsletter subscribers
document.addEventListener('DOMContentLoaded', () => {
  // Vérifier l'authentification avant de charger l'interface admin
  checkAuthentication();

  // Gestionnaire pour le lien de déconnexion
  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.addEventListener('click', function(e) {
      e.preventDefault();
      logout();
    });
  }

  const tableBody = document.querySelector('#subscribersTable tbody');
  const exportBtn = document.getElementById('exportCsv');
  const searchInput = document.getElementById('searchEmail');

  let subscribers = [];

  async function loadSubscribers() {
    try {
      const resp = await fetch('/api/newsletter');
      if (!resp.ok) throw new Error('Failed to fetch');
      const jr = await resp.json();
      // server returns { data: [...] } or array — normalize
      const data = Array.isArray(jr) ? jr : (jr.data || jr || []);
      subscribers = data;
      renderTable(subscribers);
    } catch (e) {
      console.error('Could not load subscribers', e);
      tableBody.innerHTML = '<tr><td colspan="3">Erreur de chargement</td></tr>';
    }
  }

  function renderTable(list) {
    tableBody.innerHTML = '';
    if (!list || !list.length) {
      tableBody.innerHTML = '<tr><td colspan="3">Aucun abonné</td></tr>';
      return;
    }
    // Liste verticale de cards empilées
    const cardRow = document.createElement('tr');
    const cardCell = document.createElement('td');
    cardCell.colSpan = 3;
    cardCell.innerHTML = `
      <div class="newsletter-list-stack">
        ${list.map(r => {
          const d = new Date(r.date || r.created_at || r.createdAt || null);
          const dateText = isNaN(d.getTime()) ? (r.date || r.created_at || '') : d.toLocaleString();
          return `
            <div class="card newsletter-card mb-3 p-4 d-flex flex-column flex-md-row align-items-md-center justify-content-between">
              <div class="d-flex align-items-center mb-2 mb-md-0">
                <input class="form-check-input ns-checkbox me-3" type="checkbox" data-id="${r.id}" data-email="${escapeHtml(r.email||'')}">
                <span class="fw-bold text-break" style="word-break:break-all;">${escapeHtml(r.email || '')}</span>
              </div>
              <div class="d-flex flex-column flex-md-row align-items-md-center gap-2">
                <span class="text-muted small">${dateText}</span>
                <button class="btn btn-lg btn-danger px-4 py-2" data-id="${r.id}" data-action="delete">Supprimer</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    cardRow.appendChild(cardCell);
    tableBody.appendChild(cardRow);
    // ensure select-all header checkbox wired (if present)
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
      selectAll.checked = false;
      selectAll.addEventListener('change', (e) => {
        document.querySelectorAll('.ns-checkbox').forEach(cb => cb.checked = !!e.target.checked);
      });
    }
  }

  function escapeHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  exportBtn.addEventListener('click', () => {
    const rows = (subscribers || []).map(s => [s.email || '', s.date || s.created_at || ''].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','));
    const csv = 'email,date\n' + rows.join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'subscribers.csv';
    document.body.appendChild(a); a.click(); a.remove();
  });

  // Send via Gmail: gather recipients and open Gmail compose in new tab
  const sendBtn = document.getElementById('sendGmail');
  const sendScope = document.getElementById('sendScope');
  sendBtn.addEventListener('click', () => {
    const scope = sendScope ? sendScope.value : 'selected';
    let recipients = [];
    if (scope === 'all') {
      recipients = (subscribers || []).map(s => (s.email||'').trim()).filter(Boolean);
    } else {
      document.querySelectorAll('.ns-checkbox:checked').forEach(cb => { const e = cb.dataset.email; if (e) recipients.push(e.trim()); });
    }
    if (!recipients.length) { alert('Aucun destinataire sélectionné'); return; }
    // build Gmail compose URL with recipients in BCC only — subject/body to be entered in Gmail
    const maxRecipients = 200; // safety cap to avoid huge URLs
    const recipChunk = recipients.slice(0, maxRecipients).join(',');
    const base = 'https://mail.google.com/mail/?view=cm&fs=1';
    const params = ['bcc=' + encodeURIComponent(recipChunk)];
    const url = base + '&' + params.join('&');
    window.open(url, '_blank');
  });

  tableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action="delete"]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (!confirm('Supprimer cet abonné ?')) return;
    try {
      const r = await fetch('/api/newsletter/' + encodeURIComponent(id), { method: 'DELETE' });
      if (!r.ok) throw new Error('delete failed');
      await loadSubscribers();
    } catch (err) {
      alert('Erreur: impossible de supprimer');
    }
  });

  searchInput.addEventListener('input', (e) => {
    const q = (e.target.value || '').toLowerCase().trim();
    if (!q) return renderTable(subscribers);
    renderTable(subscribers.filter(s => (s.email || '').toLowerCase().includes(q)));
  });

  // Fonctions d'authentification
  async function checkAuthentication() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      redirectToLogin();
      return;
    }

    try {
      const response = await fetch('/api/verify-token', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        localStorage.removeItem('admin_token');
        redirectToLogin();
        return;
      }

      // Token valide, continuer le chargement normal
      initializeNewsletter();
    } catch (error) {
      console.error('Erreur vérification authentification:', error);
      localStorage.removeItem('admin_token');
      redirectToLogin();
    }
  }

  function redirectToLogin() {
    window.location.href = 'login.html';
  }

  function logout() {
    localStorage.removeItem('admin_token');
    window.location.href = 'login.html';
  }

  function initializeNewsletter() {
    // Code d'initialisation existant
    loadSubscribers();
  }

  // initial load - maintenant via checkAuthentication
  checkAuthentication();
});
