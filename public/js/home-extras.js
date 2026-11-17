// home-extras.js

// Function to generate Amazon-style Deals Section
function generateAmazonDealsHTML(products, theme = 'light') {
    // 4 sabse zyada discount wale products nikalo
    const deals = [...products].sort((a, b) => {
        const discA = a.oldPrice ? (a.oldPrice - a.price) / a.oldPrice : 0;
        const discB = b.oldPrice ? (b.oldPrice - b.price) / b.oldPrice : 0;
        return discB - discA;
    }).slice(0, 4);

    let title = theme === 'dark' ? 'Shop popular deals' : 'Deals for you';
    let themeClass = theme === 'dark' ? 'dark-theme' : '';

    let html = `
        <div class="amazon-deals-container ${themeClass}">
            <div class="amazon-deals-header">
                <h2>${title}</h2>
                <span onclick="window.location.href='category.html'">See all ></span>
            </div>
            <div class="amazon-deals-grid">
    `;

    deals.forEach(p => {
        const oldP = p.oldPrice || p.price;
        let discount = Math.round(((oldP - p.price) / oldP) * 100);
        if (isNaN(discount) || discount <= 0) discount = Math.floor(Math.random() * 40) + 30; // Fallback for demo

        html += `
            <div class="deal-card" onclick="openProductPage('${p._id}')">
                <div class="deal-img-box">
                    <img src="${p.imageUrl}" onerror="this.src='https://via.placeholder.com/150'">
                </div>
                <div class="deal-badge">${discount}% off</div>
                <div class="deal-text">Limited time deal</div>
            </div>
        `;
    });

    html += `</div></div>`;
    return html;
}
