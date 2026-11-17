// ==========================================
// AMAZON AUTO-SWIPE & COLOR CHANGE LOGIC
// ==========================================

const amazonBgColors = [
    '#f1f3f6', '#e3f2fd', '#fce4ec', '#e8f5e9', '#fff3e0', 
    '#f3e5f5', '#e0f7fa', '#fffde7', '#fbe9e7', '#ede7f6', 
    '#e0f2f1', '#f9fbe7', '#fafafa', '#ffebee', '#e1f5fe'
];

let colorInterval = null;
let swipeInterval1 = null;
let swipeInterval2 = null;
let swipeInterval3 = null;
let swipeInterval4 = null;

// Function to generate HTML for the Amazon section
function getAmazonAutoHTML(products) {
    // Clear old intervals if re-rendering
    if(colorInterval) clearInterval(colorInterval);
    if(swipeInterval1) clearInterval(swipeInterval1);
    if(swipeInterval2) clearInterval(swipeInterval2);
    if(swipeInterval3) clearInterval(swipeInterval3);
    if(swipeInterval4) clearInterval(swipeInterval4);

    // Filter products that have images and discount
    const validProducts = products.filter(p => p.imageUrl && p.price && p.oldPrice);
    if(validProducts.length < 4) return ''; // Need at least 4 products for the grid

    // Get top 4 products for initial load
    const initialDeals = validProducts.slice(0, 4);

    let html = `
        <div class="amazon-auto-container" id="autoDealsContainer">
            <div class="amazon-auto-header">
                <h2>Deals for you</h2>
                <span onclick="window.location.href='category.html'">See all ></span>
            </div>
            <div class="amazon-auto-grid">
    `;

    initialDeals.forEach((p, index) => {
        const oldP = p.oldPrice || p.price;
        let discount = Math.round(((oldP - p.price) / oldP) * 100);
        if (isNaN(discount) || discount <= 0) discount = 70; // fallback

        html += `
            <div class="auto-deal-card" onclick="openProductPage('${p._id}')">
                <div class="auto-img-box">
                    <img id="auto-img-${index}" src="${p.imageUrl}">
                </div>
                <div class="auto-badge" id="auto-badge-${index}">${discount}% off</div>
                <div class="auto-deal-text">Limited time deal</div>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    // Schedule the logic to start after HTML is injected
    setTimeout(() => {
        startAutoColorChange();
        startAutoSwipe(validProducts);
    }, 100);

    return html;
}

// 1. Logic for Auto Color Change (Every 3 seconds)
function startAutoColorChange() {
    const container = document.getElementById('autoDealsContainer');
    if(!container) return;

    let colorIndex = 0;
    colorInterval = setInterval(() => {
        colorIndex = (colorIndex + 1) % amazonBgColors.length;
        container.style.backgroundColor = amazonBgColors[colorIndex];
    }, 3000); // 3000ms = 3 seconds
}

// 2. Logic for Auto Swiping Products inside cards
function startAutoSwipe(products) {
    let pIndex0 = 4 % products.length; // Start from 5th product for card 1
    let pIndex1 = 5 % products.length;
    let pIndex2 = 6 % products.length;
    let pIndex3 = 7 % products.length;

    // Helper function to change image with fade effect
    const changeCardProduct = (cardIndex, product) => {
        const imgEl = document.getElementById(`auto-img-${cardIndex}`);
        const badgeEl = document.getElementById(`auto-badge-${cardIndex}`);
        
        if(imgEl && badgeEl) {
            imgEl.style.opacity = 0; // Fade out
            setTimeout(() => {
                imgEl.src = product.imageUrl;
                
                const oldP = product.oldPrice || product.price;
                let discount = Math.round(((oldP - product.price) / oldP) * 100);
                if (isNaN(discount) || discount <= 0) discount = 70;
                
                badgeEl.innerText = `${discount}% off`;
                imgEl.style.opacity = 1; // Fade in
            }, 400); // Wait for fade out
        }
    };

    // Set intervals for each card to swipe independently
    swipeInterval1 = setInterval(() => {
        changeCardProduct(0, products[pIndex0]);
        pIndex0 = (pIndex0 + 1) % products.length;
    }, 3500);

    swipeInterval2 = setInterval(() => {
        changeCardProduct(1, products[pIndex1]);
        pIndex1 = (pIndex1 + 1) % products.length;
    }, 4500);

    swipeInterval3 = setInterval(() => {
        changeCardProduct(2, products[pIndex2]);
        pIndex2 = (pIndex2 + 1) % products.length;
    }, 5000);

    swipeInterval4 = setInterval(() => {
        changeCardProduct(3, products[pIndex3]);
        pIndex3 = (pIndex3 + 1) % products.length;
    }, 4000);
}
