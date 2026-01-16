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
        alertContainer.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        // Auto-dismiss après 5 secondes pour les erreurs
        if (type === 'danger') {
            setTimeout(() => {
                const alert = alertContainer.querySelector('.alert');
                if (alert) {
                    alert.remove();
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
    const formControls = document.querySelectorAll('.form-control');
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