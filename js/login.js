document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const alertContainer = document.getElementById('alertContainer');
    const loadingSpinner = document.getElementById('loadingSpinner');

    // Vérifier si déjà connecté
    checkAuthStatus();

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Validation basique
        if (!email || !password) {
            showAlert('Veuillez remplir tous les champs', 'danger');
            return;
        }

        // Désactiver le bouton et afficher le spinner
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Connexion...';
        loadingSpinner.classList.add('show');

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Connexion réussie
                localStorage.setItem('admin_token', data.token);
                showAlert('Connexion réussie ! Redirection en cours...', 'success');

                // Rediriger vers la page admin après un court délai
                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 1500);
            } else {
                // Erreur de connexion
                showAlert(data.message || 'Email ou mot de passe incorrect', 'danger');
            }
        } catch (error) {
            console.error('Erreur de connexion:', error);
            showAlert('Erreur de connexion. Veuillez vérifier votre connexion internet et réessayer.', 'danger');
        } finally {
            // Réactiver le bouton et masquer le spinner
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            loadingSpinner.classList.remove('show');
        }
    });

    function showAlert(message, type) {
        // Créer un élément d'alerte simple sans Bootstrap
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

        // Auto-dismiss après 5 secondes pour les erreurs
        if (type === 'danger') {
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 5000);
        }
    }

    async function checkAuthStatus() {
        const token = localStorage.getItem('admin_token');
        if (token) {
            try {
                const response = await fetch('/api/verify-token', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    // Token valide, rediriger vers admin
                    window.location.href = 'admin.html';
                } else {
                    // Token invalide, le supprimer
                    localStorage.removeItem('admin_token');
                }
            } catch (error) {
                console.error('Erreur vérification token:', error);
                localStorage.removeItem('admin_token');
            }
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