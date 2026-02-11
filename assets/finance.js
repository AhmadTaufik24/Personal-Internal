// ==========================================
// TAUFIK FINANCE - ENGINE (LOCAL DATE FIX)
// ==========================================

// --- 1. KONFIGURASI ---
const APP_PASSWORD = "1234"; 
const RATES = { story: 50000, feed: 50000, reels: 150000 };
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

// --- 2. LOAD DATABASE ---
let jobOrders = [], manualTrans = [], debtDB = [];

try {
    jobOrders = JSON.parse(localStorage.getItem('jo_db_v47')) || [];
    manualTrans = JSON.parse(localStorage.getItem('taufik_finance_db')) || [];
    debtDB = JSON.parse(localStorage.getItem('taufik_debt_db')) || [];
} catch (e) { console.error("Database Error:", e); }

// --- 3. GLOBAL STATE ---
let currentFilter = 'month';
let currentDateContext = new Date();
let myChart = null;
let currentDebtTab = 'payable';

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    // Set Input Tanggal ke Hari Ini (WIB)
    const dateInput = document.getElementById('inputDate');
    if(dateInput) dateInput.value = getLocalTodayDate();
    console.log("System Locked.");
});

// --- HELPER: GET LOCAL DATE (WIB) ---
function getLocalTodayDate() {
    const d = new Date();
    // Mengambil tahun, bulan, tanggal lokal komputer user
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ==========================================
// 4. SECURITY SYSTEM (LOGIN)
// ==========================================
function checkPassword() {
    const input = document.getElementById('passwordInput').value;
    const errorMsg = document.getElementById('login-error');
    const loginScreen = document.getElementById('login-screen');
    const dashboard = document.getElementById('main-dashboard');

    if (input === APP_PASSWORD) {
        loginScreen.style.display = 'none';
        dashboard.style.display = 'flex';
        updatePeriodLabel();
        renderDashboard();
    } else {
        errorMsg.style.display = 'block';
        document.getElementById('passwordInput').value = '';
    }
}
document.getElementById('passwordInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') checkPassword();
});

// ==========================================
// 5. NAVIGASI WAKTU
// ==========================================
function changePeriod(direction) {
    if (currentFilter === 'day') currentDateContext.setDate(currentDateContext.getDate() + direction);
    else if (currentFilter === 'week') currentDateContext.setDate(currentDateContext.getDate() + (direction * 7));
    else if (currentFilter === 'month') currentDateContext.setMonth(currentDateContext.getMonth() + direction);
    else if (currentFilter === 'year') currentDateContext.setFullYear(currentDateContext.getFullYear() + direction);
    updatePeriodLabel(); renderDashboard();
}

function updatePeriodLabel() {
    const labelTitle = document.getElementById('period-label');
    const labelValue = document.getElementById('period-value');
    if(!labelTitle) return;
    
    let text = "Semua";
    if(currentFilter === 'month') text = `${MONTH_NAMES[currentDateContext.getMonth()]} ${currentDateContext.getFullYear()}`;
    else if(currentFilter === 'year') text = currentDateContext.getFullYear();
    else if(currentFilter === 'day') text = currentDateContext.toLocaleDateString('id-ID');
    
    labelTitle.innerText = currentFilter.toUpperCase();
    labelValue.innerText = text;
}

function setFilter(type) {
    currentFilter = type; 
    currentDateContext = new Date();
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-${type}`).classList.add('active');
    updatePeriodLabel(); renderDashboard();
}

// ==========================================
// 6. CORE CALCULATION
// ==========================================
function getAllTransactions() {
    let allData = [];
    jobOrders.forEach(jo => {
        if (jo.stage === 'done') {
            let price = (jo.type === 'Adjust' || jo.category === 'General') ? (jo.manualPrice || 0) : 
                        (jo.type === 'Story' ? RATES.story : jo.type === 'Reels' ? RATES.reels : RATES.feed * (jo.slides || 1));
            // Safety Check
            if (isNaN(price) || price === null) price = 0;
            allData.push({ id: jo.id, title: jo.title, amount: price, type: 'income', category: 'Freelance', date: jo.archivedDate, isAuto: true });
        }
    });
    allData = [...allData, ...manualTrans];
    return allData.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getFilteredData() {
    const all = getAllTransactions();
    const cYear = currentDateContext.getFullYear();
    const cMonth = currentDateContext.getMonth();
    const cDate = currentDateContext.getDate();
    
    return all.filter(t => {
        const d = new Date(t.date);
        if(currentFilter === 'all') return true;
        if(currentFilter === 'year') return d.getFullYear() === cYear;
        if(currentFilter === 'month') return d.getMonth() === cMonth && d.getFullYear() === cYear;
        if(currentFilter === 'day') return d.getDate() === cDate && d.getMonth() === cMonth;
        return true;
    });
}

function renderDashboard() {
    const data = getFilteredData();
    const allData = getAllTransactions();

    // LOGIKA SALDO (Total Inc - Total Exp)
    const realBalance = allData.reduce((acc, cur) => {
        const val = cur.amount || 0;
        return cur.type === 'income' ? acc + val : acc - val;
    }, 0);
    document.getElementById('wallet-balance').innerText = formatRp(realBalance);

    let inc = 0, exp = 0, catStats = {};
    data.forEach(t => {
        const val = t.amount || 0;
        if(t.type === 'income') inc += val; else exp += val;
        
        const key = t.category;
        if(!catStats[key]) catStats[key] = { type: t.type, val: 0 };
        catStats[key].val += val;
    });

    document.getElementById('stat-income').innerText = formatRp(inc);
    document.getElementById('stat-expense').innerText = formatRp(exp);
    document.getElementById('stat-cashflow').innerText = formatRp(inc - exp);
    document.getElementById('stat-saving').innerText = inc > 0 ? (( (inc - exp) / inc) * 100).toFixed(0) + "%" : "0%";

    renderHighlights(catStats);
    renderTable(data);
    renderChart(catStats);
}

// ==========================================
// 7. UI RENDERERS
// ==========================================
function renderHighlights(catStats) {
    let maxInc = { c:'-', v:0 }, maxExp = { c:'-', v:0 };
    Object.entries(catStats).forEach(([k, i]) => {
        const val = i.val || 0;
        if(i.type === 'income' && val > maxInc.v) maxInc = {c:k, v:val};
        if(i.type === 'expense' && val > maxExp.v) maxExp = {c:k, v:val};
    });
    document.getElementById('top-income-cat').innerText = maxInc.c;
    document.getElementById('top-income-val').innerText = formatRp(maxInc.v);
    document.getElementById('top-expense-cat').innerText = maxExp.c;
    document.getElementById('top-expense-val').innerText = formatRp(maxExp.v);
}

function renderTable(data) {
    const tbody = document.getElementById('table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:#aaa">Belum ada data.</td></tr>`;
        return;
    }

    data.forEach(t => {
        const dStr = new Date(t.date).toLocaleDateString('id-ID', {day:'numeric', month:'short'});
        const val = t.amount || 0;
        tbody.innerHTML += `
            <tr>
                <td>${dStr}</td>
                <td><strong>${t.title}</strong> ${t.isAuto ? '<span style="font-size:9px;color:blue">(Auto)</span>' : ''}</td>
                <td><span class="badge ${t.type==='income'?'inc':'exp'}">${t.category}</span></td>
                <td class="text-right" style="color:${t.type==='income'?'#10b981':'#ef4444'}">
                    ${t.type==='income'?'+':'-'} ${formatRp(val)}
                </td>
                <td class="text-right">
                    ${!t.isAuto ? `<button class="btn-del" onclick="deleteManual('${t.id}')">✕</button>` : ''}
                </td>
            </tr>`;
    });
}

function renderChart(catStats) {
    const ctx = document.getElementById('mainChart');
    if(!ctx) return;
    
    let arr = [];
    Object.entries(catStats).forEach(([k,v]) => arr.push({l:k, v:(v.val||0), c:v.type==='income'?'#10b981':'#ef4444'}));
    arr.sort((a,b) => b.v - a.v).slice(0,5);
    
    if(myChart) myChart.destroy();
    myChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: { 
            labels: arr.map(d=>d.l), 
            datasets: [{ data: arr.map(d=>d.v), backgroundColor: arr.map(d=>d.c), borderWidth:0, hoverOffset:4 }] 
        },
        options: { 
            responsive:true, 
            maintainAspectRatio:false, 
            plugins:{ legend:{position:'right', labels:{boxWidth:10, font:{size:11}}} } 
        }
    });
}

// ==========================================
// 8. SISTEM BUKU HUTANG (FIXED DATE)
// ==========================================
function openDebtModal() {
    document.getElementById('debtModal').style.display = 'flex';
    renderDebtList();
}
function closeDebtModal() { document.getElementById('debtModal').style.display = 'none'; }
function switchDebtTab(tab) {
    currentDebtTab = tab;
    document.querySelectorAll('.debt-tab').forEach(b => b.classList.remove('active'));
    document.querySelector(`.debt-tab[onclick="switchDebtTab('${tab}')"]`).classList.add('active');
    renderDebtList();
}
function openAddDebtForm() { document.getElementById('addDebtForm').style.display = 'flex'; }
function closeAddDebtForm() { document.getElementById('addDebtForm').style.display = 'none'; }

function saveNewDebt() {
    const name = document.getElementById('debtName').value;
    const amount = parseInt(document.getElementById('debtAmount').value);
    const note = document.getElementById('debtNote').value;

    if(!name || !amount) return alert("Isi nama dan nominal!");

    // Simpan ke DB
    debtDB.push({
        id: 'd-' + Date.now(),
        name,
        total: amount,
        paid: 0,
        type: currentDebtTab, 
        note,
        status: 'active'
    });
    localStorage.setItem('taufik_debt_db', JSON.stringify(debtDB));

    // AUTO SYNC (Pake Tanggal Lokal)
    const today = getLocalTodayDate(); // <--- FIX HERE
    const transTitle = currentDebtTab === 'payable' ? `Hutang Baru: ${name}` : `Pinjamkan ke: ${name}`;
    const transCat = currentDebtTab === 'payable' ? `Beban Hutang` : `Piutang Keluar`;
    
    manualTrans.push({
        id: 'auto-debt-'+Date.now(),
        title: transTitle,
        amount: amount,
        type: 'expense', 
        category: transCat,
        date: today,
        isAuto: false
    });
    localStorage.setItem('taufik_finance_db', JSON.stringify(manualTrans));

    closeAddDebtForm();
    renderDebtList();
    renderDashboard(); 
}

function renderDebtList() {
    const list = document.getElementById('debtList');
    list.innerHTML = '';
    const filtered = debtDB.filter(d => d.type === currentDebtTab && d.status === 'active');
    
    if(filtered.length === 0) { list.innerHTML = `<div style="text-align:center; padding:30px; color:#aaa;">Tidak ada catatan aktif.</div>`; return; }

    filtered.forEach(d => {
        const percent = Math.min((d.paid / d.total) * 100, 100);
        const sisa = d.total - d.paid;
        
        list.innerHTML += `
            <div class="debt-card type-${d.type}">
                <div class="debt-header"><h4>${d.name}</h4><small>${d.note}</small></div>
                <div class="progress-container"><div class="progress-bar" style="width:${percent}%"></div></div>
                <div class="debt-stats"><span>Terbayar: ${formatRp(d.paid)}</span><strong>Sisa: ${formatRp(sisa)}</strong></div>
                <div class="debt-actions">
                    <button class="btn-pay" onclick="payDebt('${d.id}')">
                        ${d.type === 'payable' ? '💸 Bayar Cicilan' : '💰 Terima Pembayaran'}
                    </button>
                    <button class="btn-del" onclick="deleteDebt('${d.id}')">Hapus</button>
                </div>
            </div>`;
    });
}

function payDebt(id) {
    const amount = prompt("Masukkan nominal pembayaran:");
    if(!amount) return;
    const payVal = parseInt(amount);
    
    const idx = debtDB.findIndex(d => d.id === id);
    if(idx === -1) return;
    const debt = debtDB[idx];
    
    debt.paid += payVal; 
    if(debt.paid >= debt.total) {
        if(confirm("Lunas! Arsipkan ke history?")) debt.status = 'done';
    }
    localStorage.setItem('taufik_debt_db', JSON.stringify(debtDB));
    
    // AUTO SYNC RECOVERY (Pake Tanggal Lokal)
    const today = getLocalTodayDate(); // <--- FIX HERE
    const transTitle = debt.type === 'payable' ? `Bayar Hutang: ${debt.name}` : `Diterima dari: ${debt.name}`;
    const transCat = debt.type === 'payable' ? `Pelunasan Hutang` : `Pelunasan Piutang`;

    manualTrans.push({
        id: 'auto-pay-'+Date.now(),
        title: transTitle,
        amount: payVal,
        type: 'income', 
        category: transCat,
        date: today,
        isAuto: false
    });
    localStorage.setItem('taufik_finance_db', JSON.stringify(manualTrans));

    renderDebtList();
    renderDashboard(); 
}

function deleteDebt(id) {
    if(confirm("Hapus catatan hutang ini? (History transaksi tetap ada)")) {
        debtDB = debtDB.filter(d => d.id !== id);
        localStorage.setItem('taufik_debt_db', JSON.stringify(debtDB));
        renderDebtList();
        renderDashboard();
    }
}

// ==========================================
// 9. MODAL & UTILS
// ==========================================
function openModal(type) {
    const modal = document.getElementById('financeModal');
    const catSelect = document.getElementById('inputCategory');
    document.getElementById('inputAmount').value = '';
    document.getElementById('inputTitle').value = '';
    document.getElementById('transType').value = type;
    document.getElementById('modalTitle').innerText = type === 'income' ? 'Catat Pemasukan' : 'Catat Pengeluaran';
    
    // Set Input Tanggal ke Hari Ini (WIB)
    document.getElementById('inputDate').value = getLocalTodayDate();
    
    catSelect.innerHTML = '';
    let cats = [];
    if(type==='income') {
        cats = ['Gaji Utama', 'Freelance Project', 'Bonus / THR', 'Pasif Income', 'Investasi (Cair)', 'Hadiah', 'Refund', 'Lainnya'];
    } else {
        cats = ['Makan & Minum', 'Transport (Bensin/Ojol)', 'Belanja Bulanan', 'Kuota & Internet', 'Tagihan (Listrik/Air)', 'Sewa Studio', 'Software & Tools', 'Hiburan', 'Kesehatan', 'Sedekah', 'Keluarga', 'Lainnya'];
    }
    cats.forEach(c => catSelect.add(new Option(c, c)));
    modal.style.display = 'flex';
}

function closeModal() { document.getElementById('financeModal').style.display = 'none'; }

function saveTransaction() {
    const amount = parseInt(document.getElementById('inputAmount').value);
    const title = document.getElementById('inputTitle').value;
    const category = document.getElementById('inputCategory').value;
    const type = document.getElementById('transType').value;
    
    // Gunakan tanggal input, kalau kosong pakai hari ini (WIB)
    const date = document.getElementById('inputDate').value || getLocalTodayDate();

    if(!amount || !title) return alert("Lengkapi data!");

    manualTrans.push({ id:'m-'+Date.now(), title, amount, type, category, date, isAuto: false });
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

function formatRp(n) {
    if (isNaN(n) || n === null || n === undefined) return "Rp 0"; 
    return new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', minimumFractionDigits:0 }).format(n);
}

function backupData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ finance: manualTrans, debt: debtDB }));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = "Backup_Taufik_" + getLocalTodayDate() + ".json";
    document.body.appendChild(a); a.click(); a.remove();
}

function restoreData(input) {
    const f = input.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = (e) => {
        try {
            const d = JSON.parse(e.target.result);
            if(d.finance) { manualTrans = d.finance; localStorage.setItem('taufik_finance_db', JSON.stringify(manualTrans)); }
            if(d.debt) { debtDB = d.debt; localStorage.setItem('taufik_debt_db', JSON.stringify(debtDB)); }
            alert("Data berhasil dipulihkan!");
            location.reload();
        } catch(e) { alert("File Backup Rusak/Salah."); }
    };
    r.readAsText(f);
}

function exportCSV() {
    const data = getAllTransactions();
    let csv = ['Tanggal,Judul,Tipe,Kategori,Nominal'];
    data.forEach(t => csv.push(`${t.date},"${t.title.replace(/,/g,' ')}",${t.type},${t.category},${t.amount}`));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv.join('\n')], {type: 'text/csv'}));
    link.download = `Laporan_Keuangan.csv`; link.click();
}

window.onclick = function(e) { 
    if(e.target == document.getElementById('financeModal')) closeModal();
    if(e.target == document.getElementById('debtModal')) closeDebtModal();
    if(e.target == document.getElementById('addDebtForm')) closeAddDebtForm();
}
