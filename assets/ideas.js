// ==========================================
// TAUFIK IDEA VAULT - LOGIC
// ==========================================

let ideas = [];
let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', () => {
    // Load data dari LocalStorage
    ideas = JSON.parse(localStorage.getItem('taufik_ideas_db')) || [];
    renderIdeas();
});

// --- RENDER FUNCTION ---
function renderIdeas() {
    const grid = document.getElementById('ideaGrid');
    const search = document.getElementById('searchInput').value.toLowerCase();
    
    grid.innerHTML = '';
    
    // Filter Kategori & Search
    const filtered = ideas.filter(idea => {
        const matchCat = currentCategory === 'all' || idea.category === currentCategory;
        const matchSearch = idea.title.toLowerCase().includes(search) || idea.desc.toLowerCase().includes(search);
        return matchCat && matchSearch;
    });

    // Sort: Terbaru di atas
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Jika Kosong
    if(filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:50px; color:#897e7a;">
            <i class="ph ph-lightbulb" style="font-size:40px; margin-bottom:10px; display:block; opacity:0.5;"></i>
            Belum ada ide. Yuk mulai catat!
        </div>`;
        return;
    }

    // Render Kartu
    filtered.forEach(idea => {
        const dateStr = new Date(idea.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        
        const card = document.createElement('div');
        card.className = 'idea-card';
        card.innerHTML = `
            <div class="card-top">
                <span class="tag ${idea.category}">${idea.category}</span>
                <span class="idea-date">${dateStr}</span>
            </div>
            <h3>${idea.title}</h3>
            <p>${idea.desc}</p>
            <div class="card-actions">
                <button class="btn-icon" onclick="copyIdea('${idea.id}')" title="Copy"><i class="ph ph-copy"></i></button>
                <button class="btn-icon delete" onclick="deleteIdea('${idea.id}')" title="Hapus"><i class="ph ph-trash"></i></button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- CRUD ACTIONS ---
function saveIdea() {
    const title = document.getElementById('ideaTitle').value;
    const desc = document.getElementById('ideaDesc').value;
    const category = document.getElementById('ideaCategory').value;

    if (!title) return alert("Judul ide tidak boleh kosong!");

    const newIdea = {
        id: 'idea-' + Date.now(),
        title,
        desc,
        category,
        date: new Date().toISOString()
    };

    ideas.push(newIdea);
    localStorage.setItem('taufik_ideas_db', JSON.stringify(ideas));
    
    closeModal();
    renderIdeas();
}

function deleteIdea(id) {
    if(confirm("Yakin hapus ide ini?")) {
        ideas = ideas.filter(i => i.id !== id);
        localStorage.setItem('taufik_ideas_db', JSON.stringify(ideas));
        renderIdeas();
    }
}

function copyIdea(id) {
    const idea = ideas.find(i => i.id === id);
    if(idea) {
        const text = `💡 *${idea.title}*\n\n${idea.desc}`;
        navigator.clipboard.writeText(text).then(() => {
            alert("Ide berhasil disalin!");
        });
    }
}

// --- UTILS ---
function filterCategory(cat) {
    currentCategory = cat;
    
    // Update status tombol aktif
    document.querySelectorAll('.cat-btn').forEach(btn => {
        if(btn.innerText === (cat === 'all' ? 'Semua' : cat)) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    renderIdeas();
}

function filterIdeas() {
    renderIdeas(); // Trigger render saat mengetik
}

// Modal Functions
function openModal() {
    document.getElementById('ideaModal').style.display = 'flex';
    document.getElementById('ideaTitle').value = '';
    document.getElementById('ideaDesc').value = '';
    document.getElementById('ideaTitle').focus();
}

function closeModal() {
    document.getElementById('ideaModal').style.display = 'none';
}

window.onclick = function(e) {
    if (e.target == document.getElementById('ideaModal')) closeModal();
}