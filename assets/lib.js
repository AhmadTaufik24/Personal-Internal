// --- DATABASE LOGIC ---
let assets = JSON.parse(localStorage.getItem('taufik_assets_db')) || [];
let activeCategory = 'all';

// --- RENDER FUNCTION ---
function renderAssets() {
    const grid = document.getElementById('assetGrid');
    const search = document.getElementById('searchInput').value.toLowerCase();
    grid.innerHTML = '';

    const filtered = assets.filter(a => {
        const matchCat = activeCategory === 'all' || a.category === activeCategory;
        const matchSearch = a.name.toLowerCase().includes(search);
        return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 50px; color: #897e7a;">Belum ada aset tersimpan.</div>`;
        return;
    }

    filtered.forEach((a, index) => {
        // Icon Logic
        let iconClass = "ph-file-zip";
        if (a.category === "Font") iconClass = "ph-text-aa";
        if (a.category === "Branding") iconClass = "ph-palette";
        if (a.category === "Tools") iconClass = "ph-wrench";
        if (a.category === "Preset") iconClass = "ph-camera";

        const card = document.createElement('div');
        card.className = 'asset-card';
        card.innerHTML = `
            <div class="asset-icon"><i class="ph ${iconClass}"></i></div>
            <h4>${a.name}</h4>
            <div class="asset-cat-tag">${a.category}</div>
            <a href="${a.link}" target="_blank" class="btn-open">Buka Aset</a>
            <button class="btn-del" onclick="deleteAsset(${index})">Hapus</button>
        `;
        grid.appendChild(card);
    });
}

// --- ACTIONS ---
function saveAsset() {
    const nameInput = document.getElementById('assetName');
    const linkInput = document.getElementById('assetLink');
    const catInput = document.getElementById('assetCategory');

    if (!nameInput.value || !linkInput.value) {
        alert("Lengkapi nama dan link aset!");
        return;
    }

    const newAsset = {
        name: nameInput.value,
        link: linkInput.value,
        category: catInput.value,
        id: Date.now()
    };

    assets.push(newAsset);
    localStorage.setItem('taufik_assets_db', JSON.stringify(assets));
    
    // Reset & Close
    nameInput.value = '';
    linkInput.value = '';
    closeModal();
    renderAssets();
}

function deleteAsset(index) {
    if (confirm("Hapus aset ini dari library?")) {
        assets.splice(index, 1);
        localStorage.setItem('taufik_assets_db', JSON.stringify(assets));
        renderAssets();
    }
}

function filterCategory(cat, btn) {
    activeCategory = cat;
    
    // Toggle Active Class
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    
    renderAssets();
}

// --- MODAL LOGIC ---
function openModal() {
    document.getElementById('assetModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('assetModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('assetModal');
    if (event.target == modal) closeModal();
}

// Initial Render
document.addEventListener('DOMContentLoaded', renderAssets);