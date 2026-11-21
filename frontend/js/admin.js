const $ = s => document.querySelector(s);

let token = localStorage.getItem('noir_admin_token');

// ==========================================
// BACKEND API CONFIGURATION
// ==========================================

const API_BASE = '/api';

// ==========================================
// AUTHENTICATION
// ==========================================

function showLogin() {
    $('#loginView').classList.remove('hidden');
    $('#dashboardView').classList.add('hidden');
}

function showDash() {
    $('#loginView').classList.add('hidden');
    $('#dashboardView').classList.remove('hidden');
}

function clearAuth() {
    localStorage.removeItem('noir_admin_token');
    token = null;
    showLogin();
}

// ==========================================
// API REQUEST HANDLER
// ==========================================

const api = async (url, options = {}) => {

    const headers = {
        ...(options.body instanceof FormData
            ? {}
            : { 'Content-Type': 'application/json' }),

        ...(token
            ? { Authorization: 'Bearer ' + token }
            : {}),

        ...(options.headers || {})
    };

    // Redirect all /api requests to the Node.js backend.
    const requestUrl = url.startsWith('/api/')
        ? API_BASE + url.substring(4)
        : url;

    const response = await fetch(requestUrl, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {

        if (
            token &&
            url.startsWith('/api/admin/') &&
            (response.status === 401 || response.status === 403)
        ) {
            clearAuth();
        }

        throw new Error(data.message || 'Request failed.');
    }

    return data;
};

// ==========================================
// GENERAL HELPERS
// ==========================================

function formObj(form) {
    return Object.fromEntries(new FormData(form).entries());
}

function esc(value = '') {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function money(amount) {
    return '$' + Number(amount || 0).toFixed(2);
}

// ==========================================
// VERIFY ADMIN SESSION
// ==========================================

async function verifyAdmin() {

    if (!token) {
        showLogin();
        return false;
    }

    try {
        await api('/api/admin/me');
        return true;

    } catch (error) {
        clearAuth();
        return false;
    }
}

// ==========================================
// ADMIN LOGIN
// ==========================================

$('#loginForm').onsubmit = async event => {

    event.preventDefault();

    $('#loginMessage').textContent = 'Authenticating...';

    try {

        const data = await api('/api/admin/login', {
            method: 'POST',
            body: JSON.stringify(formObj(event.target))
        });

        if (!data.token) {
            throw new Error('Authentication token was not received.');
        }

        token = data.token;

        localStorage.setItem('noir_admin_token', token);

        const authenticated = await verifyAdmin();

        if (!authenticated) {
            throw new Error('Administrator authentication failed.');
        }

        $('#loginMessage').textContent = '';

        showDash();

        await loadAll();

    } catch (error) {

        $('#loginMessage').textContent = error.message;
    }
};

// ==========================================
// ADMIN LOGOUT
// ==========================================

$('#logout').onclick = () => {
    clearAuth();
};

// ==========================================
// LOAD ALL DASHBOARD DATA
// ==========================================

async function loadAll() {

    try {

        await Promise.all([
            loadStats(),
            loadBookings(),
            loadPackages(),
            loadPayments(),
            loadPortfolio(),
            loadSettings()
        ]);

    } catch (error) {

        if (token) {
            console.error('Dashboard loading error:', error);
        }
    }
}

// ==========================================
// DASHBOARD STATISTICS
// ==========================================

async function loadStats() {

    const data = await api('/api/admin/dashboard');

    $('#stats').innerHTML = [

        ['TOTAL BOOKINGS', data.stats.totalBookings],
        ['AWAITING ACTION', data.stats.pending],
        ['DEPOSITS PAID', data.stats.paid],
        ['PAYMENT REVENUE', money(data.stats.revenue)]

    ].map(item => `
        <div class="stat">
            <span>${item[0]}</span>
            <strong>${item[1]}</strong>
        </div>
    `).join('');
}

// ==========================================
// BOOKINGS MANAGEMENT
// ==========================================

async function loadBookings() {

    const data = await api('/api/admin/bookings');

    $('#bookingsBody').innerHTML = data.bookings.map(booking => `

        <tr>

            <td>
                <strong>${esc(booking.reference)}</strong>
                <br>
                ${esc(booking.customer.name)}
                <br>
                <small>${esc(booking.customer.email)}</small>
                <br>
                <small>ID: ${esc(booking._id)}</small>
            </td>

            <td>${esc(booking.type)}</td>

            <td>
                ${esc([
                    booking.tattooStyle,
                    booking.size,
                    booking.placement,
                    booking.description
                ].filter(Boolean).join(' · '))}
            </td>

            <td>
                ${money(booking.estimatedPrice)}
                /
                ${money(booking.depositAmount)}
            </td>

            <td>
                <span class="status-pill">
                    ${esc(booking.status)}
                </span>
                <br>
                <small>${esc(booking.paymentStatus)}</small>
            </td>

            <td>

                <div class="admin-actions">

                    <button
                        class="small-btn"
                        data-status="confirmed"
                        data-id="${esc(booking._id)}">
                        Confirm
                    </button>

                    <button
                        class="small-btn"
                        data-status="completed"
                        data-id="${esc(booking._id)}">
                        Complete
                    </button>

                    <button
                        class="small-btn danger"
                        data-status="cancelled"
                        data-id="${esc(booking._id)}">
                        Cancel
                    </button>

                </div>

            </td>

        </tr>

    `).join('') || `
        <tr>
            <td colspan="6">No bookings yet.</td>
        </tr>
    `;

    document.querySelectorAll('[data-status]').forEach(button => {

        button.onclick = async () => {

            try {

                await api(
                    '/api/admin/bookings/' + button.dataset.id,
                    {
                        method: 'PATCH',
                        body: JSON.stringify({
                            status: button.dataset.status
                        })
                    }
                );

                await loadBookings();

            } catch (error) {

                alert(error.message);
            }
        };
    });
}

// ==========================================
// PACKAGE MANAGEMENT
// ==========================================

async function loadPackages() {

    const data = await api('/api/admin/packages');

    $('#packagesList').innerHTML = `

        <table class="admin-table">

            <tbody>

                ${data.packages.map(packageItem => `

                    <tr>

                        <td>${esc(packageItem.name)}</td>

                        <td>${money(packageItem.estimatedPrice)}</td>

                        <td>
                            Deposit ${money(packageItem.deposit)}
                        </td>

                        <td>

                            <button
                                class="small-btn"
                                data-delete-package="${esc(packageItem._id)}">
                                Delete
                            </button>

                        </td>

                    </tr>

                `).join('')}

            </tbody>

        </table>

    `;

    document.querySelectorAll('[data-delete-package]').forEach(button => {

        button.onclick = async () => {

            if (!confirm('Delete this package?')) return;

            try {

                await api(
                    '/api/admin/packages/' + button.dataset.deletePackage,
                    {
                        method: 'DELETE'
                    }
                );

                await loadPackages();

            } catch (error) {

                alert(error.message);
            }
        };
    });
}

// ADD PACKAGE

$('#packageForm').onsubmit = async event => {

    event.preventDefault();

    try {

        const data = formObj(event.target);

        data.estimatedPrice = Number(data.estimatedPrice);
        data.deposit = Number(data.deposit);

        await api('/api/admin/packages', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        event.target.reset();

        await loadPackages();

    } catch (error) {

        $('#adminMessage').textContent = error.message;
    }
};

// ==========================================
// CUSTOM BOOKING QUOTES
// ==========================================

$('#quoteForm').onsubmit = async event => {

    event.preventDefault();

    try {

        const data = formObj(event.target);

        const id = data.id;

        delete data.id;

        data.estimatedPrice = Number(data.estimatedPrice);
        data.depositAmount = Number(data.depositAmount);

        await api('/api/admin/bookings/' + id + '/quote', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        $('#adminMessage').textContent =
            'Quote saved. Customer notification attempted.';

        event.target.reset();

        await loadBookings();

    } catch (error) {

        $('#adminMessage').textContent = error.message;
    }
};

// ==========================================
// PAYMENT MANAGEMENT
// ==========================================

async function loadPayments() {

    const data = await api('/api/admin/payments');

    $('#paymentsBody').innerHTML = data.payments.map(payment => `

        <tr>

            <td>
                ${esc(payment.reference || payment.providerId || '—')}
            </td>

            <td>${esc(payment.provider)}</td>

            <td>${money(payment.amount)} USD</td>

            <td>${esc(payment.status)}</td>

            <td>
                ${new Date(payment.createdAt).toLocaleString()}
            </td>

        </tr>

    `).join('') || `

        <tr>
            <td colspan="5">No payments yet.</td>
        </tr>

    `;
}

// ==========================================
// PORTFOLIO MANAGEMENT
// ==========================================

$('#portfolioForm').onsubmit = async event => {

    event.preventDefault();

    try {

        const data = formObj(event.target);

        const file = $('#portfolioFile').files[0];

        // Upload media to backend.

        if (file) {

            const formData = new FormData();

            formData.append('file', file);

            const uploaded = await api('/api/admin/upload', {
                method: 'POST',
                body: formData
            });

            data.imageUrl = uploaded.url;
            data.publicId = uploaded.publicId;
        }

        if (!data.imageUrl) {

            throw new Error(
                'Choose a media file or enter a media URL.'
            );
        }

        await api('/api/admin/portfolio', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        event.target.reset();

        await loadPortfolio();

    } catch (error) {

        $('#adminMessage').textContent = error.message;
    }
};

// LOAD PORTFOLIO

async function loadPortfolio() {

    const data = await api('/api/admin/portfolio');

    $('#portfolioList').innerHTML = `

        <table class="admin-table">

            <tbody>

                ${data.portfolio.map(item => `

                    <tr>

                        <td>${esc(item.title)}</td>

                        <td>${esc(item.category)}</td>

                        <td>

                            <button
                                class="small-btn danger"
                                data-delete-portfolio="${esc(item._id)}">
                                Delete
                            </button>

                        </td>

                    </tr>

                `).join('')}

            </tbody>

        </table>

    `;

    document.querySelectorAll('[data-delete-portfolio]').forEach(button => {

        button.onclick = async () => {

            if (!confirm('Delete this portfolio item?')) return;

            try {

                await api(
                    '/api/admin/portfolio/' + button.dataset.deletePortfolio,
                    {
                        method: 'DELETE'
                    }
                );

                await loadPortfolio();

            } catch (error) {

                alert(error.message);
            }
        };
    });
}

// ==========================================
// STUDIO SETTINGS
// ==========================================

async function loadSettings() {

    const data = await api('/api/admin/settings');

    for (const [key, value] of Object.entries(data.settings)) {

        const input = $(`#settingsForm [name="${key}"]`);

        if (input) {
            input.value = value || '';
        }
    }
}

// SAVE SETTINGS

$('#settingsForm').onsubmit = async event => {

    event.preventDefault();

    try {

        await api('/api/admin/settings', {
            method: 'PATCH',
            body: JSON.stringify(formObj(event.target))
        });

        $('#adminMessage').textContent = 'Settings saved.';

    } catch (error) {

        $('#adminMessage').textContent = error.message;
    }
};

// ==========================================
// INITIALIZE ADMIN DASHBOARD
// ==========================================

async function initializeAdmin() {

    $('#dashboardView').classList.add('hidden');
    $('#loginView').classList.add('hidden');

    const authenticated = await verifyAdmin();

    if (authenticated) {

        showDash();

        await loadAll();

    } else {

        showLogin();
    }
}

initializeAdmin();