// Amazon Style Clean Color Sync
setInterval(() => {
    const slider = document.getElementById('slider');
    if (!slider) return;

    const images = slider.querySelectorAll('img');
    if (images.length === 0) return;

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
            header.style.setProperty('--current-banner-img', `url(${currentImg.src})`);
        }
    }
}, 3100);
