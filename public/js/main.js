const API_URL = ""; 
let allProducts = [];
let allBanners = [];
let appSettings = {};
let cart = JSON.parse(localStorage.getItem('diwali_cart')) || [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let wishlist = [];
const defaultBanner = "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=800";

// ================= INITIALIZE =================
document.addEventListener('DOMContentLoaded', () => {
    if(typeof renderSearchBar === 'function') {
        renderSearchBar('search-bar-container');
    }
});

window.addEventListener('offline', () => { window.location.href = '/offline.html'; });

window.addEventListener('load', () => {
    if (!navigator.onLine) { window.location.href = '/offline.html'; return; }
    let savedLoc = localStorage.getItem('user_location');
    if(savedLoc && document.getElementById('headerLocationText')) {
        document.getElementById('headerLocationText').innerText = savedLoc + ' >';
    }
});

// ================= LOAD DATA =================
async function loadData() {
    console.log("🔄 Fetching data from server...");
    try {
        // 1. Fetch Products
        const prodRes = await fetch(`${API_URL}/api/products?limit=30`);
        if(!prodRes.ok) throw new Error(`Products API failed (Status: ${prodRes.status})`);
        let rawProducts = await prodRes.json();
        console.log("✅ Products fetched:", rawProducts.length);

        // Map _id and imageUrl
        allProducts = rawProducts.map(p => ({
            ...p,
            _id: p._id || p.id, 
            imageUrl: p.imageUrl || p.imageUrl1 || p.imageUrl2 || defaultBanner 
        }));

        // 2. Fetch Banners
        const bannerRes = await fetch(`${API_URL}/api/banners`);
        if(bannerRes.ok) {
            let rawBanners = await bannerRes.json();
            allBanners = rawBanners.map(b => ({
                ...b,
                _id: b._id || b.id,
                imageUrl: b.imageUrl || b.imageUrl1
            }));
        }

        // 3. Fetch Settings
        const settingsRes = await fetch(`${API_URL}/api/settings`);
        if(settingsRes.ok) {
            appSettings = await settingsRes.json();
        }

        // Apply Icons
        const tabs = document.querySelectorAll('.tab-box');
        if(tabs.length >= 4 && appSettings) {
            if(appSettings.tabWeekly) tabs[0].querySelector('img').src = appSettings.tabWeekly;
            if(appSettings.tabTravel) tabs[1].querySelector('img').src = appSettings.tabTravel;
            if(appSettings.tabValue365) tabs[2].querySelector('img').src = appSettings.tabValue365;
            if(appSettings.tabGifts) tabs[3].querySelector('img').src = appSettings.tabGifts;
        }
        if(appSettings) {
            const iconStyle = "width:24px; height:24px; object-fit:contain; background:transparent; display:block;";
            if(appSettings.iconAccount && document.getElementById('headerAccountBtn')) 
                document.getElementById('headerAccountBtn').innerHTML = `<img src="${appSettings.iconAccount}" style="${iconStyle}">`;
            if(appSettings.iconHelp && document.getElementById('headerHelpBtn')) 
                document.getElementById('headerHelpBtn').innerHTML = `<img src="${appSettings.iconHelp}" style="${iconStyle}">`;
            if(appSettings.iconCart && document.getElementById('headerCartBtn')) 
                document.getElementById('headerCartBtn').innerHTML = `<img src="${appSettings.iconCart}" style="${iconStyle}">`;
        }

        // RENDER UI
        if(allProducts.length > 0) {
            renderHomePage(allProducts);
        } else {
            document.getElementById('dynamicContent').innerHTML = `<div style="text-align:center; padding:40px; color:#666;">Abhi koi products available nahi hain.</div>`;
        }

        renderTopBanners();
        updateCartUI();
        
        if (typeof startIndividualTimers === 'function') startIndividualTimers();
        if (typeof startVerticalBannerSwipe === 'function') startVerticalBannerSwipe();

    } catch (e) {
        console.error("❌ Data load error:", e);
        const dynamicContent = document.getElementById('dynamicContent');
        if (dynamicContent) {
            dynamicContent.innerHTML = `
                <div style="text-align:center; padding:40px 20px; color:red; font-family:sans-serif; background:#fff; border-radius:10px; margin:15px;">
                    <h3 style="margin-bottom:10px;">Data Load Error!</h3>
                    <p style="background:#ffe6e6; padding:10px; border-radius:8px; font-size:14px; word-break:break-all;">
                        <b>${e.message}</b>
                    </p>
                    <p style="font-size:12px; color:#666;">Kripya F12 dabakar Console check karein.</p>
                    <button onclick="window.location.reload()" style="margin-top:15px; padding:10px 20px; background:#2874f0; color:white; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">Refresh Karein</button>
                </div>
            `;
        }
    }
}

// ================= HOME PAGE RENDER =================
function renderHomePage(products) {
    const container = document.getElementById('dynamicContent');
    if(!container || !products) return;

    let html = '';

    function createCategorySection(title, categoryKey) {
        const prods = products.filter(p => p.category === categoryKey);
        if(prods.length === 0) return '';
        return `
            <div class="category-section" style="margin-bottom: 20px;">
                <div class="category-header" style="display:flex; justify-content:space-between; padding: 0 15px; margin-bottom: 10px;">
                    <h3 style="font-size:18px; margin:0; font-weight:700;">${title}</h3>
                    <span onclick="window.location.href='/category.html'" style="font-size:13px; color:var(--primary-blue); font-weight:600;">View All ></span>
                </div>
                <div class="h-scroll" style="display:flex; overflow-x:auto; gap:10px; padding: 0 15px 10px 15px; scrollbar-width:none;">
                    ${prods.slice(0, 6).map(p => `<div style="min-width: 140px; max-width: 140px;">${generateCardHtml(p, false)}</div>`).join('')}
                </div>
            </div>
        `;
    }

    const allHalfBanners = allBanners.filter(b => b.type === 'half');
    let bannerGroups = [[], [], []];
    allHalfBanners.forEach((b, index) => { bannerGroups[index % 3].push(b); });

    function createVerticalHalfBanner(groupIndex, delayTime) {
        const bannersForSlot = bannerGroups[groupIndex];
        if(bannersForSlot.length === 0) return '';
        let slidesHtml = '';
        bannersForSlot.forEach(b => {
            if(b.mediaType === 'video') {
                slidesHtml += `<div class="vertical-slide" onclick="redirectToProduct()"><video src="${b.imageUrl}" autoplay muted loop playsinline style="width:100%; height:100%; object-fit:cover;"></video></div>`;
            } else {
                slidesHtml += `<div class="vertical-slide" onclick="redirectToProduct()"><img src="${b.imageUrl}" style="width:100%; height:100%; object-fit:cover;"></div>`;
            }
        });
        return `
            <div class="mid-ad-banner vertical-slider-container" data-delay="${delayTime}" style="width:calc(100% - 30px); margin: 10px 15px; height:90px; overflow:hidden; border-radius:12px; position:relative;">
                <div class="vertical-slider-track" style="display:flex; flex-direction:column; transition:transform 0.5s ease-in-out;">${slidesHtml}</div>
            </div>
        `;
    }

    const homeProducts = products.filter(p => p.category !== 'minutes' && p.category !== 'value365');

    html += `<div class="grid">`;
    homeProducts.slice(0, 10).forEach((p, index) => { html += generateCardHtml(p, index === 1); });
    html += `</div>`;

    html += createVerticalHalfBanner(0, 3000);
    html += createCategorySection("Boy Fashion", "boy_fashion");
    html += createCategorySection("Children Fashion", "children_fashion");
    html += createCategorySection("Man Fashion", "man_fashion");
    html += createCategorySection("Women's Clothes", "clothes");
    html += createVerticalHalfBanner(1, 4500);
    html += createCategorySection("Buy for Electronics", "electronics");
    html += createCategorySection("Our Festival", "festival");
    html += createCategorySection("Grocery Essentials", "minutes");
    html += createVerticalHalfBanner(2, 6000);
    html += createCategorySection("Daily Uses", "daily_uses");

    if(homeProducts.length > 10) {
        html += `<div class="section-title">Recommended deals for you</div>`;
        html += `<div class="grid">`;
        homeProducts.slice(10).forEach(p => { html += generateCardHtml(p, false); });
        html += `</div>`;
    }

    container.innerHTML = html;
}

// ================= CARDS & BANNERS =================
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

function generateCardHtml(p, isBestSeller) {
    const rating = (Math.random() * (4.5 - 3.5) + 3.5).toFixed(1);
    const reviews = Math.floor(Math.random() * 2000) + 50;
    const oldPrice = p.oldPrice || p.price;
    const discount = Math.round(((oldPrice - p.price) / oldPrice) * 100) || 0;

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
        <div class="card" style="align-self: start;">
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

// ================= NAVIGATION & UTILS =================
function openProductPage(id) { window.location.href = `/product.html?id=${id}`; }
function goHome() { window.location.href = '/index.html'; }
function handleProfileClick() { window.location.href = '/profile.html'; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function redirectToProduct() { if (allProducts && allProducts.length > 0) window.location.href = `/product.html?id=${allProducts[0]._id}`; }

// ================= CART & AUTH =================
function openCart() { document.getElementById('cartModal').classList.add('open'); updateCartUI(); }
function closeCart() { document.getElementById('cartModal').classList.remove('open'); }

function addToCart(id) {
    const p = allProducts.find(x => x._id === id);
    if(!p) return;
    if(p.stock <= 0) return alert("Out of Stock!");
    const exist = cart.find(x => x._id === id);
    if(exist) exist.qty++;
    else cart.push({...p, qty: 1});
    localStorage.setItem('diwali_cart', JSON.stringify(cart));
    alert("✅ Added to Cart!");
    updateCartUI();
}

function buyNowDirect(id) { addToCart(id); window.location.href = '/index.html?checkout=true'; }

function updateCartUI() {
    cart = JSON.parse(localStorage.getItem('diwali_cart')) || [];
    const list = document.getElementById('cartList');
    if(!list) return;
    let totalPrice = 0;
    list.innerHTML = '';
    if(cart.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding:20px; color:#777;">Your cart is empty.</p>';
    } else {
        cart.forEach((item, index) => {
            totalPrice += item.price * item.qty;
            list.innerHTML += `
            <div class="cart-item">
                <img src="${item.imageUrl}">
                <div style="flex:1;">
                    <div style="font-size:14px; font-weight:600; color:#333;">${item.name}</div>
                    <div style="font-size:12px; color:#777;">Qty: ${item.qty}</div>
                    <div style="font-weight:700; margin-top:5px; color:var(--primary-blue);">₹${item.price * item.qty}</div>
                </div>
                <button onclick="removeFromCart(${index})" style="border:none; background:none; color:red; font-size:12px; cursor:pointer;">Remove</button>
            </div>`;
        });
    }
    document.getElementById('cartTotal').innerText = `₹${totalPrice}`;
}

function removeFromCart(index) { cart.splice(index, 1); localStorage.setItem('diwali_cart', JSON.stringify(cart)); updateCartUI(); }

// Initialize App
loadData();
