// ==========================================
// TAUFIK FINANCE - JS ENGINE (V.FINAL)
// ==========================================

// --- CONFIG & DB LOAD ---
const RATES = { story: 50000, feed: 50000, reels: 150000 };
const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// Load Data dengan Safety Check
let jobOrders = [];
let manualTrans = [];

try {
    jobOrders = JSON.parse(localStorage.getItem('jo_db_v47')) || [];
    manualTrans = JSON.parse(localStorage.getItem('taufik_finance_db')) || [];
} catch (e) {
    console.error("Database Init Error:", e);
}

// Global State
let currentFilter = 'month'; // 'day', 'week', 'month', 'year', 'all'
let currentDateContext = new Date(); // Titik waktu yang dilihat user
let myChart = null; // Chart Instance

document.addEventListener('DOMContentLoaded', () => {
    updatePeriodLabel();
    renderDashboard();
});

// ==========================================
// 1. NAVIGASI WAKTU (TIME TRAVEL)
// ==========================================

function changePeriod(direction) {
    if (currentFilter === 'day') {
        currentDateContext.setDate(currentDateContext.getDate() + direction);
    } else if (currentFilter === 'week') {
        currentDateContext.setDate(currentDateContext.getDate() + (direction * 7));
    } else if (currentFilter === 'month') {
        currentDateContext.setMonth(currentDateContext.getMonth() + direction);
    } else if (currentFilter === 'year') {
        currentDateContext.setFullYear(currentDateContext.getFullYear() + direction);
    }
    // 'all' tidak berubah
    
    updatePeriodLabel();
    renderDashboard();
}

function updatePeriodLabel() {
    const labelTitle = document.getElementById('period-label');
    const labelValue = document.getElementById('period-value');
    if(!labelTitle) return;

    if(currentFilter === 'day') {
        labelTitle.innerText = "Hari";
        labelValue.innerText = currentDateContext.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric'});
    } else if(currentFilter === 'week') {
        labelTitle.innerText = "Minggu";
        // Hitung start - end minggu
        const start = new Date(currentDateContext);
        const day = start.getDay(); 
        start.setDate(start.getDate() - day); // Minggu ini (Start Sunday)
        const end = new Date(start);
        end.setDate(end.getDate() + 6); // End Saturday
        labelValue.innerText = `${start.getDate()} ${MONTH_NAMES[start.getMonth()].substring(0,3)} - ${end.getDate()} ${MONTH_NAMES[end.getMonth()].substring(0,3)}`;
    } else if(currentFilter === 'month') {
        labelTitle.innerText = "Bulan";
        labelValue.innerText = `${MONTH_NAMES[currentDateContext.getMonth()]} ${currentDateContext.getFullYear()}`;
    } else if(currentFilter === 'year') {
        labelTitle.innerText = "Tahun";
        labelValue.innerText = currentDateContext.getFullYear();
    } else {
        labelTitle.innerText = "Periode";
        labelValue.innerText = "Semua Waktu";
    }
}

function setFilter(type) {
    currentFilter = type;
    currentDateContext = new Date(); // Reset ke hari ini saat ganti tab
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-${type}`).classList.add('active');
    
    updatePeriodLabel();
    renderDashboard();
}

// ==========================================
// 2. DATA PROCESS (MERGE & FILTER)
// ==========================================

function getAllTransactions() {
    let allData = [];
    
    // Auto Data (Job Board)
    jobOrders.forEach(jo => {
        if (jo.stage === 'done') {
            let price = (jo.type === 'Adjust' || jo.category === 'General') ? (jo.manualPrice || 0) : 
                        (jo.type === 'Story' ? RATES.story : jo.type === 'Reels' ? RATES.reels : RATES.feed * (jo.slides || 1));
            
            allData.push({ 
                id: jo.id, title: jo.title, amount: price, type: 'income', 
                category: 'Freelance', date: jo.archivedDate, isAuto: true 
            });
        }
    });

    // Manual Data
    allData = [...allData, ...manualTrans];
    // Sort Descending (Terbaru di atas)
    return allData.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getFilteredData() {
    const all = getAllTransactions();
    
    const checkYear = (d) => d.getFullYear() === currentDateContext.getFullYear();
    const checkMonth = (d) => d.getMonth() === currentDateContext.getMonth() && checkYear(d);
    const checkDay = (d) => d.getDate() === currentDateContext.getDate() && checkMonth(d);
    
    // Minggu
    const startOfWeek = new Date(currentDateContext);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0,0,0,0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    return all.filter(t => {
        const d = new Date(t.date);
        // Reset jam agar komparasi tanggal akurat
        d.setHours(0,0,0,0);
        
        if (currentFilter === 'all') return true;
        if (currentFilter === 'day') return checkDay(d);
        if (currentFilter === 'month') return checkMonth(d);
        if (currentFilter === 'year') return checkYear(d);
        if (currentFilter === 'week') return d >= startOfWeek && d < endOfWeek;
        return true;
    });
}

function renderDashboard() {
    const data = getFilteredData();
    const allDataForBalance = getAllTransactions(); 

    // 1. Saldo Real (Aset Tetap)
    const walletBalance = allDataForBalance.reduce((acc, cur) => cur.type === 'income' ? acc + cur.amount : acc - cur.amount, 0);
    document.getElementById('wallet-balance').innerText = formatRp(walletBalance);

    // 2. Stats Calculation
    let totalInc = 0;
    let totalExp = 0;
    let catStats = {};

    data.forEach(t => {
        if(t.type === 'income') totalInc += t.amount;
        else totalExp += t.amount;

        const key = t.category;
        if(!catStats[key]) catStats[key] = { type: t.type, val: 0 };
        catStats[key].val += t.amount;
    });

    const cashflow = totalInc - totalExp;
    const savingRate = totalInc > 0 ? ((cashflow / totalInc) * 100).toFixed(0) : 0;

    // 3. Render Stats Cards
    document.getElementById('stat-income').innerText = formatRp(totalInc);
    document.getElementById('stat-expense').innerText = formatRp(totalExp);
    document.getElementById('stat-cashflow').innerText = formatRp(cashflow);
    document.getElementById('stat-saving').innerText = `${savingRate}%`;

    // 4. Render Components
    renderHighlights(catStats);
    renderTable(data);
    renderChart(catStats);
}

// ==========================================
// 3. UI COMPONENTS
// ==========================================

function renderHighlights(catStats) {
    let maxInc = { cat: '-', val: 0 };
    let maxExp = { cat: '-', val: 0 };

    Object.entries(catStats).forEach(([key, item]) => {
        if(item.type === 'income' && item.val > maxInc.val) maxInc = { cat: key, val: item.val };
        if(item.type === 'expense' && item.val > maxExp.val) maxExp = { cat: key, val: item.val };
    });

    document.getElementById('top-income-cat').innerText = maxInc.cat;
    document.getElementById('top-income-val').innerText = formatRp(maxInc.val);
    document.getElementById('top-expense-cat').innerText = maxExp.cat;
    document.getElementById('top-expense-val').innerText = formatRp(maxExp.val);
}

function renderTable(data) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    
    if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#aaa;">Data kosong di periode ini.</td></tr>`;
        return;
    }

    data.forEach(t => {
        const dateStr = new Date(t.date).toLocaleDateString('id-ID', { day:'numeric', month:'short' });
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td><strong>${t.title}</strong> ${t.isAuto ? '<span style="font-size:9px;color:blue;">(Auto)</span>' : ''}</td>
            <td><span class="badge ${t.type === 'income' ? 'inc' : 'exp'}">${t.category}</span></td>
            <td class="text-right" style="color:${t.type==='income'?'#10b981':'#ef4444'}">
                ${t.type==='income'?'+':'-'} ${formatRp(t.amount)}
            </td>
            <td class="text-right">
                ${!t.isAuto ? `<button class="btn-del" onclick="deleteManual('${t.id}')">✕</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderChart(catStats) {
    const ctx = document.getElementById('mainChart');
    if(!ctx) return; // Safety check

    let chartData = [];
    Object.entries(catStats).forEach(([key, item]) => chartData.push({ label: key, val: item.val, type: item.type }));
    
    // Sort & Slice Top 5
    chartData.sort((a,b) => b.val - a.val).slice(0, 5);

    let labels = chartData.map(d => d.label);
    let values = chartData.map(d => d.val);
    let colors = chartData.map(d => d.type === 'income' ? '#10b981' : '#ef4444');

    if(myChart) myChart.destroy();
    
    myChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { boxWidth: 10, font: {size: 11} } }
            }
        }
    });
}

// ==========================================
// 4. MODAL & ACTIONS (RESET INCLUDED)
// ==========================================

function openModal(type) {
    const modal = document.getElementById('financeModal');
    const catSelect = document.getElementById('inputCategory');
    
    // === RESET INPUT VALUES ===
    document.getElementById('inputAmount').value = '';
    document.getElementById('inputTitle').value = '';
    document.getElementById('inputDate').valueAsDate = new Date();
    
    document.getElementById('transType').value = type;
    document.getElementById('modalTitle').innerText = type === 'income' ? 'Catat Pemasukan' : 'Catat Pengeluaran';
    
    catSelect.innerHTML = '';
    const cats = type === 'income' ? 
        ['Gaji', 'Bonus', 'Freelance', 'Investasi', 'Hadiah', 'Refund'] : 
        ['Makan', 'Transport', 'Belanja', 'Tagihan', 'Hiburan', 'Sewa Alat', 'Lainnya'];
    cats.forEach(c => catSelect.add(new Option(c, c)));
    
    modal.style.display = 'flex';
}

function closeModal() { document.getElementById('financeModal').style.display = 'none'; }

function saveTransaction() {
    const amount = parseInt(document.getElementById('inputAmount').value);
    const title = document.getElementById('inputTitle').value;
    const category = document.getElementById('inputCategory').value;
    const date = document.getElementById('inputDate').value;
    const type = document.getElementById('transType').value;

    if(!amount || !title || !date) return alert("Data kurang lengkap!");

    manualTrans.push({
        id: 'm-' + Date.now(),
        title, amount, type, category, date, isAuto: false
    });
    
    localStorage.setItem('taufik_finance_db', JSON.stringify(manualTrans));
    closeModal();
    renderDashboard();
}

function deleteManual(id) {
    if(confirm("Hapus transaksi ini?")) {
        manualTrans = manualTrans.filter(t => t.id !== id);
        localStorage.setItem('taufik_finance_db', JSON.stringify(manualTrans));
        renderDashboard();
    }
}

// ==========================================
// 5. UTILS (FORMAT & BACKUP)
// ==========================================

function formatRp(n) { return new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', minimumFractionDigits:0 }).format(n); }

function backupData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ finance: manualTrans }));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = "TaufikFinance_Backup_" + new Date().toISOString().split('T')[0] + ".json";
    document.body.appendChild(a); a.click(); a.remove();
}

function restoreData(input) {
    const f = input.files[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = (e) => {
        try {
            const d = JSON.parse(e.target.result);
            if(d.finance) {
                manualTrans = d.finance;
                localStorage.setItem('taufik_finance_db', JSON.stringify(manualTrans));
                alert("Data berhasil dipulihkan!");
                location.reload();
            }
        } catch(err) { alert("File Backup Invalid!"); }
    };
    r.readAsText(f);
}

function exportCSV() {
    const data = getFilteredData();
    let csv = ['Tanggal,Judul,Tipe,Kategori,Nominal'];
    data.forEach(t => csv.push(`${t.date},"${t.title.replace(/,/g,' ')}",${t.type},${t.category},${t.amount}`));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv.join('\n')], {type: 'text/csv'}));
    link.download = `Keuangan_${currentFilter}.csv`;
    link.click();
}

// Klik luar modal -> tutup
window.onclick = function(e) { if(e.target == document.getElementById('financeModal')) closeModal(); }