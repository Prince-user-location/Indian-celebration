const API_URL = "";
let allProducts = [];
let allBanners = [];
let appSettings = {};
let cart = JSON.parse(localStorage.getItem('diwali_cart')) || [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let wishlist = [];
const defaultBanner = "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=800";

/* ==========================================================
   BANNER COLOR -> HEADER GRADIENT
   ========================================================== */
const DEFAULT_BANNER_COLOR = '#4f8fd8';
const bannerColorCache = {};

function applyBannerColor(color) {
    // body pe set karte hain taaki CSS ka smooth transition chale
    if (document.body) document.body.style.setProperty('--banner-color', color);
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h /= 6;
    }
    return [h, s, l];
}

// Average color nikalta hai, phir usko header ke liye achha (na bahut dark, na bahut phika) bana deta hai
function extractColorFromDrawable(drawable) {
    const size = 24;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(drawable, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data; // cross-origin hua to yahan error aayega (catch me handle hoga)
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 100) continue;
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (lum < 25 || lum > 235) continue; // kaala aur safed ignore
        r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
    if (n === 0) return DEFAULT_BANNER_COLOR;
    let [h, s, l] = rgbToHsl(r / n, g / n, b / n);
    s = Math.min(0.85, Math.max(s, 0.45));
    l = Math.min(0.58, Math.max(l, 0.38));
    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

function getColorForUrl(url) {
    if (!url) return Promise.resolve(DEFAULT_BANNER_COLOR);
    if (bannerColorCache[url]) return Promise.resolve(bannerColorCache[url]);
    return new Promise(resolve => {
        const probe = new Image();
        probe.crossOrigin = 'anonymous'; // sirf color nikalne ke liye alag image, asli banner pe asar nahi
        probe.onload = () => {
            try {
                bannerColorCache[url] = extractColorFromDrawable(probe);
            } catch (e) {
                bannerColorCache[url] = DEFAULT_BANNER_COLOR;
            }
            resolve(bannerColorCache[url]);
        };
        probe.onerror = () => { bannerColorCache[url] = DEFAULT_BANNER_COLOR; resolve(DEFAULT_BANNER_COLOR); };
        probe.src = url;
    });
}

// Use: setBannerColor(imgElement) ya setBannerColor('https://...jpg') ya setBannerColor('#ff9900')
async function setBannerColor(source) {
    try {
        if (!source) { applyBannerColor(DEFAULT_BANNER_COLOR); return; }
        if (typeof source === 'string') {
            const isColor = source.startsWith('#') || source.startsWith('rgb') || source.startsWith('hsl');
            applyBannerColor(isColor ? source : await getColorForUrl(source));
            return;
        }
        if (source.tagName === 'VIDEO') {
            try { applyBannerColor(extractColorFromDrawable(source)); }
            catch (e) { applyBannerColor(DEFAULT_BANNER_COLOR); }
            return;
        }
        applyBannerColor(await getColorForUrl(source.currentSrc || source.src));
    } catch (e) {
        applyBannerColor(DEFAULT_BANNER_COLOR);
    }
}

/* ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) { splash.classList.add('fade-out'); setTimeout(() => { splash.style.display = 'none'; }, 500); }
    }, 1500);

    if (typeof renderSearchBar === 'function') renderSearchBar('search-bar-container');
    checkUrlRedirects();
    if (!navigator.onLine) { window.location.href = 'offline.html'; return; }
    const savedLoc = localStorage.getItem('user_location');
    const locEl = document.getElementById('headerLocationText');
    if (savedLoc && locEl) locEl.innerText = savedLoc + ' >';
    loadData(0);
});

window.addEventListener('offline', () => { window.location.href = 'offline.html'; });

function openLocationModal() {
    const m = document.getElementById('locationModal');
    if (m) m.classList.add('open');
}

function saveLocation() {
    const pin = document.getElementById('locPincode').value;
    const city = document.getElementById('locCity').value;
    if (!pin || !city) return alert("Please enter Pincode and City");
    localStorage.setItem('user_location', `${city} - ${pin}`);
    const locEl = document.getElementById('headerLocationText');
    if (locEl) locEl.innerText = `${city} - ${pin} >`;
    closeModal('locationModal');
}

const fetchWithTimeout = (url, options = {}, timeout = 15000) => {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request Timeout')), timeout))
    ]);
};

async function loadData(retryCount = 0) {
    try {
        const [prodRes, bannerRes, settingsRes] = await Promise.all([
            fetchWithTimeout(`${API_URL}/api/products?limit=40`),
            fetchWithTimeout(`${API_URL}/api/banners`),
            fetchWithTimeout(`${API_URL}/api/settings`)
        ]);

        allProducts = await prodRes.json();
        allBanners = await bannerRes.json();
        appSettings = await settingsRes.json();
        if (!Array.isArray(allProducts)) allProducts = [];
        if (!Array.isArray(allBanners)) allBanners = [];
        if (!appSettings || typeof appSettings !== 'object') appSettings = {};

        try {
            const tabs = document.querySelectorAll('.tab-box');
            if (tabs.length >= 4) {
                const setTab = (i, url) => { const im = tabs[i].querySelector('img'); if (url && im) im.src = url; };
                setTab(0, appSettings.tabWeekly);
                setTab(1, appSettings.tabTravel);
                setTab(2, appSettings.tabValue365);
                setTab(3, appSettings.tabGifts);
            }
            const iconStyle = "width:24px; height:24px; object-fit:contain; background:transparent; display:block;";
            const setIcon = (id, url) => {
                const el = document.getElementById(id);
                if (url && el) el.innerHTML = `<img src="${url}" style="${iconStyle}">`;
            };
            setIcon('headerAccountBtn', appSettings.iconAccount);
            setIcon('headerHelpBtn', appSettings.iconHelp);
            setIcon('headerCartBtn', appSettings.iconCart);
        } catch (e) { console.error("Icon Error:", e); }

        if (currentUser) { wishlist = JSON.parse(localStorage.getItem('wishlist_' + currentUser.email)) || []; }

        renderHomePage(allProducts);
        renderTopBanners();
        updateCartUI();
        startIndividualTimers();
        startVerticalBannerSwipe();

    } catch (e) {
        console.error(`❌ Attempt ${retryCount + 1} failed:`, e);
        const dynamicContent = document.getElementById('dynamicContent');
        if (!navigator.onLine) { window.location.href = 'offline.html'; return; }

        if (retryCount < 3) {
            if (dynamicContent) {
                dynamicContent.innerHTML = `
                    <div style="text-align:center; padding:40px 20px;">
                        <div style="border: 3px solid #f3f3f3; border-top: 3px solid #e47911; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto 15px auto;"></div>
                        <h3 style="color:#0f1111; font-size:16px;">Connecting to Server...</h3>
                        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
                    </div>`;
            }
            setTimeout(() => loadData(retryCount + 1), 3000);
        } else {
            if (dynamicContent) {
                dynamicContent.innerHTML = `
                    <div style="text-align:center; padding:40px 20px; background:#ffebee; border:1px dashed #d32f2f; border-radius:8px; margin:15px;">
                        <h3 style="color:#d32f2f; font-size:16px; margin-bottom:5px;">Server se connect nahi ho pa raha</h3>
                        <button onclick="window.location.reload()" style="margin-top:15px; padding:10px 20px; background:#ffd814; color:#0f1111; border:none; border-radius:20px; font-weight:600;">Retry Now</button>
                    </div>`;
            }
        }
    }
}

function renderHomePage(products) {
    const container = document.getElementById('dynamicContent');
    if (!container || !products) return;

    let html = '';

    function createCategorySection(title, categoryKey) {
        const prods = products.filter(p => p.category === categoryKey);
        if (prods.length === 0) return '';
        return `
            <div class="category-section" style="margin-bottom: 16px;">
                <div class="category-header" style="display:flex; justify-content:space-between; align-items:center; padding: 0 14px; margin-bottom: 8px;">
                    <h3 style="font-size:18px; margin:0; font-weight:700;">${title}</h3>
                    <span onclick="window.location.href='category.html'" style="font-size:13px; color:#007185; font-weight:600; cursor:pointer;">View All ></span>
                </div>
                <div class="h-scroll" style="display:flex; overflow-x:auto; gap:10px; padding: 0 14px 10px 14px; scrollbar-width:none;">
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
        if (bannersForSlot.length === 0) return '';
        let slidesHtml = '';
        bannersForSlot.forEach(b => {
            if (b.mediaType === 'video') {
                slidesHtml += `<div class="vertical-slide" onclick="redirectToProduct()"><video src="${b.imageUrl}" autoplay muted loop playsinline style="width:100%; height:100%; object-fit:cover;"></video></div>`;
            } else {
                slidesHtml += `<div class="vertical-slide" onclick="redirectToProduct()"><img src="${b.imageUrl}" style="width:100%; height:100%; object-fit:cover;"></div>`;
            }
        });
        return `
            <div class="mid-ad-banner vertical-slider-container" data-delay="${delayTime}" style="width:calc(100% - 28px); margin: 10px 14px; height:90px; overflow:hidden; border-radius:10px; position:relative;">
                <div class="vertical-slider-track" style="display:flex; flex-direction:column; transition:transform 0.5s ease-in-out;">${slidesHtml}</div>
            </div>
        `;
    }

    const homeProducts = products.filter(p => p.category !== 'minutes' && p.category !== 'value365');

    html += `<div class="grid">`;
    homeProducts.slice(0, 10).forEach((p, index) => { html += generateCardHtml(p, index === 1); });
    html += `</div>`;

    // KEEP SHOPPING SECTION (AMAZON STYLE)
    const keepShoppingIds = appSettings.keepShoppingProductIds ? String(appSettings.keepShoppingProductIds).split(',').map(id => id.trim()) : [];
    let keepProducts = [];

    if (keepShoppingIds.length > 0) {
        keepProducts = products.filter(p => keepShoppingIds.includes(p._id));
    } else {
        keepProducts = products.slice(10, 16);
    }

    if (keepProducts.length > 0) {
        html += `
            <div class="keep-shopping-section" style="margin: 12px 0;">
                <div class="keep-shopping-scroll">
                    ${keepProducts.map(p => `
                        <div class="keep-shopping-card" onclick="openProductPage('${p._id}')">
                            <div class="keep-shopping-card-title">
                                Keep shopping for<br>
                                <span style="font-size:12px; font-weight:500; color:#565959; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; width:100%;">${p.name}</span>
                            </div>
                            <img src="${p.imageUrl}" class="keep-shopping-card-img" onerror="this.src='${defaultBanner}'">
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Aage ke sections
    if (typeof getAmazonAutoHTML === 'function') { html += getAmazonAutoHTML(products); }
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

    if (homeProducts.length > 10) {
        html += `<div class="section-title">Recommended deals for you</div>`;
        html += `<div class="grid">`;
        homeProducts.slice(10).forEach(p => { html += generateCardHtml(p, false); });
        html += `</div>`;
    }

    container.innerHTML = html;
    startIndividualTimers();
}

/* ==========================================================
   TOP BANNER SLIDER (header color banner ke saath badalta hai)
   ========================================================== */
function renderTopBanners() {
    const slider = document.getElementById('slider');
    if (!slider) return;
    const topBanners = allBanners.filter(b => b.type !== 'half');

    if (window.bannerInterval) { clearInterval(window.bannerInterval); window.bannerInterval = null; }
    slider.style.transform = 'translateX(0)';

    if (!topBanners || topBanners.length === 0) {
        slider.innerHTML = `<img src="${defaultBanner}" alt="Banner">`;
        setBannerColor(defaultBanner);
        return;
    }

    slider.innerHTML = topBanners.map(b => {
        if (b.mediaType === 'video') {
            return `<video src="${b.imageUrl}" autoplay muted loop playsinline style="min-width:100%; height:100%; object-fit:cover;"></video>`;
        } else {
            return `<img src="${b.imageUrl}" alt="Banner">`;
        }
    }).join('');

    // Dots
    const box = slider.parentElement;
    let dotsEl = null;
    if (box) {
        const old = box.querySelector('.banner-dots');
        if (old) old.remove();
        if (topBanners.length > 1) {
            dotsEl = document.createElement('div');
            dotsEl.className = 'banner-dots';
            dotsEl.innerHTML = topBanners.map((_, i) => `<span class="${i === 0 ? 'active' : ''}"></span>`).join('');
            box.appendChild(dotsEl);
        }
    }

    const slides = slider.children;
    const colorForSlide = (i) => { if (slides[i]) setBannerColor(slides[i]); };

    // Pehli slide ka color
    colorForSlide(0);

    if (topBanners.length <= 1) return;
    let idx = 0;
    window.bannerInterval = setInterval(() => {
        idx = (idx + 1) % topBanners.length;
        slider.style.transform = `translateX(-${idx * 100}%)`;
        colorForSlide(idx);
        if (dotsEl) {
            dotsEl.querySelectorAll('span').forEach((d, i) => d.classList.toggle('active', i === idx));
        }
    }, 3000);
}

function startVerticalBannerSwipe() {
    if (window.verticalIntervals) window.verticalIntervals.forEach(clearInterval);
    window.verticalIntervals = [];
    const containers = document.querySelectorAll('.vertical-slider-container');
    containers.forEach(container => {
        const track = container.querySelector('.vertical-slider-track');
        if (!track) return;
        const slides = track.querySelectorAll('.vertical-slide');
        if (slides.length <= 1) return;
        let index = 0;
        const delay = parseInt(container.getAttribute('data-delay')) || 3000;
        const id = setInterval(() => {
            index = (index + 1) % slides.length;
            track.style.transform = `translateY(-${index * 90}px)`;
        }, delay);
        window.verticalIntervals.push(id);
    });
}

function generateCardHtml(p, isBestSeller) {
    const rating = (Math.random() * (4.5 - 3.5) + 3.5).toFixed(1);
    const reviews = Math.floor(Math.random() * 2000) + 50;
    const oldPrice = p.oldPrice || p.price;
    const discount = Math.max(0, Math.round(((oldPrice - p.price) / oldPrice) * 100) || 0);

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
    if (p.stock <= 0) {
        actionButtons = `<button class="btn-add-meesho" style="background:#ccc; cursor:not-allowed; width:100%;">Out of Stock</button>`;
    }

    // Discount ya old price tabhi dikhao jab sach me discount ho
    const priceExtra = discount > 0
        ? `<span class="old-price">₹${oldPrice}</span><span class="discount">(${discount}% off)</span>`
        : '';

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
                <div class="price-row"><span class="price">₹${p.price}</span>${priceExtra}</div>
                <div class="card-btn-group">${actionButtons}</div>
            </div>
        </div>
    `;
}

function openProductPage(id) { window.location.href = `/product.html?id=${id}`; }
function goHome() { window.location.href = 'index.html'; }
function handleProfileClick() { window.location.href = 'profile.html'; }
function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('open'); }
function redirectToProduct() { if (allProducts && allProducts.length > 0) window.location.href = `/product.html?id=${allProducts[0]._id}`; }

function switchCategory(cat, el) {
    document.querySelectorAll('.cat-menu-item').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
    const filtered = allProducts.filter(p => p.category === cat);
    const grid = document.getElementById('categoryGrid');
    if (!grid) return;
    if (filtered.length === 0) { grid.innerHTML = '<p style="grid-column: span 2; text-align:center; padding:20px;">No products found.</p>'; return; }
    let html = '';
    filtered.forEach((p) => { html += generateCardHtml(p, false); });
    grid.innerHTML = html;
}

function openCart() {
    const m = document.getElementById('cartModal');
    if (m) m.classList.add('open');
    updateCartUI();
}
function closeCart() {
    const m = document.getElementById('cartModal');
    if (m) m.classList.remove('open');
}

function addToCart(id) {
    const p = allProducts.find(x => x._id === id);
    if (!p) return;
    if (p.stock <= 0) return alert("Out of Stock!");
    cart = JSON.parse(localStorage.getItem('diwali_cart')) || [];
    const exist = cart.find(x => x._id === id);
    if (exist) exist.qty++;
    else cart.push({ ...p, qty: 1 });
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
    if (!list) return;
    let totalPrice = 0;
    let listHtml = '';
    if (cart.length === 0) {
        listHtml = '<p style="text-align:center; padding:20px; color:#777;">Your cart is empty.</p>';
    } else {
        cart.forEach((item, index) => {
            totalPrice += item.price * item.qty;
            listHtml += `
            <div class="cart-item">
                <img src="${item.imageUrl}">
                <div style="flex:1;">
                    <div style="font-size:14px; font-weight:600; color:#333;">${item.name}</div>
                    <div style="font-size:12px; color:#777;">Qty: ${item.qty}</div>
                    <div style="font-weight:700; margin-top:5px; color:#0f1111;">₹${item.price * item.qty}</div>
                </div>
                <button onclick="removeFromCart(${index})" style="border:none; background:none; color:#b12704; font-size:12px; cursor:pointer;">Remove</button>
            </div>`;
        });
    }
    list.innerHTML = listHtml;
    const totalEl = document.getElementById('cartTotal');
    if (totalEl) totalEl.innerText = `₹${totalPrice}`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('diwali_cart', JSON.stringify(cart));
    updateCartUI();
}

function startIndividualTimers() {
    if (window.timerInterval) clearInterval(window.timerInterval);
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

function checkUrlRedirects() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('checkout') === 'true') {
        window.history.replaceState({}, document.title, window.location.pathname);
        const checkout = document.getElementById('checkout-page');
        if (checkout) {
            document.querySelectorAll('.full-page').forEach(el => el.style.display = 'none');
            checkout.style.display = 'flex';
        }
    }
    if (urlParams.get('login') === 'true') {
        window.history.replaceState({}, document.title, window.location.pathname);
        const auth = document.getElementById('auth-page');
        if (!currentUser && auth) {
            const home = document.getElementById('home-page');
            if (home) home.style.display = 'none';
            document.querySelectorAll('.full-page').forEach(el => el.style.display = 'none');
            auth.style.display = 'flex';
        }
    }
    if (urlParams.get('cart') === 'true') {
        window.history.replaceState({}, document.title, window.location.pathname);
        openCart();
    }
}
