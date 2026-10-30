const API_URL = ""; 
let allProducts = [];
let allBanners = [];
let cart = JSON.parse(localStorage.getItem('diwali_cart')) || [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let checkoutAddress = "";
let wishlist = [];

// Default Banner (Agar Database me banner na ho toh ye dikhega)
const defaultBanner = "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=800";

// 1. Load All Data
async function loadData() {
    try {
        const [prodRes, bannerRes] = await Promise.all([
            fetch(`${API_URL}/api/products`),
            fetch(`${API_URL}/api/banners`)
        ]);
        allProducts = await prodRes.json();
        allBanners = await bannerRes.json();

        // Load User Wishlist if logged in
        if(currentUser) {
            wishlist = JSON.parse(localStorage.getItem('wishlist_' + currentUser.email)) || [];
        }

        renderHomePage(allProducts);
        renderTopBanners();
        updateCartUI();
        startIndividualTimers(); // Start live timers
    } catch (e) { 
        console.error(e); 
        renderTopBanners();
        document.getElementById('dynamicContent').innerHTML = '<p style="text-align:center; padding:20px;">No products found. Server issue.</p>';
    }
}

// 2. Render Top Banners
function renderTopBanners() {
    const slider = document.getElementById('slider');
    if(!slider) return;
    
    if(!allBanners || allBanners.length === 0) {
        slider.innerHTML = `<img src="${defaultBanner}" alt="Diwali Banner">`;
        return;
    }
    slider.innerHTML = allBanners.map(b => `<img src="${b.imageUrl}" alt="Banner">`).join('');
    
    if(allBanners.length <= 1) return;
    let idx = 0;
    setInterval(() => {
        idx = (idx + 1) % allBanners.length;
        slider.style.transform = `translateX(-${idx * 100}%)`;
    }, 3000);
}

// 3. Individual Live Timers
function startIndividualTimers() {
    // Purane timers clear karein agar dobara call ho
    if(window.timerInterval) clearInterval(window.timerInterval);
    
    window.timerInterval = setInterval(() => {
        const now = Date.now();
        document.querySelectorAll('.timer').forEach(el => {
            const endTime = parseInt(el.getAttribute('data-endtime'));
            if (!endTime) return;
            
            const diff = endTime - now;
            if (diff <= 0) {
                el.innerText = "Ended";
                return;
            }

            const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const m = Math.floor((diff / 1000 / 60) % 60);
            const s = Math.floor((diff / 1000) % 60);

            el.innerText = `Ends in ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        });
    }, 1000);
}

// 4. Render Home Page (Meesho Style)
function renderHomePage(products) {
    const container = document.getElementById('dynamicContent');
    if(!products || products.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px;">No products found. Please add from Admin.</p>';
        return;
    }
    
    let html = `<div class="grid">`;
    products.forEach((p, index) => {
        const rating = (Math.random() * (4.5 - 3.5) + 3.5).toFixed(1);
        const reviews = Math.floor(Math.random() * 2000) + 50;
        const bought = Math.floor(Math.random() * 500) + 100;
        const discount = Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
        const isBestSeller = index === 1;
        
        // Real Multi Image Count
        const totalImgs = 1 + (p.additionalImages ? p.additionalImages.length : 0);
        const multiImgHtml = totalImgs > 1 ? `
            <div class="multi-product">
                <svg viewBox="0 0 24 24"><path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/></svg>
                ${totalImgs}
            </div>` : '';

        // Individual Timer Logic
        let timerHtml = '';
        if (p.timerEnd && p.timerEnd > Date.now()) {
            timerHtml = `<div class="timer" data-endtime="${p.timerEnd}">Ends in ...</div>`;
        }

        html += `
            <div class="card">
                <div class="card-img-container" onclick="openProductPage('${p._id}')">
                    <img src="${p.imageUrl}" class="card-img">
                    ${isBestSeller ? '<div class="best-seller-tag">Best seller</div>' : ''}
                    <div class="floating-icons">
                        <div class="float-btn ${wishlist.includes(p._id) ? 'liked' : ''}" onclick="event.stopPropagation(); toggleLike(this, '${p._id}')">
                            <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        </div>
                        <div class="float-btn" onclick="event.stopPropagation(); shareProduct('${p._id}')">
                            <svg viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                        </div>
                    </div>
                    ${multiImgHtml}
                </div>

                <div class="card-details" onclick="openProductPage('${p._id}')">
                    <div class="brand-name">Majestic Man</div>
                    <div class="card-title">${p.name}</div>
                    <div class="rating-row">
                        <div class="rating">${rating} <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>
                        <span class="review-count">(${reviews})</span>
                    </div>
                    <div class="bought-text">${bought}+ bought in past month</div>
                    
                    ${timerHtml}
                    
                    <div class="price-row">
                        <span class="price">₹${p.price}</span>
                        <span class="old-price">₹${p.oldPrice}</span>
                        <span class="discount">(${discount}% off)</span>
                    </div>
                    
                    <div class="card-btn-group">
                        <button class="btn-add-meesho" onclick="event.stopPropagation(); addToCart('${p._id}')">Add to cart</button>
                        <button class="btn-buy-meesho" onclick="event.stopPropagation(); buyNowDirect('${p._id}')">Buy Now</button>
                    </div>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}

// 5. Category Page Logic (FIXED)
function openCategoriesPage() {
    document.getElementById('home-page').style.display = 'none';
    document.querySelectorAll('.full-page').forEach(el => el.style.display = 'none');
    document.getElementById('category-page').style.display = 'flex';
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('nav-cat').classList.add('active');
    switchCategory('patake', document.querySelector('.cat-menu-item'));
}

function switchCategory(cat, el) {
    document.querySelectorAll('.cat-menu-item').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    
    const filtered = allProducts.filter(p => p.category === cat);
    const grid = document.getElementById('categoryGrid'); // Ye pehle se hi ek <div class="grid"> hai index.html me
    
    if(filtered.length === 0) { 
        grid.innerHTML = '<p style="grid-column: span 2; text-align:center; padding:20px;">No products found.</p>'; 
        return; 
    }
    
    // THE FIX: Directly assign HTML to the existing grid container without wrapping it in another div
    let html = '';
    filtered.forEach((p, index) => {
        const discount = Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
        const totalImgs = 1 + (p.additionalImages ? p.additionalImages.length : 0);
        const multiImgHtml = totalImgs > 1 ? `<div class="multi-product"><svg viewBox="0 0 24 24"><path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/></svg>${totalImgs}</div>` : '';

        let timerHtml = '';
        if (p.timerEnd && p.timerEnd > Date.now()) {
            timerHtml = `<div class="timer" data-endtime="${p.timerEnd}">Ends in ...</div>`;
        }

        html += `
            <div class="card">
                <div class="card-img-container" onclick="openProductPage('${p._id}')">
                    <img src="${p.imageUrl}" class="card-img">
                    <div class="floating-icons">
                        <div class="float-btn ${wishlist.includes(p._id) ? 'liked' : ''}" onclick="event.stopPropagation(); toggleLike(this, '${p._id}')">
                            <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        </div>
                    </div>
                    ${multiImgHtml}
                </div>
                <div class="card-details" onclick="openProductPage('${p._id}')">
                    <div class="card-title">${p.name}</div>
                    ${timerHtml}
                    <div class="price-row">
                        <span class="price">₹${p.price}</span>
                        <span class="old-price">₹${p.oldPrice}</span>
                        <span class="discount">(${discount}% off)</span>
                    </div>
                    <div class="card-btn-group">
                        <button class="btn-add-meesho" onclick="event.stopPropagation(); addToCart('${p._id}')">Add to cart</button>
                        <button class="btn-buy-meesho" onclick="event.stopPropagation(); buyNowDirect('${p._id}')">Buy Now</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    grid.innerHTML = html; // Inject directly
    startIndividualTimers(); // Start timers for category page
}

// 6. Utility Functions
function toggleLike(el, id) {
    if(!currentUser) {
        alert("Please login to add items to Wishlist!");
        return;
    }
    
    let userWishlist = JSON.parse(localStorage.getItem('wishlist_' + currentUser.email)) || [];
    
    if(el.classList.contains('liked')) { 
        el.classList.remove('liked'); 
        userWishlist = userWishlist.filter(item => item !== id); 
    } else { 
        el.classList.add('liked'); 
        userWishlist.push(id); 
        alert("❤️ Added to Wishlist!"); 
    }
    
    wishlist = userWishlist; // Update local variable
    localStorage.setItem('wishlist_' + currentUser.email, JSON.stringify(userWishlist));
}

function shareProduct(id) {
    const p = allProducts.find(x => x._id === id);
    if (navigator.share) { 
        navigator.share({ title: p.name, url: window.location.href }).catch(console.error); 
    } else { 
        alert("Link copied!"); 
    }
}

function openProductPage(id) { window.location.href = `/product.html?id=${id}`; }
function goHome() { window.location.href = 'index.html'; }

// 7. Cart Logic
function addToCart(id) {
    const p = allProducts.find(x => x._id === id);
    const exist = cart.find(x => x._id === id && x.size === "N/A");
    if(exist) exist.qty++;
    else cart.push({...p, qty: 1, size: "N/A"});
    
    localStorage.setItem('diwali_cart', JSON.stringify(cart));
    alert("✅ Added to Cart!");
    updateCartUI();
}

function buyNowDirect(id) {
    const p = allProducts.find(x => x._id === id);
    if(p.category === 'clothes') { 
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
                    <button onclick="removeFromCart(${index})" style="border:none; background:none; color:red; font-size:12px;">Remove</button>
                </div>
            `;
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

function initiateCartCheckout() { 
    if(cart.length === 0) return alert("Cart is empty!"); 
    closeCart(); 
    document.querySelectorAll('.full-page').forEach(el => el.style.display = 'none'); 
    document.getElementById('checkout-page').style.display = 'flex'; 
}

// 8. Auth & Profile Logic
function handleProfileClick() {
    if(currentUser) { openProfile(); } 
    else { 
        document.getElementById('home-page').style.display = 'none'; 
        document.querySelectorAll('.full-page').forEach(el => el.style.display = 'none'); 
        document.getElementById('auth-page').style.display = 'flex'; 
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active')); 
        document.getElementById('nav-acc').classList.add('active'); 
    }
}

function openProfile() {
    document.getElementById('home-page').style.display = 'none'; 
    document.querySelectorAll('.full-page').forEach(el => el.style.display = 'none');
    document.getElementById('profile-page').style.display = 'block'; 
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active')); 
    document.getElementById('nav-acc').classList.add('active');
    
    document.getElementById('profName').innerText = currentUser.name; 
    document.getElementById('profEmail').innerText = currentUser.email; 
    document.getElementById('profAvatar').innerText = currentUser.name.charAt(0).toUpperCase();
    
    let orders = JSON.parse(localStorage.getItem('orders_' + currentUser.email)) || []; 
    document.getElementById('statOrders').innerText = orders.length;
    
    let userWishlist = JSON.parse(localStorage.getItem('wishlist_' + currentUser.email)) || [];
    document.getElementById('statWishlist').innerText = userWishlist.length;
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
        openProfile(); 
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

// 9. Checkout & Orders Flow
function processPayment(e) {
    e.preventDefault(); 
    if(!currentUser) { alert("Please login to place an order."); return handleProfileClick(); }
    
    const name = document.getElementById('chkName').value; 
    const addr = document.getElementById('chkAddress').value; 
    const state = document.querySelector('input[placeholder="State"]').value; 
    const pin = document.querySelector('input[placeholder="110006"]').value;
    
    checkoutAddress = `${name}, ${addr}, ${state} - ${pin}`;
    document.getElementById('checkout-page').style.display = 'none'; 
    document.getElementById('qrModal').classList.add('open');
}

async function verifyAndPlaceOrder() {
    const utr = document.getElementById('utrInput').value; 
    const fileInput = document.getElementById('proofImage');
    
    if(!utr || utr.length < 8) return alert("Please enter a valid UTR / Txn ID.");
    if (fileInput.files.length === 0) return alert("Please upload a payment screenshot.");
    
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const formData = new FormData();
    formData.append('user', JSON.stringify(currentUser)); 
    formData.append('cart', JSON.stringify(cart)); 
    formData.append('total', totalAmount); 
    formData.append('address', checkoutAddress); 
    formData.append('utr', utr); 
    formData.append('paymentProof', fileInput.files[0]);
    
    try {
        const res = await fetch(`${API_URL}/api/order`, { method: 'POST', body: formData });
        const data = await res.json();
        
        if(data.success) {
            let orders = JSON.parse(localStorage.getItem('orders_' + currentUser.email)) || [];
            orders.unshift({ id: data.orderId, date: new Date().toLocaleDateString(), items: cart, total: totalAmount, status: 'Pending Verification' });
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

function openOrders() {
    document.querySelectorAll('.full-page').forEach(el => el.style.display = 'none'); 
    document.getElementById('orders-page').style.display = 'flex';
    
    let orders = JSON.parse(localStorage.getItem('orders_' + currentUser.email)) || []; 
    const container = document.getElementById('ordersList');
    
    if(orders.length === 0) { 
        container.innerHTML = '<p style="text-align:center; color:#777; margin-top:20px;">No orders yet!</p>'; 
        return; 
    }
    
    container.innerHTML = orders.map(order => `
        <div class="order-card">
            <div class="order-header"><span>Order ID: ${order.id}</span><span class="order-status">${order.status}</span></div>
            <div style="font-size:12px; color:#666; margin-bottom:10px;">Date: ${order.date}</div>
            ${order.items.map(item => `
                <div class="order-item"><img src="${item.imageUrl}"><div><div style="font-size:14px; font-weight:600;">${item.name}</div><div style="font-size:12px; color:#777;">Size: ${item.size} | Qty: ${item.qty}</div><div style="font-size:14px; font-weight:700; color:var(--primary-blue);">₹${item.price * item.qty}</div></div></div>
            `).join('')}
            <div style="text-align:right; font-weight:bold; margin-top:10px; border-top:1px solid #eee; padding-top:10px;">Total: ₹${order.total}</div>
        </div>
    `).join('');
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
            <img src="${p.imageUrl}" class="card-img">
            <div class="card-title">${p.name}</div>
            <div class="price-row"><span class="price">₹${p.price}</span></div>
        </div>
    `).join('');
}

function checkUrlForCheckout() {
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.get('checkout') === 'true') { 
        window.history.replaceState({}, document.title, window.location.pathname); 
        document.querySelectorAll('.full-page').forEach(el => el.style.display = 'none'); 
        document.getElementById('checkout-page').style.display = 'flex'; 
    }
}

// Initialize App
loadData();
checkUrlForCheckout();
