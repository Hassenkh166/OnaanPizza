// Admin page for newsletter subscribers
import { supabase,supabaseKey ,roleKey,FUNCTIONS} from './supabaseClient.js';
import { requireAuth } from './checkAuthentication.js';
document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth();

  // Gestionnaire pour le lien de déconnexion
  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.addEventListener('click', async function(e) {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.href = 'login.html';
    });
  }

  const tableBody = document.querySelector('#subscribersTable tbody');
  const exportBtn = document.getElementById('exportCsv');
  const searchInput = document.getElementById('searchEmail');

  let subscribers = [];

  async function loadSubscribers() {
    // Appel GET direct, plus besoin de session ni d'Authorization
    try {
         const res = await fetch(FUNCTIONS.newsletter, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Remplace par ta vraie clé anon (ou service role si tu es sur un panel admin)
        'apikey': roleKey, 
        'Authorization': `Bearer ${roleKey}`
      },
    });

      if (!res.ok) {
        console.error('Erreur HTTP', res.status, res.statusText);
        const errBody = await res.text();
        console.error('Body:', errBody);
        return;
      }
      const data = await res.json();
      console.log('Abonnés newsletter :', data.data || data);
      subscribers = Array.isArray(data) ? data : (data?.data || data || []);
      renderTable(subscribers);
    } catch (err) {
      console.error('Erreur fetch:', err);
      tableBody.innerHTML = '<tr><td colspan="3">Erreur de chargement</td></tr>';
    }
  }

  function escapeHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function renderTable(dataToRender) {
    if (!tableBody) return;
    tableBody.innerHTML = '';

    // Responsive: si petit écran, afficher en "cards" verticales
    const isMobile = window.innerWidth <= 600;

    if (!dataToRender || dataToRender.length === 0) {
      if (isMobile) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:18px 0;font-size:1.08rem;color:#888;">Aucun abonné trouvé</td></tr>';
      } else {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:18px 0;font-size:1.08rem;color:#888;">Aucun abonné trouvé</td></tr>';
      }
      return;
    }

    if (isMobile) {
      // Affichage "card" vertical pour chaque abonné
      dataToRender.forEach(s => {
        const dateVal = s.date || s.created_at || '';
        const displayDate = dateVal ? new Date(dateVal).toLocaleDateString('fr-FR') : '-';
        const row = document.createElement('tr');
        row.innerHTML = `
          <td colspan="4" style="padding:10px 4px 18px 4px;">
            <div style="background:rgba(255,255,255,0.93);border-radius:12px;box-shadow:0 2px 8px rgba(229,57,53,0.08);padding:14px 10px 10px 10px;display:flex;flex-direction:column;gap:8px;align-items:flex-start;">
              <div style="display:flex;align-items:center;gap:10px;width:100%;justify-content:space-between;">
                <span style="font-size:1.08rem;font-family:'Lato',Arial,sans-serif;color:#222;word-break:break-all;"><b>Email:</b> ${escapeHtml(s.email)}</span>
                <input type="checkbox" class="ns-checkbox" data-email="${escapeHtml(s.email)}" style="width:18px;height:18px;accent-color:#E53935;vertical-align:middle;cursor:pointer;">
              </div>
              <div style="font-size:0.98rem;color:#888;font-family:'Poppins',sans-serif;"><b>Date:</b> ${displayDate}</div>
              <div style="width:100%;text-align:right;">
                <button class="btn-delete" data-id="${s.id}" data-action="delete" style="background:linear-gradient(135deg,#E53935 0%,#C62828 100%);color:#fff;border:none;border-radius:8px;padding:7px 18px;font-size:1.05rem;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(229,57,53,0.13);transition:background 0.18s,box-shadow 0.18s,transform 0.18s;outline:none;">
                  <span style="display:inline-flex;align-items:center;gap:6px;">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;"><path d="M6.5 8.5V14.5M10 8.5V14.5M13.5 8.5V14.5M3.5 4.5H16.5M8.5 2.5H11.5C12.0523 2.5 12.5 2.94772 12.5 3.5V4.5H7.5V3.5C7.5 2.94772 7.94772 2.5 8.5 2.5ZM4.5 4.5V16.5C4.5 17.0523 4.94772 17.5 5.5 17.5H14.5C15.0523 17.5 15.5 17.0523 15.5 16.5V4.5" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/></svg>
                    Supprimer
                  </span>
                </button>
              </div>
            </div>
          </td>
        `;
        tableBody.appendChild(row);
      });
    } else {
      // Affichage tableau classique desktop amélioré
      dataToRender.forEach(s => {
        const row = document.createElement('tr');
        const dateVal = s.date || s.created_at || '';
        const displayDate = dateVal ? new Date(dateVal).toLocaleDateString('fr-FR') : '-';
        row.innerHTML = `
          <td style="padding:12px 8px;text-align:center;">
            <input type="checkbox" class="ns-checkbox" data-email="${escapeHtml(s.email)}" style="width:18px;height:18px;accent-color:#E53935;vertical-align:middle;cursor:pointer;">
          </td>
          <td style="padding:12px 8px;font-size:1.08rem;font-family:'Lato',Arial,sans-serif;color:#222;">${escapeHtml(s.email)}</td>
          <td style="padding:12px 8px;font-size:0.98rem;color:#888;font-family:'Poppins',sans-serif;">${displayDate}</td>
          <td style="padding:12px 8px;text-align:center;">
            <button class="btn-delete" data-id="${s.id}" data-action="delete" style="background:linear-gradient(135deg,#E53935 0%,#C62828 100%);color:#fff;border:none;border-radius:8px;padding:7px 18px;font-size:1.05rem;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(229,57,53,0.13);transition:background 0.18s,box-shadow 0.18s,transform 0.18s;outline:none;">
              <span style="display:inline-flex;align-items:center;gap:6px;">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;"><path d="M6.5 8.5V14.5M10 8.5V14.5M13.5 8.5V14.5M3.5 4.5H16.5M8.5 2.5H11.5C12.0523 2.5 12.5 2.94772 12.5 3.5V4.5H7.5V3.5C7.5 2.94772 7.94772 2.5 8.5 2.5ZM4.5 4.5V16.5C4.5 17.0523 4.94772 17.5 5.5 17.5H14.5C15.0523 17.5 15.5 17.0523 15.5 16.5V4.5" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/></svg>
                Supprimer
              </span>
            </button>
          </td>
        `;
        tableBody.appendChild(row);
      });
    }
  }
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
      const r = await fetch(FUNCTIONS.newsletter + '/' + encodeURIComponent(id), { method: 'DELETE', headers: { 'apikey': roleKey } });
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
  // plus de checkAuthentication, tout est géré par requireAuth

  function initializeNewsletter() {
    // Code d'initialisation existant
    loadSubscribers();
  }

  // Initialisation après auth
  initializeNewsletter();
});
