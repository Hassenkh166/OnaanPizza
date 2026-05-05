// Admin page for newsletter subscribers
import { supabase,supabaseKey ,roleKey,FUNCTIONS} from './supabaseClient.js';
import { requireAuth } from './checkAuthentication.js';

document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth();

  // Logout handler
  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.addEventListener('click', async function(e) {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.href = 'login.html';
    });
  }

  // DOM Elements
  const tableBody = document.querySelector('#subscribersTable tbody');
  const exportBtn = document.getElementById('exportCsv');
  const searchInput = document.getElementById('searchEmail');
  const sendBtn = document.getElementById('sendGmail');
  const sendScope = document.getElementById('sendScope');
  const selectAllCheckbox = document.getElementById('selectAll');

  // Stats Elements
  const statTotalSubscribers = document.getElementById('statTotalSubscribers');
  const statLastSubscribed = document.getElementById('statLastSubscribed');
  const statSelected = document.getElementById('statSelected');
  const displayCount = document.getElementById('displayCount');
  const totalCount = document.getElementById('totalCount');
  const recipientCount = document.getElementById('recipientCount');

  let subscribers = [];
  let filteredSubscribers = [];

  // Load subscribers
  async function loadSubscribers() {
    try {
      const res = await fetch(FUNCTIONS.newsletter, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': roleKey,
          'Authorization': `Bearer ${roleKey}`
        },
      });

      if (!res.ok) {
        console.error('HTTP Error', res.status, res.statusText);
        const errBody = await res.text();
        console.error('Error Body:', errBody);
        return;
      }

      const data = await res.json();
      subscribers = Array.isArray(data) ? data : (data?.data || data || []);
      filteredSubscribers = [...subscribers];
      
      updateStats();
      renderTable(filteredSubscribers);
    } catch (err) {
      console.error('Fetch Error:', err);
      tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px; color: #888;"><i class="fas fa-exclamation-circle"></i> Erreur de chargement</td></tr>';
    }
  }

  // Update stats cards
  function updateStats() {
    // Total subscribers
    statTotalSubscribers.textContent = subscribers.length;

    // Last subscribed date
    if (subscribers.length > 0) {
      const lastSub = subscribers.reduce((latest, sub) => {
        const subDate = new Date(sub.date || sub.created_at || 0);
        const latestDate = new Date(latest.date || latest.created_at || 0);
        return subDate > latestDate ? sub : latest;
      });
      const lastDate = new Date(lastSub.date || lastSub.created_at);
      statLastSubscribed.textContent = lastDate.toLocaleDateString('fr-FR');
    } else {
      statLastSubscribed.textContent = '-';
    }

    // Update counts
    totalCount.textContent = subscribers.length;
    updateSelectedCount();
  }

  // Update selected count
  function updateSelectedCount() {
    const checkedCount = document.querySelectorAll('.ns-checkbox:checked').length;
    statSelected.textContent = checkedCount;
    
    if (sendScope.value === 'all') {
      recipientCount.textContent = subscribers.length;
    } else {
      recipientCount.textContent = checkedCount;
    }
  }

  // Escape HTML
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Render table
  function renderTable(dataToRender) {
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    displayCount.textContent = dataToRender.length;
    totalCount.textContent = subscribers.length;

    if (!dataToRender || dataToRender.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4">
            <div class="empty-state">
              <div class="empty-state-icon">📭</div>
              <div class="empty-state-title">Aucun abonné trouvé</div>
              <div class="empty-state-text">Commencez à ajouter des abonnés pour voir la liste</div>
            </div>
          </td>
        </tr>
      `;
      selectAllCheckbox.checked = false;
      selectAllCheckbox.disabled = true;
      return;
    }

    selectAllCheckbox.disabled = false;

    dataToRender.forEach(s => {
      const dateVal = s.date || s.created_at || '';
      const displayDate = dateVal ? new Date(dateVal).toLocaleDateString('fr-FR') : '-';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="text-align: center;">
          <input type="checkbox" class="ns-checkbox checkbox-custom" data-email="${escapeHtml(s.email)}">
        </td>
        <td>
          <div class="subscriber-email">${escapeHtml(s.email)}</div>
        </td>
        <td>
          <div class="subscriber-date">${displayDate}</div>
        </td>
        <td style="text-align: right;">
          <button class="btn-delete" data-id="${s.id}" data-action="delete">
            <i class="fas fa-trash"></i>
            Supprimer
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    // Add checkbox listeners
    document.querySelectorAll('.ns-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        updateSelectedCount();
        updateSelectAllState();
      });
    });

    updateSelectAllState();
    updateSelectedCount();
  }

  // Select All functionality
  selectAllCheckbox.addEventListener('change', function() {
    const checkboxes = document.querySelectorAll('.ns-checkbox');
    checkboxes.forEach(checkbox => checkbox.checked = this.checked);
    updateSelectedCount();
  });

  // Update "Select All" state based on individual checkboxes
  function updateSelectAllState() {
    const checkboxes = document.querySelectorAll('.ns-checkbox');
    const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
    const someChecked = Array.from(checkboxes).some(cb => cb.checked);
    
    selectAllCheckbox.checked = allChecked;
    selectAllCheckbox.indeterminate = someChecked && !allChecked;
  }

  // Export CSV
  exportBtn.addEventListener('click', () => {
    const rows = (subscribers || []).map(s => 
      [s.email || '', s.date || s.created_at || ''].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    );
    const csv = 'email,date\n' + rows.join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `subscribers_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  // Send via Gmail
  sendBtn.addEventListener('click', () => {
    const scope = sendScope ? sendScope.value : 'selected';
    let recipients = [];

    if (scope === 'all') {
      recipients = (subscribers || []).map(s => (s.email || '').trim()).filter(Boolean);
    } else {
      document.querySelectorAll('.ns-checkbox:checked').forEach(cb => {
        const e = cb.dataset.email;
        if (e) recipients.push(e.trim());
      });
    }

    if (!recipients.length) {
      alert('❌ Aucun destinataire sélectionné');
      return;
    }

    const maxRecipients = 200;
    const recipChunk = recipients.slice(0, maxRecipients).join(',');
    const base = 'https://mail.google.com/mail/?view=cm&fs=1';
    const params = ['bcc=' + encodeURIComponent(recipChunk)];
    const url = base + '&' + params.join('&');
    window.open(url, '_blank');
  });

  // Delete subscriber
  tableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action="delete"]');
    if (!btn) return;

    const id = btn.dataset.id;
    if (!confirm('⚠️ Supprimer cet abonné définitivement ?')) return;

    try {
      const r = await fetch(FUNCTIONS.newsletter + '/' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: { 'apikey': roleKey }
      });

      if (!r.ok) throw new Error('Delete failed');
      
      await loadSubscribers();
    } catch (err) {
      alert('❌ Erreur: impossible de supprimer l\'abonné');
      console.error(err);
    }
  });

  // Search functionality
  searchInput.addEventListener('input', (e) => {
    const q = (e.target.value || '').toLowerCase().trim();
    if (!q) {
      filteredSubscribers = [...subscribers];
    } else {
      filteredSubscribers = subscribers.filter(s => (s.email || '').toLowerCase().includes(q));
    }
    renderTable(filteredSubscribers);
  });

  // Update recipient count when scope changes
  sendScope.addEventListener('change', updateSelectedCount);

  // Initial load
  loadSubscribers();
});
