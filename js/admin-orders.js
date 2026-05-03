/**
 * Admin Orders Management
 * Affiche et gère les commandes
 */

import { roleKey } from './supabaseClient.js';

let allOrders = [];
let currentFilter = 'all';

// Récupérer les commandes depuis Supabase
async function loadOrders() {
    try {
        const response = await fetch(
            'https://ecgujuutpxebpjwdwhcy.supabase.co/rest/v1/orders?order=created_at.desc',
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': roleKey,
                    'Authorization': `Bearer ${roleKey}`,
                    'Prefer': 'count=exact'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        allOrders = await response.json();
        console.log('Orders loaded:', allOrders);
        renderOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
        showErrorMessage('Erreur lors du chargement des commandes');
    }
}

// Afficher les commandes filtrées
function renderOrders() {
    const ordersList = document.getElementById('ordersList');
    const emptyMsg = document.getElementById('emptyMessage');

    if (!ordersList || !emptyMsg) {
        return;
    }

    let filtered = allOrders;
    if (currentFilter !== 'all') {
        filtered = allOrders.filter(o => o.status === currentFilter);
    }

    if (filtered.length === 0) {
        ordersList.innerHTML = '';
        emptyMsg.classList.remove('d-none');
        return;
    }

    emptyMsg.classList.add('d-none');

    ordersList.innerHTML = filtered.map(order => `
        <div class="admin-order-card" data-id="${order.id}">
            <div class="order-header">
                <div>
                    <span class="order-id">#${order.id}</span>
                    ${renderOrderTypeBadge(order.items)}
                    <span style="font-size: 0.85rem; color: #999; margin-left: 10px;">
                        ${formatDate(order.created_at)}
                    </span>
                </div>
                <span class="order-status status-${order.status}">
                    ${translateStatus(order.status)}
                </span>
            </div>

            <div class="order-info">
                <div class="info-row">
                    <span class="info-label">📞 Téléphone</span>
                    <span class="info-value">${order.phone_number}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">💰 Montant Total</span>
                    <span class="info-value">${Number(order.total || 0).toFixed(2)} €</span>
                </div>
            </div>

            ${renderOrderFulfillment(order.items)}

            <div class="order-items">
                <div class="order-items-title">Articles commandés</div>
                ${renderOrderItems(order.items)}
            </div>

            <div class="order-total">
                <span>Total à payer</span>
                <span class="order-total-value">${Number(order.total || 0).toFixed(2)} €</span>
            </div>

            <div class="order-actions">
                ${renderStatusButtons(order)}
            </div>
        </div>
    `).join('');

    document.querySelectorAll('[data-status-btn]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('[data-id]');
            const orderId = card?.dataset.id;
            const newStatus = e.target.dataset.statusBtn;
            if (orderId && newStatus) {
                updateOrderStatus(orderId, newStatus);
            }
        });
    });
}

// Afficher les articles d'une commande
function renderOrderItems(itemsJson) {
    try {
        const parsed = typeof itemsJson === 'string' ? JSON.parse(itemsJson) : itemsJson;
        const items = Array.isArray(parsed) ? parsed : (parsed?.items || []);

        return items.map(item => {
            const optionsHTML = renderOrderItemOptions(item.options);
            const quantity = Number(item.quantity || 1);
            const unitPrice = Number(item.price || 0);
            const itemTotal = unitPrice * quantity;

            return `
                <div class="order-item">
                    <div class="order-item-main">
                        <div class="order-item-title-row">
                            <span class="order-item-name">${item.name}</span>
                            <span class="order-item-qty-label">× ${quantity}</span>
                        </div>
                        ${optionsHTML}
                    </div>
                    <span class="order-item-qty">${itemTotal.toFixed(2)} €</span>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Error parsing items:', e);
        return '<span style="color: #999;">Erreur lors du chargement des articles</span>';
    }
}

function renderOrderItemOptions(options) {
    if (!options || typeof options !== 'object') {
        return '';
    }

    const lines = Object.values(options)
        .map(option => {
            const values = Array.isArray(option?.values) ? option.values : [];
            if (values.length === 0) return '';

            const optionLabel = option.optionName || 'Option';
            const valueLabel = values.map(value => value.value).filter(Boolean).join(', ');
            if (!valueLabel) return '';

            return `<div class="order-item-options-line"><span class="order-item-option-name">${optionLabel}:</span> <span class="order-item-option-values">${valueLabel}</span></div>`;
        })
        .filter(Boolean);

    if (lines.length === 0) {
        return '';
    }

    return `<div class="order-item-options">${lines.join('')}</div>`;
}

function getOrderMeta(itemsJson) {
    try {
        const parsed = typeof itemsJson === 'string' ? JSON.parse(itemsJson) : itemsJson;
        return Array.isArray(parsed) ? null : (parsed?.meta || null);
    } catch (e) {
        return null;
    }
}

function renderOrderTypeBadge(itemsJson) {
    const meta = getOrderMeta(itemsJson);
    const orderType = meta?.order_type || 'takeaway';

    const badgeConfig = {
        pickup: { label: 'Sur place', icon: 'fa-store', className: 'badge-pickup' },
        takeaway: { label: 'À emporter', icon: 'fa-bag-shopping', className: 'badge-takeaway' },
        delivery: { label: 'Livraison', icon: 'fa-truck', className: 'badge-delivery' },
    };

    const badge = badgeConfig[orderType] || badgeConfig.takeaway;

    return `
        <span class="order-type-badge ${badge.className}">
            <i class="fas ${badge.icon} me-1"></i>${badge.label}
        </span>
    `;
}

function renderOrderFulfillment(itemsJson) {
    try {
        const meta = getOrderMeta(itemsJson);
        if (!meta || meta.order_type !== 'delivery') {
            return '';
        }

        return `
            <div class="order-fulfillment">
                <div class="info-row">
                    <span class="info-label">📍 Adresse</span>
                    <span class="info-value">${meta.delivery_address || 'Non renseignée'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">📏 Distance</span>
                    <span class="info-value">${typeof meta.delivery_distance_km === 'number' ? meta.delivery_distance_km.toFixed(2) + ' km' : 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">🚚 Frais</span>
                    <span class="info-value">${typeof meta.delivery_fee === 'number' ? meta.delivery_fee.toFixed(2) + ' €' : '0.00 €'}</span>
                </div>
            </div>
        `;
    } catch (e) {
        return '';
    }
}

// Boutons pour changer le status
function renderStatusButtons(order) {
    const meta = getOrderMeta(order.items);
    const isDelivery = meta?.order_type === 'delivery';
    const statusFlow = ['pending', 'preparing', 'delivered'];
    const currentIndex = statusFlow.indexOf(order.status);

    let buttons = '';

    if (currentIndex > -1 && currentIndex < statusFlow.length - 1) {
        const nextStatus = statusFlow[currentIndex + 1];
        const nextLabel = nextStatus === 'delivered'
            ? (isDelivery ? 'Terminer' : 'Terminer')
            : translateStatus(nextStatus);
        buttons += `
            <button class="status-btn primary" data-status-btn="${nextStatus}">
                <i class="fas fa-arrow-right me-2"></i>${nextLabel}
            </button>
        `;
    }

    buttons += `
        <button class="status-btn secondary" onclick="callCustomer('${order.phone_number}')">
            <i class="fas fa-phone me-2"></i>Appeler
        </button>
    `;

    return buttons;
}

// Mettre à jour le status d'une commande
async function updateOrderStatus(orderId, newStatus) {
    try {
        console.log('Updating order:', { orderId, newStatus });

        const updateOrderStatusUrl = 'https://ecgujuutpxebpjwdwhcy.supabase.co/functions/v1/update-order-status';
        const response = await fetch(updateOrderStatusUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'apikey': roleKey,
                'Authorization': `Bearer ${roleKey}`,
            },
            body: JSON.stringify({
                order_id: parseInt(orderId),
                new_status: newStatus
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Response error:', errorData);
            throw new Error(`Error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        const result = await response.json();
        console.log('Update result:', result);

        const order = allOrders.find(o => o.id == orderId);
        if (order) {
            order.status = newStatus;
            order.updated_at = new Date().toISOString();
        }

        renderOrders();

        if (newStatus === 'preparing' && result.loyalty) {
            showLoyaltyModal(result.loyalty);
        } else {
            showSuccessMessage(`Commande #${orderId} mise à jour: ${translateStatus(newStatus)}`);
        }
    } catch (error) {
        console.error('Error updating order:', error);
        showErrorMessage('Erreur lors de la mise à jour: ' + error.message);
    }
}

// Show loyalty info modal
function showLoyaltyModal(loyaltyInfo) {
    const modal = document.createElement('div');
    modal.className = 'modal fade show';
    modal.style.display = 'block';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('role', 'dialog');

    const totalSpent = parseFloat(loyaltyInfo.total_spent).toFixed(2);
    const pointsBalance = parseFloat(loyaltyInfo.points_balance).toFixed(2);
    const productsToGive = loyaltyInfo.products_to_give_now || 0;
    const newFreeProduct = productsToGive > 0;

    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered" style="max-width: 500px;">
            <div class="modal-content">
                <div class="modal-header bg-light">
                    <h5 class="modal-title">
                        <i class="fas fa-gift me-2" style="color: #E53935;"></i>
                        Statut Client - Loyauté
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" onclick="this.closest('.modal').remove()"></button>
                </div>
                <div class="modal-body">
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <div class="p-3 bg-light rounded">
                                <div class="text-muted small mb-1">💰 Montant Total Dépensé</div>
                                <div class="h4 mb-0 fw-bold">${totalSpent} €</div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="p-3 bg-light rounded">
                                <div class="text-muted small mb-1">🎁 À Donner Maintenant</div>
                                <div class="h4 mb-0 fw-bold">${productsToGive}</div>
                            </div>
                        </div>
                    </div>

                    <div class="row mb-3">
                        <div class="col-12">
                            <div class="p-3 bg-light rounded">
                                <div class="text-muted small mb-1">🔄 Points Accumulés</div>
                                <div class="h4 mb-0 fw-bold">${pointsBalance} €</div>
                            </div>
                        </div>
                    </div>

                    ${newFreeProduct ? `
                        <div class="alert alert-success mb-3" style="background-color: #d1ecf1; border: 3px solid #0c5460; animation: pulse 1.5s infinite;">
                            <i class="fas fa-star me-2" style="color: #ffc107; font-size: 1.2em;"></i>
                            <strong style="font-size: 1.1em; color: #0c5460;">🎁 CLIENT A GAGNÉ UN PRODUIT GRATUIT!</strong>
                            <br><small>Assurez-vous de lui offrir lors du retrait.</small>
                        </div>
                    ` : ''}

                    <div class="alert alert-info mb-0">
                        <small>
                            <i class="fas fa-info-circle me-2"></i>
                            Pour chaque 100€ dépensés, le client gagne 1 produit gratuit d'environ 10€.
                        </small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" onclick="this.closest('.modal').remove()">Fermer</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Appeler le client
function callCustomer(phone) {
    const tel = `tel:${phone}`;
    window.location.href = tel;
}

// Traduction des statuts
function translateStatus(status) {
    const statuses = {
        'pending': '⏳ En attente',
        'preparing': '👨‍🍳 En préparation',
        'delivered': '✅ Livré'
    };
    return statuses[status] || status;
}

// Formater la date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (isYesterday) {
        return 'Hier ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString('fr-FR');
    }
}

// Messages d'erreur/succès
function showErrorMessage(msg) {
    const toast = document.createElement('div');
    toast.className = 'alert alert-danger alert-dismissible fade show';
    toast.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
    toast.innerHTML = `
        <strong>❌ Erreur:</strong> ${msg}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 5000);
}

function showSuccessMessage(msg) {
    const toast = document.createElement('div');
    toast.className = 'alert alert-success alert-dismissible fade show';
    toast.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
    toast.innerHTML = `
        <strong>✅ Succès:</strong> ${msg}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.status;
        renderOrders();
    });
});

// Sidebar toggle (mobile)
const hamburger = document.getElementById('adminHamburger');
const sidebar = document.getElementById('adminSidebar');

if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
}

// Logout
document.getElementById('logoutLink')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        const { supabase } = await import('./supabaseClient.js');
        await supabase.auth.signOut();
    } catch (error) {
        console.error('Error signing out:', error);
    }
    window.location.href = 'login.html';
});

// Load orders on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOrders);
} else {
    initOrders();
}

// Initialize Realtime subscription
async function initOrders() {
    await loadOrders();

    try {
        const { supabase } = await import('./supabaseClient.js');

        supabase
            .channel('orders-channel')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders'
                },
                (payload) => {
                    console.log('Order change detected:', payload);
                    loadOrders();
                }
            )
            .subscribe();

        console.log('Realtime subscription active');
    } catch (error) {
        console.error('Realtime subscription failed:', error);
        setInterval(loadOrders, 30000);
    }
}
