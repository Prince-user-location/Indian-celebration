// Amazon Style Dynamic Header Background
// Ye script har 3 second me check karegi ki kaunsa banner screen par hai
// Aur uski image ko header ke background me set kar degi

setInterval(() => {
    const slider = document.getElementById('slider');
    if (!slider) return;

    const images = slider.querySelectorAll('img');
    if (images.length === 0) return;

    // Check karo kaunsa banner abhi visible hai (transform property se)
    const transform = slider.style.transform;
    let index = 0;
    
    if (transform) {
        const match = transform.match(/translateX\(-(\d+)%\)/);
        if (match) {
            index = parseInt(match[1]) / 100;
        }
    }

    const currentImg = images[index];
    if (currentImg && currentImg.src) {
        const header = document.querySelector('.header');
        if (header) {
            // CSS Variable set karo jisse header ke ::before background me image aa jaye
            header.style.setProperty('--current-banner-img', `url(${currentImg.src})`);
        }
    }
}, 3100); // Har 3.1 second me check karega (kyunki banner 3 sec me change hota hai)
