import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const alertContainer = document.getElementById('alertContainer');
    const loadingSpinner = document.getElementById('loadingSpinner');

    // Redirige si déjà connecté
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            window.location.href = 'admin.html';
        }
    });

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        if (!email || !password) {
            showAlert('Veuillez remplir tous les champs', 'danger');
            return;
        }
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Connexion...';
        loadingSpinner.classList.add('show');
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                showAlert(error.message || 'Email ou mot de passe incorrect', 'danger');
            } else {
                showAlert('Connexion réussie ! Redirection en cours...', 'success');
                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 1000);
            }
        } catch (error) {
            console.error('Erreur de connexion:', error);
            showAlert('Erreur de connexion. Veuillez vérifier votre connexion internet et réessayer.', 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            loadingSpinner.classList.remove('show');
        }
    });

    function showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.style.cssText = `
            padding: 12px 16px;
            margin: 10px 0;
            border-radius: 8px;
            color: white;
            font-family: 'Montserrat', sans-serif;
            text-align: center;
            border: 1px solid ${type === 'success' ? '#D4AF37' : '#ff6b6b'};
            background: ${type === 'success' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 107, 107, 0.2)'};
        `;
        alertDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
            ${message}
        `;
        alertContainer.innerHTML = '';
        alertContainer.appendChild(alertDiv);
        if (type === 'danger') {
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 5000);
        }
    }

    // Animation d'entrée pour les champs de formulaire
    const formControls = document.querySelectorAll('.input-group input');
    formControls.forEach((control, index) => {
        control.style.opacity = '0';
        control.style.transform = 'translateY(20px)';
        setTimeout(() => {
            control.style.transition = 'all 0.5s ease';
            control.style.opacity = '1';
            control.style.transform = 'translateY(0)';
        }, index * 100);
    });
});