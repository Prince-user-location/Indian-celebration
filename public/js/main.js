const API_URL = "";
let allProducts = [], allBanners = [], appSettings = {};
let cart = JSON.parse(localStorage.getItem('diwali_cart')) || [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let wishlist = [];
const defaultBanner = "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=800";

window.addEventListener('load', () => {
    let savedLoc = localStorage.getItem('user_location');
    if(savedLoc && document.getElementById('headerLocationText')) document.getElementById('headerLocationText').innerText = savedLoc + ' >';
});

function openLocationModal() { document.getElementById('locationModal').classList.add('open'); }
function saveLocation() {
    const pin = document.getElementById('locPincode').value;
    const city = document.getElementById('locCity').value;
    if(!pin || !city) return alert("Please enter Pincode and City");
    localStorage.setItem('user_location', `${city} - ${pin}`);
    document.getElementById('headerLocationText').innerText = `${city} - ${pin} >`;
    closeModal('locationModal');
}

setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) { splash.classList.add('fade-out'); setTimeout(() => { splash.style.display = 'none'; }, 500); }
}, 2500);

async function loadData() {
    try {
        const [prodRes, bannerRes, settingsRes] = await Promise.all([
            fetch(`${API_URL}/api/products?limit=30`), 
            fetch(`${API_URL}/api/banners`),
            fetch(`${API_URL}/api/settings`)
        ]);
        
        allProducts = await prodRes.json();
        allBanners = await bannerRes.json();
        appSettings = await settingsRes.json();

        // Apply Tab Icons
        const tabs = document.querySelectorAll('.tab-box');
        if(tabs.length >= 4 && appSettings) {
            if(appSettings.tabWeekly) tabs[0].querySelector('img').src = appSettings.tabWeekly;
            if(appSettings.tabTravel) tabs[1].querySelector('img').src = appSettings.tabTravel;
            if(appSettings.tabValue365) tabs[2].querySelector('img').src = appSettings.tabValue365;
            if(appSettings.tabGifts) tabs[3].querySelector('img').src = appSettings.tabGifts;
        }

        // Apply Header Icons
        if(appSettings) {
            const iconStyle = "width:24px; height:24px; object-fit:contain; background:transparent; display:block;";
            if(appSettings.iconAccount) document.getElementById('headerAccountBtn').innerHTML = `<img src="${appSettings.iconAccount}" style="${iconStyle}">`;
            if(appSettings.iconHelp) document.getElementById('headerHelpBtn').innerHTML = `<img src="${appSettings.iconHelp}" style="${iconStyle}">`;
            if(appSettings.iconCart) document.getElementById('headerCartBtn').innerHTML = `<img src="${appSettings.iconCart}" style="${iconStyle}">`;
        }

        if(currentUser) { wishlist = JSON.parse(localStorage.getItem('wishlist_' + currentUser.email)) || []; }

        renderHomePage(allProducts);
        renderTopBanners();
        updateCartUI();
        startIndividualTimers();
        startVerticalBannerSwipe(); 

    } catch (e) {
        console.error("❌ Data load error:", e);
        const dynamicContent = document.getElementById('dynamicContent');
        if (dynamicContent) dynamicContent.innerHTML = `<div style="text-align:center; padding:40px 20px; color:red;">Server se connect nahi ho pa raha. Refresh karein.</div>`;
    }
}

function renderHomePage(products) {
    const container = document.getElementById('dynamicContent');
    if(!container || !products) return;

    let html = '';
    const homeProducts = products.filter(p => p.category !== 'minutes' && p.category !== 'value365');
    
    // 1. Top 10 Products
    html += `<div class="grid">`;
    homeProducts.slice(0, 10).forEach((p, index) => { html += generateCardHtml(p, index === 1); });
    html += `</div>`;

    // 2. Recommendations (Amazon Style Header)
    html += `<div class="section-title">Recommended deals for you</div>`;
    html += `<div class="grid">`;
    homeProducts.slice(10, 20).forEach(p => { html += generateCardHtml(p, false); });
    html += `</div>`;

    container.innerHTML = html;
    startIndividualTimers();
}

function renderTopBanners() {
    const slider = document.getElementById('slider');
    if(!slider) return;
    const topBanners = allBanners.filter(b => b.type !== 'half');
    
    if(!topBanners || topBanners.length === 0) { 
        slider.innerHTML = `<img src="${defaultBanner}" alt="Banner">`; 
        return; 
    }
    
    slider.innerHTML = topBanners.map(b => {
        if (b.mediaType === 'video') {
            return `<video src="${b.imageUrl}" autoplay muted loop playsinline style="min-width:100%; height:100%; object-fit:cover;"></video>`;
        } else {
            return `<img src="${b.imageUrl}" alt="Banner">`;
        }
    }).join('');

    if(topBanners.length <= 1) return;
    let idx = 0;
    setInterval(() => {
        idx = (idx + 1) % topBanners.length;
        slider.style.transform = `translateX(-${idx * 100}%)`;
    }, 3000);
}

// MAGIC: Video rendering in Product Cards
function generateCardHtml(p, isBestSeller) {
    const rating = (Math.random() * (4.5 - 3.5) + 3.5).toFixed(1);
    const reviews = Math.floor(Math.random() * 2000) + 50;
    const oldPrice = p.oldPrice || p.price;
    const discount = Math.round(((oldPrice - p.price) / oldPrice) * 100) || 0;
    
    // Check Media Type (Video or Image)
    let mediaHtml = '';
    if (p.mediaType === 'video') {
        mediaHtml = `<video src="${p.imageUrl}" class="card-video" autoplay muted loop playsinline></video>`;
    } else {
        mediaHtml = `<img src="${p.imageUrl}" class="card-img" loading="lazy" onerror="this.src='${defaultBanner}'">`;
    }

    let actionButtons = `
        <button class="btn-add-meesho" onclick="event.stopPropagation(); addToCart('${p._id}')">Add</button>
        <button class="btn-buy-meesho" onclick="event.stopPropagation(); buyNowDirect('${p._id}')">Buy Now</button>
    `;
    if(p.stock <= 0) {
        actionButtons = `<button class="btn-add-meesho" style="background:#ccc; cursor:not-allowed; width:100%;">Out of Stock</button>`;
    }

    return `
        <div class="card">
            <div class="card-img-container" onclick="openProductPage('${p._id}')">
                ${mediaHtml}
                ${isBestSeller ? '<div class="best-seller-tag">Best seller</div>' : ''}
            </div>
            <div class="card-details" onclick="openProductPage('${p._id}')">
                <div class="brand-name">${p.category ? p.category.replace('_', ' ') : 'Indian'}</div>
                <div class="card-title">${p.name}</div>
                <div class="rating-row"><div class="rating">${rating} <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div><span class="review-count">(${reviews})</span></div>
                <div class="price-row"><span class="price">₹${p.price}</span><span class="old-price">₹${oldPrice}</span><span class="discount">(${discount}% off)</span></div>
                <div class="card-btn-group">${actionButtons}</div>
            </div>
        </div>
    `;
}

// ... (Baaki main.js ka code - Cart, Modals, Auth, Timers waise hi rahenge jo pehle the)
// Note: Main space bachane ke liye yahan short kar raha hu, purana baaki code same rakho.
function openProductPage(id) { window.location.href = `/product.html?id=${id}`; }
function addToCart(id) { const p = allProducts.find(x => x._id === id); if(!p) return; const exist = cart.find(x => x._id === id); if(exist) exist.qty++; else cart.push({...p, qty: 1}); localStorage.setItem('diwali_cart', JSON.stringify(cart)); alert("Added!"); updateCartUI(); }
function buyNowDirect(id) { addToCart(id); window.location.href = 'index.html?checkout=true'; }
function updateCartUI() { /* Purana code */ }
function openCart() { document.getElementById('cartModal').classList.add('open'); updateCartUI(); }
function closeCart() { document.getElementById('cartModal').classList.remove('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function goHome() { window.location.href = 'index.html'; }
function handleProfileClick() { window.location.href = 'profile.html'; }
function startIndividualTimers() { /* Purana code */ }
function startVerticalBannerSwipe() { /* Purana code */ }
// Baaki functions (Login, Register, Checkout, Orders) waise hi rakho!

loadData();
