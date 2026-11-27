// RENDER AMAZON STYLE SEARCH BAR (Black Icons)
function renderSearchBar(containerId) {
    const container = document.getElementById(containerId);
    if(!container) return;

    const searchHTML = `
        <div class="amazon-search-wrapper">
            <div class="amazon-search-box">
                <!-- Search Icon -->
                <svg class="search-icon" viewBox="0 0 24 24" fill="#000">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                
                <input type="text" id="mainSearchInput" placeholder="Search for Products...">
                
                <!-- Voice Icon (Black) -->
                <svg class="action-icon" onclick="startVoiceSearch()" viewBox="0 0 24 24" fill="#000">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                </svg>
                
                <!-- Scanner Icon (Black) -->
                <svg class="action-icon" onclick="openScanner()" viewBox="0 0 24 24" fill="#000">
                    <path d="M4 4h4V2H4c-1.1 0-2 .9-2 2v4h2V4zm12-2v2h4v4h2V4c0-1.1-.9-2-2-2h-4zM4 20v-4H2v4c0 1.1.9 2 2 2h4v-2H4zm16 0h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zM18 8H6v8h12V8zm-2 6H8v-4h8v4z"/>
                </svg>
            </div>
        </div>
    `;
    container.innerHTML = searchHTML;
}

function startVoiceSearch() {
    alert("🎤 Listening... Boliye aap kya dhundhna chahte hain.");
}
function openScanner() {
    alert("📷 Scanner: Camera on karke Barcode/QR scan karein.");
}
