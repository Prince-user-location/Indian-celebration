// ==========================================
// 1. AUTO-SWIPING SEARCH BAR (Every 3 Seconds)
// ==========================================
const searchSuggestions = [
    "Search for 'Surf Excel'...",
    "Search for 'Nike Shoes'...",
    "Search for 'Fresh Onion'...",
    "Search for 'Diwali Anar'...",
    "Search for 'Samsung TV'...",
    "Search for 'Amul Milk'..."
];

let searchIndex = 0;
setInterval(() => {
    const searchInput = document.getElementById('mainSearchInput');
    if (searchInput) {
        // Fade out effect
        searchInput.style.opacity = 0;
        
        setTimeout(() => {
            searchIndex = (searchIndex + 1) % searchSuggestions.length;
            searchInput.placeholder = searchSuggestions[searchIndex];
            // Fade in effect
            searchInput.style.opacity = 1;
        }, 300); // 300ms for smooth transition
    }
}, 3000); // 3000ms = 3 seconds


// ==========================================
// 2. AUTO-CHANGING HEADER THEME (Every 10 Minutes)
// ==========================================
// Yahan hum 4 alag-alag premium themes define kar rahe hain
const themes = ['theme-default', 'theme-festive', 'theme-green', 'theme-dark'];
let themeIndex = 0;

setInterval(() => {
    themeIndex = (themeIndex + 1) % themes.length;
    
    // Body se purani theme class hatao aur nayi lagao
    document.body.classList.remove(...themes);
    document.body.classList.add(themes[themeIndex]);
    
    console.log("Theme changed to:", themes[themeIndex]);
}, 600000); // 600,000ms = 10 Minutes
