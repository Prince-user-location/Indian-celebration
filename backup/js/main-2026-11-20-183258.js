const API_URL = "";
let allProducts = [];
let allBanners = [];
let cart = JSON.parse(localStorage.getItem('diwali_cart')) || [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let checkoutAddress = "";
let wishlist = [];
const defaultBanner = "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=800";

// ================= LOCATION SETUP =================
window.addEventListener('load', () => {
    let savedLoc = localStorage.getItem('user_location');
    if(savedLoc && document.getElementById('headerLocationText')) {
        document.getElementById('headerLocationText').innerText = savedLoc + ' >';
    }
});

function openLocationModal() { document.getElementById('locationModal').classList.add('open'); }

function saveLocation() {
    const pin = document.getElementById('locPincode').value;
    const city = document.getElementById('locCity').value;
    if(!pin || !city) return alert("Please enter Pincode and City");

    const fullLoc = `${city} - ${pin}`;
    localStorage.setItem('user_location', fullLoc);
    document.getElementById('headerLocationText').innerText = fullLoc + ' >';
    closeModal('locationModal');
}

// ================= SPLASH SCREEN =================
setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) { splash.classList.add('fade-out'); setTimeout(() => { splash.style.display = 'none'; }, 500); }
}, 2500);

// ================= LOAD DATA =================
async function loadData() {
    try {
        // API Call with limit for fast loading
        const [prodRes, bannerRes] = await Promise.all([
            fetch(`${API_URL}/api/products?limit=30`), 
            fetch(`${API_URL}/api/banners`)
        ]);
        
        if(!prodRes.ok) throw new Error("Products API failed");
        if(!bannerRes.ok) throw new Error("Banners API failed");

        allProducts = await prodRes.json();
        allBanners = await bannerRes.json();

        if(currentUser) { wishlist = JSON.parse(localStorage.getItem('wishlist_' + currentUser.email)) || []; }

        try { renderHomePage(allProducts); } catch(e) { console.error("Home Page Error:", e); }
        try { renderTopBanners(); } catch(e) { console.error("Banner Error:", e); }
        
        updateCartUI();
        startIndividualTimers();
        startVerticalBannerSwipe(); 

    } catch (e) {
        console.error("Data load error:", e);
        const dynamicContent = document.getElementById('dynamicContent');
        if (dynamicContent) {
            dynamicContent.innerHTML = `
                <div style="text-align:center; padding:40px 20px;">
                    <h3 style="color:#d32f2f;">Server se connect nahi ho pa raha</h3>
                    <p style="color:#666; font-size:14px;">Kripya internet check karein ya thodi der baad refresh karein.</p>
                    <button onclick="window.location.reload()" style="margin-top:10px; padding:10px 20px; background:#2874f0; color:white; border:none; border-radius:5px;">Retry</button>
                </div>`;
        }
    }
}

// ================= HOME PAGE RENDERING =================
function renderHomePage(products) {
    const container = document.getElementById('dynamicContent');
    if(!container) return;
    if(!products || products.length === 0) { container.innerHTML = '<p style="text-align:center; padding:20px;">No products found.</p>'; return; }

    let html = '';

    function createCategorySection(title, categoryKey) {
        const prods = products.filter(p => p.category === categoryKey);
        if(prods.length === 0) return ''; 
        return `
            <div class="category-section">
                <div class="category-header">
                    <h3>${title}</h3>
                    <span onclick="window.location.href='category.html'">View All <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg></span>
                </div>
                <div class="h-scroll">
                    ${prods.slice(0, 6).map(p => generateCardHtml(p, false)).join('')}
                </div>
            </div>
        `;
    }

    const allHalfBanners = allBanners.filter(b => b.type === 'half');
    let bannerGroups = [[], [], []]; 
    allHalfBanners.forEach((b, index) => {
        bannerGroups[index % 3].push(b); 
    });

    function createVerticalHalfBanner(groupIndex, delayTime) {
        const bannersForSlot = bannerGroups[groupIndex];
        if(bannersForSlot.length === 0) return ''; 
        let slidesHtml = '';
        bannersForSlot.forEach(b => {
            slidesHtml += `<div class="vertical-slide" onclick="redirectToProduct()"><img src="${b.imageUrl}"></div>`;
        });
        return `
            <div class="mid-ad-banner vertical-slider-container" data-delay="${delayTime}">
                <div class="vertical-slider-track">
                    ${slidesHtml}
                </div>
            </div>
        `;
    }

    // 1. Top 10 Products Grid
    const homeProducts = products.filter(p => p.category !== 'minutes' && p.category !== 'value365');
    html += `<div class="grid">`;
    homeProducts.slice(0, 10).forEach((p, index) => {
        html += generateCardHtml(p, index === 1); 
    });
    html += `</div>`;

    // 2. AMAZON AUTO SECTION 1
    if (typeof getAmazonAutoHTML === 'function') {
        html += getAmazonAutoHTML(products); 
    }

    // 3. First Half Banner
    html += createVerticalHalfBanner(0, 3000); 

    // 4. Categories
    html += createCategorySection("Boy Fashion", "boy_fashion");
    html += createCategorySection("Children Fashion", "children_fashion");
    html += createCategorySection("Man Fashion", "man_fashion");
    html += createCategorySection("Women's Clothes", "clothes"); 

    // 5. AMAZON AUTO SECTION 2
    if (typeof getAmazonAutoHTML === 'function') {
        html += getAmazonAutoHTML(products); 
    }

    // 6. Second Half Banner
    html += createVerticalHalfBanner(1, 4500); 

    // 7. More Categories
    html += createCategorySection("Buy for Electronics", "electronics");
    html += createCategorySection("Our Festival", "festival");
    html += createCategorySection("Grocery Essentials", "minutes"); 

    // 8. Third Half Banner
    html += createVerticalHalfBanner(2, 6000); 

    // 9. More Categories
    html += createCategorySection("Daily Uses", "daily_uses");

    // 10. Remaining Products
    if(homeProducts.length > 10) {
        html += `<div class="section-title" style="margin-top:10px;">Recommended For You</div>`;
        html += `<div class="grid">`;
        homeProducts.slice(10).forEach(p => {
            html += generateCardHtml(p, false);
        });
        html += `</div>`;
    }

    container.innerHTML = html;
    startIndividualTimers();
}

// ================= BANNER LOGIC =================
function renderTopBanners() {
    const slider = document.getElementById('slider');
    if(!slider) return;
    
    const topBanners = allBanners.filter(b => b.type !== 'half');

    if(!topBanners || topBanners.length === 0) { 
        slider.innerHTML = `<img src="${defaultBanner}" alt="Diwali Banner" onclick="redirectToProduct()" style="cursor:pointer;">`; 
        return; 
    }
    
    slider.innerHTML = topBanners.map(b => `<img src="${b.imageUrl}" alt="Banner" onclick="redirectToProduct()" style="cursor:pointer;">`).join('');
    
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

function redirectToProduct() {
    if (allProducts && allProducts.length > 0) {
        window.location.href = `/product.html?id=${allProducts[0]._id}`;
    } else {
        window.location.href = 'category.html';
    }
}

// ================= GENERATE CARD HTML =================
function generateCardHtml(p, isBestSeller) {
    const rating = (Math.random() * (4.5 - 3.5) + 3.5).toFixed(1);
    const reviews = Math.floor(Math.random() * 2000) + 50;
    const bought = Math.floor(Math.random() * 500) + 100;
    
    const oldPrice = p.oldPrice || p.price;
    const discount = Math.round(((oldPrice - p.price) / oldPrice) * 100) || 0;

    const totalImgs = 1 + (p.additionalImages ? p.additionalImages.length : 0);
    const multiImgHtml = totalImgs > 1 ? `<div class="multi-product"><svg viewBox="0 0 24 24"><path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/></svg>${totalImgs}</div>` : '';

    let timerHtml = '';
    if (p.timerEnd && p.timerEnd > Date.now()) { timerHtml = `<div class="timer" data-endtime="${p.timerEnd}">Ends in ...</div>`; }

    let adTag = Math.random() > 0.7 ? `<div class="ad-tag">AD</div>` : '';

    let stockBadge = '';
    
    let actionButtons = `
        <button class="btn-add-meesho" onclick="event.stopPropagation(); addToCart('${p._id}')">Add</button>
        <button class="btn-buy-meesho" onclick="event.stopPropagation(); buyNowDirect('${p._id}')">Buy Now</button>
    `;
    
    if(p.stock <= 0) {
        stockBadge = `<div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:rgba(0,0,0,0.7); color:white; padding:8px 15px; border-radius:8px; font-weight:bold; z-index:10; font-size:12px; white-space:nowrap;">Out of Stock</div>`;
        actionButtons = `<button class="btn-add-meesho" style="background:#ccc; cursor:not-allowed; width:100%;">Out of Stock</button>`;
    }

    let brandName = 'Indian Celebration';
    if (p.category === 'patake') brandName = 'Fireworks';
    else if (p.category === 'clothes') brandName = 'Fashion';
    else if (p.category === 'minutes') brandName = 'Grocery';
    else if (p.category === 'value365') brandName = 'Value 365';
    else if (p.category === 'gifts') brandName = 'Gifts';
    else if (p.category) brandName = p.category.replace('_', ' ').toUpperCase();

    return `
        <div class="card">
            <div class="card-img-container" onclick="openProductPage('${p._id}')">
                ${adTag}
                <img src="${p.imageUrl}" class="card-img" loading="lazy" style="${p.stock <= 0 ? 'opacity:0.5;' : ''}" onerror="this.src='${defaultBanner}'">
                ${stockBadge}
                ${isBestSeller ? '<div class="best-seller-tag">Best seller</div>' : ''}
                <div class="floating-icons">
                    <div class="float-btn ${wishlist.includes(p._id) ? 'liked' : ''}" onclick="event.stopPropagation(); toggleLike(this, '${p._id}')">
                        <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    </div>
                </div>
                ${multiImgHtml}
            </div>

            <div class="card-details" onclick="openProductPage('${p._id}')">
                <div class="brand-name">${brandName}</div>
                <div class="card-title">${p.name}</div>
                <div class="rating-row"><div class="rating">${rating} <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div><span class="review-count">(${reviews})</span></div>
                <div class="bought-text">${bought}+ bought</div>
                ${timerHtml}
                <div class="price-row"><span class="price">₹${p.price}</span><span class="old-price">₹${oldPrice}</span><span class="discount">(${discount}% off)</span></div>
                <div class="card-btn-group">${actionButtons}</div>
            </div>
        </div>
    `;
}

// ================= NAVIGATION & PAGES =================
function openMinutesPage() { window.location.href = 'minutes.html'; }
function openValue365Page() { window.location.href = 'value365.html'; }
function openCategoriesPage() { window.location.href = 'category.html'; }

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
    startIndividualTimers(); 
}

function openProductPage(id) { 
    fetch(`${API_URL}/api/product/view/${id}`, { method: 'POST' }).catch(e => console.log(e)); 
    let recent = JSON.parse(localStorage.getItem('recently_viewed')) || []; 
    recent = recent.filter(pid => pid !== id); 
    recent.unshift(id); 
    if(recent.length > 5) recent.pop(); 
    localStorage.setItem('recently_viewed', JSON.stringify(recent)); 
    window.location.href = `/product.html?id=${id}`; 
}

function goHome() { window.location.href = 'index.html'; }

// ================= TIMERS =================
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

// ================= CART & WISHLIST =================
function toggleLike(el, id) { 
    if(!currentUser) { alert("Please login to add items to Wishlist!"); return; } 
    let userWishlist = JSON.parse(localStorage.getItem('wishlist_' + currentUser.email)) || []; 
    if(el.classList.contains('liked')) { 
        el.classList.remove('liked'); 
        userWishlist = userWishlist.filter(item => item !== id); 
    } else { 
        el.classList.add('liked'); 
        userWishlist.push(id); 
        alert("❤️ Added to Wishlist!"); 
    } 
    wishlist = userWishlist; 
    localStorage.setItem('wishlist_' + currentUser.email, JSON.stringify(userWishlist)); 
}

function addToCart(id) { 
    const p = allProducts.find(x => x._id === id); 
    if(!p) return;
    if(p.stock <= 0) return alert("Out of Stock!"); 
    const exist = cart.find(x => x._id === id && x.size === "N/A"); 
    if(exist) exist.qty++; 
    else cart.push({...p, qty: 1, size: "N/A"}); 
    localStorage.setItem('diwali_cart', JSON.stringify(cart)); 
    alert("✅ Added to Cart!"); 
    updateCartUI(); 
}

function buyNowDirect(id) { 
    const p = allProducts.find(x => x._id === id); 
    if(!p) return;
    if(p.stock <= 0) return alert("Out of Stock!"); 
    if(p.category === 'clothes' || p.category.includes('fashion')) { 
        alert("Please open the product page to select a size."); 
        return openProductPage(id); 
    } 
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
                    <div style="font-size:12px; color:#777;">Size: ${item.size} | Qty: ${item.qty}</div>
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

function openCart() { document.getElementById('cartModal').classList.add('open'); updateCartUI(); }
function closeCart() { document.getElementById('cartModal').classList.remove('open'); }

// ================= CHECKOUT & AUTH =================
function initiateCartCheckout() { 
    if(cart.length === 0) return alert("Cart is empty!"); 
    closeCart(); 
    document.querySelectorAll('.full-page').forEach(el => el.style.display = 'none'); 
    document.getElementById('checkout-page').style.display = 'flex'; 
}

// UPDATED: Redirect to Profile Page instead of old modal
function handleProfileClick() { 
    window.location.href = 'profile.html'; 
}

function switchAuthTab(tab) { 
    document.getElementById('tab-login').classList.toggle('active', tab === 'login'); 
    document.getElementById('tab-register').classList.toggle('active', tab === 'register'); 
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none'; 
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none'; 
}

function handleRegister(e) { 
    e.preventDefault(); 
    const name = document.getElementById('regName').value; 
    const phone = document.getElementById('regPhone').value; 
    const email = document.getElementById('regEmail').value; 
    const password = document.getElementById('regPassword').value; 
    
    let users = JSON.parse(localStorage.getItem('users')) || []; 
    if(users.find(u => u.email === email)) return alert("Email already registered!"); 
    
    users.push({ name, phone, email, password }); 
    localStorage.setItem('users', JSON.stringify(users)); 
    alert("✅ Registration Successful! Please login."); 
    switchAuthTab('login'); 
    document.getElementById('loginEmail').value = email; 
}

function handleLogin(e) { 
    e.preventDefault(); 
    const email = document.getElementById('loginEmail').value; 
    const password = document.getElementById('loginPassword').value; 
    
    let users = JSON.parse(localStorage.getItem('users')) || []; 
    const user = users.find(u => u.email === email && u.password === password); 
    
    if(user) { 
        localStorage.setItem('currentUser', JSON.stringify(user)); 
        currentUser = user; 
        alert("✅ Login Successful!"); 
        window.location.href = 'profile.html'; // Redirect to profile on login
    } else { 
        alert("❌ Invalid email or password!"); 
    } 
}

function handleLogout() { 
    localStorage.removeItem('currentUser'); 
    currentUser = null; 
    alert("Logged out successfully!"); 
    goHome(); 
}

function processPayment(e) { 
    e.preventDefault(); 
    if(!currentUser) { 
        alert("Please login to place an order."); 
        return handleProfileClick(); 
    } 
    const name = document.getElementById('chkName').value; 
    const addr = document.getElementById('chkAddress').value; 
    const state = document.querySelector('input[placeholder="State"]').value; 
    const pin = document.querySelector('input[placeholder="PIN Code"]').value; 
    checkoutAddress = `${name}, ${addr}, ${state} - ${pin}`; 
    document.getElementById('checkout-page').style.display = 'none'; 
    document.getElementById('qrModal').classList.add('open'); 
}

async function verifyAndPlaceOrder() { 
    const utr = document.getElementById('utrInput').value; 
    const fileInput = document.getElementById('proofImage'); 
    
    if(!utr || utr.length < 8) return alert("Please enter a valid UTR / Txn ID."); 
    if (fileInput.files.length === 0) return alert("Please upload a payment screenshot."); 
    
    const getBase64 = (file) => new Promise((resolve) => { 
        const reader = new FileReader(); 
        reader.onload = () => resolve(reader.result); 
        reader.readAsDataURL(file); 
    }); 
    
    const base64Proof = await getBase64(fileInput.files[0]); 
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0); 
    
    const payload = { 
        user: JSON.stringify(currentUser), 
        cart: JSON.stringify(cart), 
        total: totalAmount, 
        address: checkoutAddress, 
        utr: utr, 
        paymentProof: base64Proof 
    }; 
    
    try { 
        const res = await fetch(`${API_URL}/api/order`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        }); 
        const data = await res.json(); 
        
        if(data.success) { 
            let orders = JSON.parse(localStorage.getItem('orders_' + currentUser.email)) || []; 
            orders.unshift({ 
                id: data.orderId, 
                date: new Date().toLocaleDateString(), 
                items: cart, 
                total: totalAmount, 
                status: 'Pending Verification', 
                tracking: { "Order Placed": new Date().toLocaleString('en-IN') } 
            }); 
            localStorage.setItem('orders_' + currentUser.email, JSON.stringify(orders)); 
            
            document.getElementById('qrModal').classList.remove('open'); 
            document.getElementById('successModal').classList.add('open'); 
            
            cart = []; 
            localStorage.setItem('diwali_cart', JSON.stringify(cart)); 
            updateCartUI(); 
        } else { 
            alert("Error: " + data.error); 
        } 
    } catch(e) { 
        alert("Server error! Please try again."); 
    } 
}

function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ================= ORDERS & WISHLIST PAGE =================
function openOrders() { 
    document.querySelectorAll('.full-page').forEach(el => el.style.display = 'none'); 
    document.getElementById('orders-page').style.display = 'flex'; 
    let orders = JSON.parse(localStorage.getItem('orders_' + currentUser.email)) || []; 
    const container = document.getElementById('ordersList'); 
    
    if(orders.length === 0) { 
        container.innerHTML = '<p style="text-align:center; color:#777; margin-top:20px;">No orders yet!</p>'; 
        return; 
    } 
    
    container.innerHTML = orders.map(order => { 
        const stages = ['Order Placed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered']; 
        let trackHtml = `<div class="track-timeline"><div style="font-weight:bold; margin-bottom:15px; color:#0b2240;">Live Tracking</div>`; 
        stages.forEach((stage, i) => { 
            const timestamp = order.tracking ? order.tracking[stage] : null; 
            const isActive = timestamp ? 'active' : ''; 
            trackHtml += `<div class="track-step ${isActive}"><div class="track-dot"></div><div style="flex:1;"><div class="track-text">${stage}</div>${timestamp ? `<div style="font-size:11px; color:#666; margin-top:2px;">${timestamp}</div>` : ''}</div></div>`; 
        }); 
        trackHtml += `</div>`; 
        
        const delDate = order.items[0]?.deliveryDate ? new Date(order.items[0].deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Will be updated soon'; 
        
        return `
        <div class="order-card">
            <div class="order-header"><span>Order ID: ${order.id}</span><span class="order-status">${order.status}</span></div>
            <div style="font-size:12px; color:#666; margin-bottom:10px;">Date: ${order.date}</div>
            <div style="font-size:13px; font-weight:600; color:#0b2240; margin-bottom:10px; background: #e3f2fd; padding: 8px; border-radius: 6px;">Expected Delivery: <span style="color:#388e3c;">${delDate}</span></div>
            ${order.items.map(item => `
                <div class="order-item" style="display:flex; gap:10px; margin-bottom:10px;">
                    <img src="${item.imageUrl}">
                    <div>
                        <div style="font-size:14px; font-weight:600;">${item.name}</div>
                        <div style="font-size:12px; color:#777;">Size: ${item.size} | Qty: ${item.qty}</div>
                        <div style="font-size:14px; font-weight:700; color:var(--primary-blue);">₹${item.price * item.qty}</div>
                    </div>
                </div>`).join('')}
            ${trackHtml}
            <div class="order-total">Total: ₹${order.total}</div>
        </div>`; 
    }).join(''); 
}

function openWishlist() { 
    document.querySelectorAll('.full-page').forEach(el => el.style.display = 'none'); 
    document.getElementById('wishlist-page').style.display = 'flex'; 
    let wishlistIds = JSON.parse(localStorage.getItem('wishlist_' + currentUser.email)) || []; 
    const container = document.getElementById('wishlistGrid'); 
    
    if(wishlistIds.length === 0) { 
        container.innerHTML = '<p style="grid-column: span 2; text-align:center; color:#777; margin-top:20px;">Your wishlist is empty!</p>'; 
        return; 
    } 
    
    const wishlistProducts = allProducts.filter(p => wishlistIds.includes(p._id)); 
    container.innerHTML = wishlistProducts.map(p => `
        <div class="card" onclick="openProductPage('${p._id}')">
            <img src="${p.imageUrl}" class="card-img" style="padding:10px;" onerror="this.src='${defaultBanner}'">
            <div class="card-details">
                <div class="card-title">${p.name}</div>
                <div class="price-row"><span class="price">₹${p.price}</span></div>
            </div>
        </div>`).join(''); 
}

// ================= URL REDIRECT LOGIC =================
function checkUrlRedirects() { 
    const urlParams = new URLSearchParams(window.location.search); 
    
    // Checkout
    if(urlParams.get('checkout') === 'true') { 
        window.history.replaceState({}, document.title, window.location.pathname); 
        document.querySelectorAll('.full-page').forEach(el => el.style.display = 'none'); 
        document.getElementById('checkout-page').style.display = 'flex'; 
    }

    // Login Modal from Profile page
    if(urlParams.get('login') === 'true') {
        window.history.replaceState({}, document.title, window.location.pathname);
        if(!currentUser) {
            document.getElementById('home-page').style.display = 'none'; 
            document.querySelectorAll('.full-page').forEach(el => el.style.display = 'none'); 
            document.getElementById('auth-page').style.display = 'flex'; 
        }
    }

    // Profile Redirect (Orders)
    if(urlParams.get('openOrders') === 'true') {
        window.history.replaceState({}, document.title, window.location.pathname);
        if(currentUser) openOrders();
        else handleProfileClick();
    }

    // Profile Redirect (Wishlist)
    if(urlParams.get('openWishlist') === 'true') {
        window.history.replaceState({}, document.title, window.location.pathname);
        if(currentUser) openWishlist();
        else handleProfileClick();
    }

    // Open Cart from Bottom Nav (if navigated from profile)
    if(urlParams.get('cart') === 'true') {
        window.history.replaceState({}, document.title, window.location.pathname);
        openCart();
    }
}

// Initialize Application
loadData();
checkUrlRedirects(); // Call the new redirect checker
