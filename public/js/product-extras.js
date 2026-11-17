// product-extras.js

// 1. Render Variations (Size/Colour) - Amazon Style
function renderProductVariations(product, allProducts) {
    const varSection = document.getElementById('variationsSection');
    
    // Agar database mein variants nahi hain, toh hum mock data bana lenge testing ke liye
    let variants = product.variants || [
        { name: "220ML Pack", price: product.price, oldPrice: product.oldPrice, inStock: true, image: product.imageUrl },
        { name: "270ML Pack", price: product.price + 50, oldPrice: product.oldPrice + 100, inStock: true, image: product.imageUrl },
        { name: "500ML Pack", price: product.price + 150, oldPrice: product.oldPrice + 200, inStock: false, image: product.imageUrl },
        { name: "1L Premium", price: product.price + 300, oldPrice: product.oldPrice + 500, inStock: true, image: product.imageUrl }
    ];

    if(variants.length === 0) {
        varSection.style.display = 'none';
        return;
    }

    let html = `<div class="variation-title">Size / Pack: <span style="font-weight:700; color:#0f1111;" id="selectedVarName">${variants[0].name}</span></div>`;
    html += `<div class="variation-scroll">`;

    variants.forEach((v, index) => {
        const activeClass = index === 0 ? 'active' : '';
        const stockClass = v.inStock ? '' : 'out';
        const stockText = v.inStock ? 'In stock' : 'Out of stock';

        html += `
            <div class="variation-card ${activeClass}" onclick="selectVariation(this, ${v.price}, '${v.name}')">
                <img src="${v.image || product.imageUrl}">
                <div class="var-name">${v.name}</div>
                <div class="var-price"><sup>₹</sup>${v.price}</div>
                <div class="var-old-price">₹${v.oldPrice || v.price}</div>
                <div class="var-stock ${stockClass}">${stockText}</div>
            </div>
        `;
    });

    html += `</div>`;
    varSection.innerHTML = html;
    varSection.style.display = 'block';
}

// Select variation logic
function selectVariation(el, price, name) {
    // Remove active class from all
    document.querySelectorAll('.variation-card').forEach(c => c.classList.remove('active'));
    // Add to clicked
    el.classList.add('active');
    
    // Update selected text
    document.getElementById('selectedVarName').innerText = name;
    
    // Update main price on page
    document.getElementById('pPrice').innerText = `₹${price}`;
}

// 2. Render Discover Section (Filter Chips + Grid)
function renderDiscoverSection(product, allProducts) {
    const discoverSec = document.getElementById('discoverSection');
    const chipsContainer = document.getElementById('filterChips');
    const gridContainer = document.getElementById('discoverGrid');

    // Filter chips options
    const chips = ["More like this", "Customers also bought", "Deals", "Under ₹500", "Under ₹1000"];

    let chipHtml = '';
    chips.forEach((chip, index) => {
        const activeClass = index === 0 ? 'active' : '';
        chipHtml += `<div class="chip ${activeClass}" onclick="filterDiscover(this, '${chip}', '${product.category}')">${chip}</div>`;
    });
    chipsContainer.innerHTML = chipHtml;

    // Initial Load (More like this)
    loadDiscoverProducts("More like this", product.category, allProducts);
    discoverSec.style.display = 'block';
}

// Filter Logic
function filterDiscover(el, filterType, category) {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');

    // Need to get all products again from global scope or fetch
    fetch('/api/products')
        .then(res => res.json())
        .then(products => {
            loadDiscoverProducts(filterType, category, products);
        });
}

// Load products into Grid based on filter
function loadDiscoverProducts(filterType, category, allProducts) {
    const gridContainer = document.getElementById('discoverGrid');
    
    // Filtering logic
    let filtered = allProducts.filter(p => p._id !== window.currentProductId); // exclude current
    
    if (filterType === "More like this") {
        filtered = filtered.filter(p => p.category === category);
    } else if (filterType === "Deals") {
        filtered = filtered.filter(p => {
            const oldP = p.oldPrice || p.price;
            const disc = Math.round(((oldP - p.price) / oldP) * 100);
            return disc >= 20; // Products with 20%+ discount
        });
    } else if (filterType === "Under ₹500") {
        filtered = filtered.filter(p => p.price < 500);
    } else if (filterType === "Under ₹1000") {
        filtered = filtered.filter(p => p.price < 1000);
    }
    
    // Shuffle and limit to 6
    filtered = filtered.sort(() => 0.5 - Math.random()).slice(0, 6);

    if (filtered.length === 0) {
        gridContainer.innerHTML = '<p style="grid-column: span 2; text-align:center; color:#777;">No products found for this filter.</p>';
        return;
    }

    let html = '';
    filtered.forEach(p => {
        const oldP = p.oldPrice || p.price;
        const disc = Math.round(((oldP - p.price) / oldP) * 100) || 0;
        const isDeal = disc >= 20;

        html += `
            <a href="product.html?id=${p._id}" class="disc-card">
                <div class="disc-img-box">
                    <img src="${p.imageUrl}" onerror="this.src='https://via.placeholder.com/150'">
                    <div class="disc-plus-btn">+</div>
                </div>
                <div class="disc-title">${p.name}</div>
                <div class="disc-price-row">
                    ${disc > 0 ? `<span class="disc-discount">-${disc}%</span>` : ''}
                    <span class="disc-price">₹${p.price}</span>
                </div>
                ${disc > 0 ? `<span class="disc-old-price">M.R.P: ₹${oldP}</span>` : ''}
                ${isDeal ? `<div class="disc-deal">Limited time deal</div>` : ''}
            </a>
        `;
    });
    gridContainer.innerHTML = html;
}
