// const $ = (s) => document.querySelector(s);
// const api = async (url, options={}) => {
//   const res = await fetch(url, { headers: { 'Content-Type':'application/json', ...(options.headers||{}) }, ...options });
//   const data = await res.json().catch(()=>({}));
//   if (!res.ok) throw new Error(data.message || 'Something went wrong.');
//   return data;
// };
// $('#year').textContent = new Date().getFullYear();
// $('#menuToggle').addEventListener('click',()=>$('#mainNav').classList.toggle('open'));
// document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
//   document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));btn.classList.add('active');
//   $('#standardPanel').classList.toggle('hidden',btn.dataset.tab!=='standard');
//   $('#customPanel').classList.toggle('hidden',btn.dataset.tab!=='custom');
//   $('#bookingMessage').textContent='';
// }));
// let selectedPackage=null;
// async function loadPackages(){
//   try{
//     const {packages}=await api('/api/packages');
//     $('#packageGrid').innerHTML=packages.map(p=>`<div class="package-card" data-id="${p._id}"><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description||'Studio package')}</p><strong>$${Number(p.deposit).toFixed(2)} <small>deposit</small></strong><p>Est. total $${Number(p.estimatedPrice).toFixed(2)}</p></div>`).join('')||'<p>No packages available. Please contact the studio.</p>';
//     document.querySelectorAll('.package-card').forEach(card=>card.addEventListener('click',()=>{
//       document.querySelectorAll('.package-card').forEach(c=>c.classList.remove('selected'));card.classList.add('selected');
//       selectedPackage=card.dataset.id;$('#packageId').value=selectedPackage;
//     }));
//   }catch(e){$('#packageGrid').textContent=e.message;}
// }
// async function loadPortfolio(){
//   try{
//     const {portfolio}=await api('/api/portfolio');
//     const fallback=[
//       ['Fine line composition','Fine Line','https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=900&q=80'],
//       ['Black and grey detail','Black & Grey','https://images.unsplash.com/photo-1562962230-16e4623d36e6?auto=format&fit=crop&w=900&q=80'],
//       ['Custom artistry','Custom','https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?auto=format&fit=crop&w=900&q=80']
//     ];
//     const items=portfolio.length?portfolio.map(x=>[x.title,x.category,x.imageUrl]):fallback;
//     $('#portfolioGrid').innerHTML=items.map(x=>{const video=/\\/video\\/upload\\//.test(x[2])||/\\.(mp4|webm|mov)(\\?|$)/i.test(x[2]);const media=video?`<video src="${escapeAttr(x[2])}" muted loop playsinline controls preload="metadata"></video>`:`<img src="${escapeAttr(x[2])}" alt="${escapeAttr(x[0])}" loading="lazy">`;return `<article class="portfolio-card">${media}<div><small>${escapeHtml(x[1])}</small><h3>${escapeHtml(x[0])}</h3></div></article>`;}).join('');
//   }catch(e){console.warn(e);}
// }
// function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
// function escapeAttr(s=''){return escapeHtml(s);}
// function formObject(form){return Object.fromEntries(new FormData(form).entries());}
// $('#standardForm').addEventListener('submit',async e=>{
//   e.preventDefault();const msg=$('#bookingMessage');msg.textContent='Submitting your booking…';
//   try{
//     if(!selectedPackage)throw new Error('Please select a package.');
//     const data=formObject(e.target);const result=await api('/api/bookings/standard',{method:'POST',body:JSON.stringify(data)});
//     location.href=`/payment.html?booking=${encodeURIComponent(result.booking.reference)}`;
//   }catch(err){msg.textContent=err.message;}
// });
// $('#customForm').addEventListener('submit',async e=>{
//   e.preventDefault();const msg=$('#bookingMessage');msg.textContent='Submitting your request…';
//   try{
//     const result=await api('/api/bookings/custom',{method:'POST',body:JSON.stringify(formObject(e.target))});
//     msg.innerHTML=`Request received. Your reference is <strong>${escapeHtml(result.booking.reference)}</strong>. The artist will review your idea and send a quote. Keep this reference safe.`;
//     e.target.reset();
//   }catch(err){msg.textContent=err.message;}
// });
// loadPackages();loadPortfolio();





const $ = (selector) => document.querySelector(selector);

const api = async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || `Request failed (${response.status}).`);
    }

    return data;
};

// Footer year
const yearElement = $('#year');
if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
}

// Mobile navigation
const menuToggle = $('#menuToggle');
const mainNav = $('#mainNav');

if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
        mainNav.classList.toggle('open');
    });
}

// Booking tabs
document.querySelectorAll('.tab').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });

        button.classList.add('active');

        $('#standardPanel')?.classList.toggle(
            'hidden',
            button.dataset.tab !== 'standard'
        );

        $('#customPanel')?.classList.toggle(
            'hidden',
            button.dataset.tab !== 'custom'
        );

        if ($('#bookingMessage')) {
            $('#bookingMessage').textContent = '';
        }
    });
});

// Package selection
let selectedPackage = null;

async function loadPackages() {
    const grid = $('#packageGrid');

    if (!grid) return;

    grid.innerHTML = '<p class="muted">Loading available packages...</p>';

    try {
        const data = await api('/api/packages');
        const packages = Array.isArray(data.packages) ? data.packages : [];

        if (!packages.length) {
            grid.innerHTML = '<p class="muted">No packages are currently available. Please contact the studio.</p>';
            return;
        }

        grid.innerHTML = packages.map(pack => `
            <button
                type="button"
                class="package-card"
                data-id="${escapeAttr(pack._id)}"
                aria-pressed="false"
            >
                <h3>${escapeHtml(pack.name)}</h3>

                <p>${escapeHtml(pack.description || 'Studio tattoo package')}</p>

                <strong>
                    $${Number(pack.deposit).toFixed(2)}
                    <small>deposit</small>
                </strong>

                <p>
                    Estimated total:
                    $${Number(pack.estimatedPrice).toFixed(2)}
                </p>

                <span class="package-select-label">SELECT PACKAGE</span>
            </button>
        `).join('');

        grid.querySelectorAll('.package-card').forEach(card => {
            card.addEventListener('click', () => {
                grid.querySelectorAll('.package-card').forEach(item => {
                    item.classList.remove('selected');
                    item.setAttribute('aria-pressed', 'false');
                });

                card.classList.add('selected');
                card.setAttribute('aria-pressed', 'true');

                selectedPackage = card.dataset.id;

                const packageInput = $('#packageId');

                if (packageInput) {
                    packageInput.value = selectedPackage;
                }

                const message = $('#bookingMessage');

                if (message) {
                    message.textContent = `${card.querySelector('h3').textContent} selected.`;
                }
            });
        });

    } catch (error) {
        console.error('Package loading error:', error);

        grid.innerHTML = `
            <p class="muted">
                Unable to load packages. Please refresh the page or try again.
            </p>
            <button type="button" id="retryPackages" class="btn btn-gold">
                TRY AGAIN
            </button>
        `;

        $('#retryPackages')?.addEventListener('click', loadPackages);
    }
}

// Portfolio
async function loadPortfolio() {
    try {
        const { portfolio = [] } = await api('/api/portfolio');

        const fallback = [
            [
                'Fine line composition',
                'Fine Line',
                'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=900&q=80'
            ],
            [
                'Black and grey detail',
                'Black & Grey',
                'https://images.unsplash.com/photo-1562962230-16e4623d36e6?auto=format&fit=crop&w=900&q=80'
            ],
            [
                'Custom artistry',
                'Custom',
                'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?auto=format&fit=crop&w=900&q=80'
            ]
        ];

        const items = portfolio.length
            ? portfolio.map(item => [
                item.title,
                item.category,
                item.imageUrl
            ])
            : fallback;

        const grid = $('#portfolioGrid');

        if (!grid) return;

        grid.innerHTML = items.map(item => {
            const [title, category, url] = item;

            const video =
                /\/video\/upload\//.test(url) ||
                /\.(mp4|webm|mov)(\?|$)/i.test(url);

            const media = video
                ? `<video src="${escapeAttr(url)}" muted loop playsinline controls preload="metadata"></video>`
                : `<img src="${escapeAttr(url)}" alt="${escapeAttr(title)}" loading="lazy">`;

            return `
                <article class="portfolio-card">
                    ${media}
                    <div>
                        <small>${escapeHtml(category)}</small>
                        <h3>${escapeHtml(title)}</h3>
                    </div>
                </article>
            `;
        }).join('');

    } catch (error) {
        console.warn('Portfolio loading error:', error);
    }
}

// HTML escaping
function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function escapeAttr(value = '') {
    return escapeHtml(value);
}

// Form data
function formObject(form) {
    return Object.fromEntries(new FormData(form).entries());
}

// Standard booking
const standardForm = $('#standardForm');

if (standardForm) {
    standardForm.addEventListener('submit', async event => {
        event.preventDefault();

        const message = $('#bookingMessage');
        const submitButton = standardForm.querySelector('button[type="submit"]');

        try {
            if (!selectedPackage || !$('#packageId')?.value) {
                throw new Error('Please select a tattoo package first.');
            }

            if (!standardForm.reportValidity()) return;

            const formData = formObject(standardForm);

            formData.packageId = selectedPackage;

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'SUBMITTING BOOKING...';
            }

            message.textContent = 'Submitting your booking...';

            const result = await api('/api/bookings/standard', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (!result.booking?.reference) {
                throw new Error('Booking was submitted but no reference was returned.');
            }

            message.textContent = 'Booking created successfully. Redirecting to payment...';

            window.location.href =
                `/payment.html?booking=${encodeURIComponent(result.booking.reference)}`;

        } catch (error) {
            console.error('Booking submission error:', error);

            message.textContent = error.message;

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = 'CONTINUE TO DEPOSIT <span>↗</span>';
            }
        }
    });
}

// Custom booking
const customForm = $('#customForm');

if (customForm) {
    customForm.addEventListener('submit', async event => {
        event.preventDefault();

        const message = $('#bookingMessage');
        const submitButton = customForm.querySelector('button[type="submit"]');

        try {
            if (!customForm.reportValidity()) return;

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'SUBMITTING REQUEST...';
            }

            message.textContent = 'Submitting your custom request...';

            const result = await api('/api/bookings/custom', {
                method: 'POST',
                body: JSON.stringify(formObject(customForm))
            });

            message.innerHTML = `
                Request received. Your reference is
                <strong>${escapeHtml(result.booking.reference)}</strong>.
                The artist will review your idea and send a quote.
                Keep this reference safe.
            `;

            customForm.reset();

        } catch (error) {
            console.error('Custom request error:', error);
            message.textContent = error.message;

        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = 'SUBMIT CUSTOM REQUEST <span>↗</span>';
            }
        }
    });
}

// Start loading data
loadPackages();
loadPortfolio();