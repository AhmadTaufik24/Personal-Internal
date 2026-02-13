// --- DATABASE ---
let clients = JSON.parse(localStorage.getItem('taufik_crm_v2')) || [];
let jobOrders = JSON.parse(localStorage.getItem('jo_db_v47')) || [];

let currentDetailIndex = null;

// --- CONFIG HARGA (Agar Sinkron dengan Job Order) ---
const RATES = { 
    story: 50000, 
    feed: 50000, 
    reels: 150000 
};

// --- HELPER: HITUNG HARGA JOB ---
function calculateJobPrice(job) {
    if (job.category === 'General' || job.type === 'Adjust') {
        return parseInt(job.manualPrice) || 0;
    } else {
        if (job.type === 'Story') return RATES.story;
        else if (job.type === 'Reels') return RATES.reels;
        else return RATES.feed * (parseInt(job.slides) || 1);
    }
}

// --- HELPER: FILTER JOB VALID (KUNCI PERBAIKAN) ---
// Fungsi ini memastikan job yang di-VOID tidak ikut dihitung
function getValidClientJobs(clientName) {
    return jobOrders.filter(job => {
        // 1. Cek Nama Klien
        const isClientMatch = job.clientName && job.clientName.toLowerCase() === clientName.toLowerCase();
        
        // 2. Cek Status VOID (Ini perbaikannya!)
        // Job tidak akan dihitung jika statusText-nya "VOIDED"
        const isNotVoid = job.statusText !== 'VOIDED';

        return isClientMatch && isNotVoid;
    });
}

// --- RENDER UTAMA ---
function renderClients() {
    const grid = document.getElementById('clientGrid');
    const search = document.getElementById('searchInput').value.toLowerCase();
    grid.innerHTML = '';

    let totalRevenue = 0;
    let vipCount = 0;

    const filtered = clients.filter(c => c.name.toLowerCase().includes(search));

    filtered.forEach((client, index) => {
        // Gunakan Filter Baru (Anti-Void)
        const clientJobs = getValidClientJobs(client.name);
        
        // Hitung Total Spent
        const totalSpent = clientJobs.reduce((sum, job) => sum + calculateJobPrice(job), 0);
        
        totalRevenue += totalSpent;
        if (totalSpent >= 10000000) vipCount++;

        let tierLabel = 'NEW MEMBER';
        let tierClass = ''; 
        if(totalSpent > 10000000) { tierLabel = 'VIP GOLD'; tierClass = 'border: 2px solid #FFD700;'; }
        else if(totalSpent > 3000000) { tierLabel = 'LOYAL SILVER'; tierClass = 'border: 2px solid #C0C0C0;'; }

        const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalSpent);

        const card = document.createElement('div');
        card.className = 'client-card';
        card.style = tierClass;
        card.onclick = () => openDetailModal(index);

        card.innerHTML = `
            <div class="card-header">
                <div class="client-avatar">${client.name.charAt(0).toUpperCase()}</div>
                <div class="client-info">
                    <h4>${client.name}</h4>
                    <p>${client.company}</p>
                </div>
            </div>
            <div class="card-stats">
                <div class="c-stat">
                    <span>Total Proyek</span>
                    <strong>${clientJobs.length} Jobs</strong>
                </div>
                <div class="c-stat" style="text-align:right;">
                    <span>Total Nilai (LTV)</span>
                    <strong class="text-green">${rupiah}</strong>
                </div>
            </div>
            <div style="font-size:10px; text-align:center; margin-top:15px; letter-spacing:1px; font-weight:700; opacity:0.6; color:#456d91;">${tierLabel}</div>
        `;
        grid.appendChild(card);
    });

    document.getElementById('totalClients').innerText = filtered.length;
    document.getElementById('totalRevenue').innerText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalRevenue);
    document.getElementById('totalVip').innerText = vipCount;
}

// --- MODAL DETAIL 360 ---
function openDetailModal(index) {
    currentDetailIndex = index;
    const client = clients[index];
    
    // Gunakan Filter Baru (Anti-Void) juga di sini
    const clientJobs = getValidClientJobs(client.name);
    
    // Hitung Total Spent
    const totalSpent = clientJobs.reduce((sum, job) => sum + calculateJobPrice(job), 0);
    const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalSpent);

    // Isi Panel Kiri
    document.getElementById('detailInitial').innerText = client.name.charAt(0).toUpperCase();
    document.getElementById('detailName').innerText = client.name;
    document.getElementById('detailCompany').innerText = client.company;
    document.getElementById('detailSpent').innerText = rupiah;
    document.getElementById('detailCount').innerText = clientJobs.length + " Proyek";
    document.getElementById('detailDate').innerText = client.joinDate || "-";
    
    const tierBadge = document.getElementById('detailTier');
    if(totalSpent > 10000000) { tierBadge.innerText = 'VIP GOLD MEMBER'; tierBadge.style.background = '#FFD700'; }
    else if(totalSpent > 3000000) { tierBadge.innerText = 'LOYAL SILVER'; tierBadge.style.background = '#C0C0C0'; }
    else { tierBadge.innerText = 'NEW MEMBER'; tierBadge.style.background = '#cd7f32'; }

    document.getElementById('btnWA').href = `https://wa.me/${client.phone}`;
    document.getElementById('btnEmail').href = `mailto:${client.email}`;

    // Isi Panel Kanan (Tabel History)
    const historyBody = document.getElementById('historyBody');
    const noHistory = document.getElementById('noHistoryMsg');
    historyBody.innerHTML = '';

    if (clientJobs.length === 0) {
        noHistory.style.display = 'block';
    } else {
        noHistory.style.display = 'none';
        clientJobs.forEach(job => {
            const price = calculateJobPrice(job);
            const statusDisplay = job.statusText || job.stage.toUpperCase();
            
            let statusColor = '#94a3b8'; 
            if(job.stage === 'done' || job.statusText?.includes('Approved')) statusColor = '#10b981'; 
            if(job.statusText?.includes('Revisi')) statusColor = '#f59e0b'; 
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="font-weight:600;">${job.title}</td>
                <td>${job.category}</td>
                <td><span style="padding:4px 8px; border-radius:4px; font-size:10px; background:${statusColor}; color:white;">${statusDisplay}</span></td>
                <td>Rp ${price.toLocaleString('id-ID')}</td>
            `;
            historyBody.appendChild(row);
        });
    }

    document.getElementById('detailModal').style.display = 'flex';
}

// --- FUNGSI KLIK DI LUAR (TUTUP OTOMATIS) ---
window.onclick = function(event) {
    const detailModal = document.getElementById('detailModal');
    const addModal = document.getElementById('addModal');

    if (event.target === detailModal) {
        detailModal.style.display = "none";
    }
    if (event.target === addModal) {
        addModal.style.display = "none";
    }
}

// --- CRUD ---
function saveNewClient() {
    const name = document.getElementById('inputName').value;
    const company = document.getElementById('inputCompany').value;
    const phone = document.getElementById('inputPhone').value;
    const email = document.getElementById('inputEmail').value;

    if(!name) return alert("Nama Klien Wajib Diisi!");

    clients.push({
        name, company, phone, email,
        joinDate: new Date().toLocaleDateString('id-ID')
    });
    localStorage.setItem('taufik_crm_v2', JSON.stringify(clients));
    
    closeAddModal();
    renderClients();
}

function deleteCurrentClient() {
    if(confirm("Hapus klien ini dari database CRM?")) {
        clients.splice(currentDetailIndex, 1);
        localStorage.setItem('taufik_crm_v2', JSON.stringify(clients));
        closeDetailModal();
        renderClients();
    }
}

function openAddModal() { document.getElementById('addModal').style.display = 'flex'; }
function closeAddModal() { document.getElementById('addModal').style.display = 'none'; }
function closeDetailModal() { document.getElementById('detailModal').style.display = 'none'; }

// --- BACKUP & RESTORE ---
function downloadBackup() {
    const jobs = JSON.parse(localStorage.getItem('jo_db_v47')) || [];
    const clients = JSON.parse(localStorage.getItem('taufik_crm_v2')) || [];
    const masterData = { tipe: "MASTER_BACKUP_TAUFIK", tanggal: new Date().toLocaleString(), data_jobs: jobs, data_clients: clients };

    const a = document.createElement('a');
    a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(masterData));
    a.download = `DATA_MASTER_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
}

function restoreBackup(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const content = JSON.parse(e.target.result);
            if (content.tipe === "MASTER_BACKUP_TAUFIK") {
                if (confirm("⚠️ Timpa semua data (Job & Client) dengan file backup ini?")) {
                    localStorage.setItem('jo_db_v47', JSON.stringify(content.data_jobs));
                    localStorage.setItem('taufik_crm_v2', JSON.stringify(content.data_clients));
                    alert("✅ Data berhasil dipulihkan!");
                    location.reload();
                }
            } else { alert("❌ Format file salah."); }
        } catch (err) { alert("❌ File error."); }
    };
    reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', () => {
    renderClients();
    jobOrders = JSON.parse(localStorage.getItem('jo_db_v47')) || [];
});
