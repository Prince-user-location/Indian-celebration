const API_URL = "";
let allProducts = [];
let allBanners = [];
let appSettings = {}; 
let cart = JSON.parse(localStorage.getItem('diwali_cart')) || [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let wishlist = [];
const defaultBanner = "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=800";

// ================= GLOBAL ERROR HANDLER =================
// Agar code me koi error aaye toh screen par dikhao taaki pata chale
window.onerror = function(msg, url, line, col, error) {
    console.error("❌ JS Error:", msg, "at line", line);
    const splash = document.getElementById('splash-screen');
    if (splash) splash.style.display = 'none'; // Force hide splash
    
    const dynamicContent = document.getElementById('dynamicContent');
    if (dynamicContent && dynamicContent.innerHTML === "") {
        dynamicContent.innerHTML = `<div style="color:red; padding:20px; text-align:center; background:#fff;">
            <h3>Kuch Error Aa Gaya Hai</h3>
            <p style="font-size:12px;">${msg} (Line: ${line})</p>
            <button onclick="window.location.reload()" style="margin-top:10px; padding:10px;">Refresh</button>
        </div>`;
    }
};

// ================= INITIALIZE =================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Hide Splash Screen (Hamesha hide hoga chahe kuch bhi ho)
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) { 
            splash.classList.add('fade-out'); 
            setTimeout(() => { splash.style.display = 'none'; }, 500); 
        }
    }, 1500); // 1.5 seconds

    // 2. Load Search Bar
    try {
        if(typeof renderSearchBar === 'function') {
            renderSearchBar('search-bar-container');
        } else {
            console.warn("Search bar function not found. Check search.js");
        }
    } catch(e) { console.error("Search Bar Error:", e); }

    // 3. Check URL for redirects (Login, Checkout)
    try {
        checkUrlRedirects();
    } catch(e) { console.error("URL Redirect Error:", e); }

    // 4. Offline Check
    if (!navigator.onLine) {
        window.location.href = 'offline.html';
        return;
    }

    // 5. Load Location
    let savedLoc = localStorage.getItem('user_location');
    if(savedLoc && document.getElementById('headerLocationText')) {
        document.getElementById('headerLocationText').innerText = savedLoc + ' >';
    }

    // 6. Fetch Data
    loadData(0);
});

window.addEventListener('offline', () => { window.location.href = 'offline.html'; });

// ================= LOCATION =================
function openLocationModal() { document.getElementById('locationModal').classList.add('open'); }

function saveLocation() {
    const pin = document.getElementById('locPincode').value;
    const city = document.getElementById('locCity').value;
    if(!pin || !city) return alert("Please enter Pincode and City");
    localStorage.setItem('user_location', `${city} - ${pin}`);
    document.getElementById('headerLocationText').innerText = `${city} - ${pin} >`;
    closeModal('locationModal');
}

// ================= FETCH WITH TIMEOUT =================
const fetchWithTimeout = (url, options = {}, timeout = 15000) => {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request Timeout')), timeout))
    ]);
};

// ================= LOAD DATA (ROBUST) =================
async function loadData(retryCount = 0) {
    try {
        console.log(`⏳ Fetching data... Attempt ${retryCount + 1}`);
        
        const [prodRes, bannerRes, settingsRes] = await Promise.all([
            fetchWithTimeout(`${API_URL}/api/products?limit=30`), 
            fetchWithTimeout(`${API_URL}/api/banners`),
            fetchWithTimeout(`${API_URL}/api/settings`)
        ]);
        
        if(!prodRes.ok) throw new Error("Products API failed");
        if(!bannerRes.ok) throw new Error("Banners API failed");
        if(!settingsRes.ok) throw new Error("Settings API failed");

        allProducts = await prodRes.json();
        allBanners = await bannerRes.json();
        appSettings = await settingsRes.json();

        console.log("✅ Data loaded successfully!");

        // Apply Tab Icons
        try {
            const tabs = document.querySelectorAll('.tab-box');
            if(tabs.length >= 4 && appSettings) {
                if(appSettings.tabWeekly) tabs[0].querySelector('img').src = appSettings.tabWeekly;
                if(appSettings.tabTravel) tabs[1].querySelector('img').src = appSettings.tabTravel;
                if(appSettings.tabValue365) tabs[2].querySelector('img').src = appSettings.tabValue365;
                if(appSettings.tabGifts) tabs[3].querySelector('img').src = appSettings.tabGifts;
            }
        } catch(e) { console.error("Tab Icons Error:", e); }

        // Apply Header Icons
        try {
            if(appSettings) {
                const iconStyle = "width:24px; height:24px; object-fit:contain; background:transparent; display:block;";
                if(appSettings.iconAccount) document.getElementById('headerAccountBtn').innerHTML = `<img src="${appSettings.iconAccount}" style="${iconStyle}">`;
                if(appSettings.iconHelp) document.getElementById('headerHelpBtn').innerHTML = `<img src="${appSettings.iconHelp}" style="${iconStyle}">`;
                if(appSettings.iconCart) document.getElementById('headerCartBtn').innerHTML = `<img src="${appSettings.iconCart}" style="${iconStyle}">`;
            }
        } catch(e) { console.error("Header Icons Error:", e); }

        if(currentUser) { wishlist = JSON.parse(localStorage.getItem('wishlist_' + currentUser.email)) || []; }

        // Render Everything Safely
        try { renderHomePage(allProducts); } catch(e) { console.error("Home Render Error:", e); }
        try { renderTopBanners(); } catch(e) { console.error("Banner Render Error:", e); }
        try { updateCartUI(); } catch(e) { console.error("Cart UI Error:", e); }
        try { startIndividualTimers(); } catch(e) { console.error("Timer Error:", e); }
        try { startVerticalBannerSwipe(); } catch(e) { console.error("Vertical Banner Error:", e); }

    } catch (e) {
        console.error(`❌ Attempt ${retryCount + 1} failed:`, e);
        
        const dynamicContent = document.getElementById('dynamicContent');
        
        if (!navigator.onLine) { window.location.href = 'offline.html'; return; }

        if (retryCount < 3) {
            if (dynamicContent) {
                dynamicContent.innerHTML = `
                    <div style="text-align:center; padding:40px 20px;">
                        <div style="border: 3px solid #f3f3f3; border-top: 3px solid #2874f0; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto 15px auto;"></div>
                        <h3 style="color:#2874f0; font-size:16px;">Connecting to Server...</h3>
                        <p style="color:#666; font-size:13px;">Attempt ${retryCount + 1} of 3. Please wait.</p>
                        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
                    </div>`;
            }
            setTimeout(() => loadData(retryCount + 1), 3000);
        } else {
            if (dynamicContent) {
                dynamicContent.innerHTML = `
                    <div style="text-align:center; padding:40px 20px; background:#ffebee; border:1px dashed #d32f2f; border-radius:8px; margin:15px;">
                        <h3 style="color:#d32f2f; font-size:16px; margin-bottom:5px;">Server se connect nahi ho pa raha</h3>
                        <p style="color:#666; font-size:13px;">Kripya internet check karein ya thodi der baad refresh karein.</p>
                        <button onclick="window.location.reload()" style="margin-top:15px; padding:10px 20px; background:#2874f0; color:white; border:none; border-radius:5px; font-weight:bold;">Retry Now</button>
                    </div>`;
            }
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
                    <span onclick="window.location.href='category.html'" style="font-size:13px; color:var(--primary-blue); font-weight:600;">View All ></span>
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

    if (typeof getAmazonAutoHTML === 'function') { html += getAmazonAutoHTML(products); }
    html += createVerticalHalfBanner(0, 3000); 

    html += createCategorySection("Boy Fashion", "boy_fashion");
    html += createCategorySection("Children Fashion", "children_fashion");
    html += createCategorySection("Man Fashion", "man_fashion");
    html += createCategorySection("Women's Clothes", "clothes"); 

    if (typeof getAmazonAutoHTML === 'function') { html += getAmazonAutoHTML(products); }
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
    startIndividualTimers();
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

function startVerticalBannerSwipe() {
    const containers = document.querySelectorAll('.vertical-slider-container');
    containers.forEach(container => {
        const track = container.querySelector('.vertical-slider-track');
        const slides = track.querySelectorAll('.vertical-slide');
        if(slides.length <= 1) return; 
        let index = 0;
        let delay = parseInt(container.getAttribute('data-delay')) || 3000;
        setInterval(() => {
            index = (index + 1) % slides.length;
            track.style.transform = `translateY(-${index * 90}px)`;
        }, delay);
    });
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

// ================= UTILITIES & CART =================
function openProductPage(id) { window.location.href = `/product.html?id=${id}`; }
function goHome() { window.location.href = 'index.html'; }
function handleProfileClick() { window.location.href = 'profile.html'; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function redirectToProduct() { if (allProducts && allProducts.length > 0) window.location.href = `/product.html?id=${allProducts[0]._id}`; }

function switchCategory(cat, el) { 
    document.querySelectorAll('.cat-menu-item').forEach(c => c.classList.remove('active')); 
    if(el) el.classList.add('active'); 
    const filtered = allProducts.filter(p => p.category === cat); 
    const grid = document.getElementById('categoryGrid'); 
    if(!grid) return;
    if(filtered.length === 0) { grid.innerHTML = '<p style="grid-column: span 2; text-align:center; padding:20px;">No products found.</p>'; return; } 
    let html = ''; 
    filtered.forEach((p) => { html += generateCardHtml(p, false); }); 
    grid.innerHTML = html; 
}

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

function buyNowDirect(id) { 
    addToCart(id); 
    window.location.href = 'index.html?checkout=true'; 
}

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

function removeFromCart(index) { 
    cart.splice(index, 1); 
    localStorage.setItem('diwali_cart', JSON.stringify(cart)); 
    updateCartUI(); 
}

function startIndividualTimers() { 
    if(window.timerInterval) clearInterval(window.timerInterval); 
    window.timerInterval = setInterval(() => { 
        const now = Date.now(); 
        document.querySelectorAll('.timer').forEach(el => { 
            const endTime = parseInt(el.getAttribute('data-endtime')); 
            if (!endTime) return; 
            const diff = endTime - now; 
            if (diff <= 0) { el.innerText = "Ended"; return; } 
            const h = Math.floor((diff / (1000 * 60 * 60)) % 24); 
            const m = Math.floor((diff / 1000 / 60) % 60); 
            const s = Math.floor((diff / 1000) % 60); 
            el.innerText = `Ends in ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; 
        }); 
    }, 1000); 
}

// ================= URL REDIRECTS =================
function checkUrlRedirects() { 
    const urlParams = new URLSearchParams(window.location.search); 
    if(urlParams.get('checkout') === 'true') { 
        window.history.replaceState({}, document.title, window.location.pathname); 
        document.querySelectorAll('.full-page').forEach(el => el.style.display = 'none'); 
        document.getElementById('checkout-page').style.display = 'flex'; 
    }
    if(urlParams.get('login') === 'true') {
        window.history.replaceState({}, document.title, window.location.pathname);
        if(!currentUser) {
            document.getElementById('home-page').style.display = 'none'; 
            document.querySelectorAll('.full-page').forEach(el => el.style.display = 'none'); 
            document.getElementById('auth-page').style.display = 'flex'; 
        }
    }
    if(urlParams.get('cart') === 'true') {
        window.history.replaceState({}, document.title, window.location.pathname);
        openCart();
    }
}
