// --- DATABASE LOKAL ---
let notes = JSON.parse(localStorage.getItem('taufik_pro_notes')) || [];
let selectedColor = '#ffffff';
let activeFilter = 'all';

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    updateGreeting();
    renderNotes();
    setupColorPicker();
    
    // Auto-Search Listener
    document.getElementById('searchInput').addEventListener('input', renderNotes);
});

// --- CORE FUNCTIONS ---

function updateGreeting() {
    const hour = new Date().getHours();
    const greetEl = document.getElementById('greeting');
    let text = "Selamat Pagi, Bro!";
    if(hour >= 12 && hour < 15) text = "Selamat Siang, Bro!";
    else if(hour >= 15 && hour < 18) text = "Selamat Sore, Bro!";
    else if(hour >= 18) text = "Selamat Malam, Bro!";
    greetEl.innerText = text;
}

function openModal(id = null) {
    const modal = document.getElementById('noteModal');
    const titleEl = document.getElementById('modalTitle');
    
    if (id) {
        // Edit Mode
        const n = notes.find(x => x.id === id);
        titleEl.innerText = "Edit Catatan";
        document.getElementById('noteId').value = n.id;
        document.getElementById('inputTitle').value = n.title;
        document.getElementById('inputCategory').value = n.category;
        document.getElementById('inputBody').value = n.body;
        document.getElementById('lastEdited').innerText = `Terakhir diubah: ${n.updated}`;
        selectColor(n.color);
    } else {
        // Create Mode
        titleEl.innerText = "Catatan Baru";
        document.getElementById('noteId').value = "";
        document.getElementById('inputTitle').value = "";
        document.getElementById('inputCategory').value = "Ide";
        document.getElementById('inputBody').value = "";
        document.getElementById('lastEdited').innerText = "";
        selectColor('#ffffff');
    }
    
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('noteModal').style.display = 'none';
}

function saveNote() {
    const id = document.getElementById('noteId').value;
    const title = document.getElementById('inputTitle').value;
    const category = document.getElementById('inputCategory').value;
    const body = document.getElementById('inputBody').value;

    if (!title && !body) return alert("Waduh, judul atau isi catatan jangan kosong Bro!");

    const timestamp = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    if (id) {
        // Update Existing
        const idx = notes.findIndex(x => x.id === id);
        notes[idx] = { ...notes[idx], title, category, body, color: selectedColor, updated: timestamp };
    } else {
        // Create New
        const newNote = {
            id: 'note-' + Date.now(),
            title: title || 'Tanpa Judul',
            category,
            body,
            color: selectedColor,
            pinned: false,
            updated: timestamp
        };
        notes.push(newNote);
    }

    saveToLocal();
    closeModal();
    renderNotes();
}

function deleteNote(id, e) {
    e.stopPropagation();
    if (confirm("Yakin mau hapus catatan ini?")) {
        notes = notes.filter(n => n.id !== id);
        saveToLocal();
        renderNotes();
    }
}

function togglePin(id, e) {
    e.stopPropagation();
    const idx = notes.findIndex(n => n.id === id);
    notes[idx].pinned = !notes[idx].pinned;
    saveToLocal();
    renderNotes();
}

function filterNotes(category) {
    activeFilter = category;
    
    // Update UI Tombol Sidebar
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        // Simple check text content matching
        if(btn.innerText.includes(category === 'all' ? 'Semua' : category) || 
           (category === 'pinned' && btn.innerText.includes('Penting'))) {
            btn.classList.add('active');
        }
    });

    renderNotes();
}

function renderNotes() {
    const grid = document.getElementById('notes-grid');
    const searchVal = document.getElementById('searchInput').value.toLowerCase();
    
    // Filter Logic
    let filtered = notes.filter(n => {
        const matchSearch = n.title.toLowerCase().includes(searchVal) || n.body.toLowerCase().includes(searchVal);
        const matchCat = (activeFilter === 'all') || 
                         (activeFilter === 'pinned' && n.pinned) || 
                         (n.category === activeFilter);
        return matchSearch && matchCat;
    });

    // Sort: Pinned First
    filtered.sort((a, b) => b.pinned - a.pinned);

    grid.innerHTML = '';
    
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 50px; opacity: 0.5;">
                <span style="font-size: 50px;">🍃</span>
                <p>Belum ada catatan di sini, Bro.</p>
            </div>
        `;
    } else {
        filtered.forEach(n => {
            const card = document.createElement('div');
            card.className = 'note-card';
            card.style.background = n.color;
            // Add subtle border if white
            if(n.color === '#ffffff') card.style.border = '1px solid #e0e0e0';

            // Badge Color Logic
            let badgeBg = 'rgba(0,0,0,0.05)';
            if(n.category === 'Ide') badgeBg = '#fff3cd'; 
            if(n.category === 'Revisi') badgeBg = '#f8d7da';
            if(n.category === 'Project') badgeBg = '#d1e7dd';
            if(n.category === 'Personal') badgeBg = '#e2e3e5';

            card.onclick = (e) => { if(!e.target.closest('.tool-btn')) openModal(n.id); };

            card.innerHTML = `
                <div class="card-header">
                    <span class="badge" style="background:${badgeBg}">${n.category}</span>
                    <div class="card-tools">
                        <button class="tool-btn ${n.pinned?'pinned':''}" onclick="togglePin('${n.id}', event)" title="Pin">📌</button>
                        <button class="tool-btn" onclick="deleteNote('${n.id}', event)" title="Hapus">🗑️</button>
                    </div>
                </div>
                <h3 class="note-title">${n.title}</h3>
                <p class="note-excerpt">${n.body}</p>
                <div class="note-footer">
                    <span>${n.updated}</span>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // Update Stats
    document.getElementById('total-notes').innerText = notes.length;
}

// --- UTILITIES ---
function saveToLocal() {
    localStorage.setItem('taufik_pro_notes', JSON.stringify(notes));
}

function setupColorPicker() {
    document.querySelectorAll('.color-opt').forEach(opt => {
        opt.onclick = () => selectColor(opt.dataset.color);
    });
}

function selectColor(color) {
    selectedColor = color;
    document.querySelectorAll('.color-opt').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.color === color);
    });
}

// Close Modal on Outside Click
window.onclick = function(event) {
    const modal = document.getElementById('noteModal');
    if (event.target == modal) closeModal();
}