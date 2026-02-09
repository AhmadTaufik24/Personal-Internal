// Fungsi untuk update waktu dan greeting secara realtime
function updateTime() {
    const now = new Date();
    
    // 1. Update Jam Digital
    const timeString = now.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    
    const clockElement = document.getElementById('clock');
    if (clockElement) {
        clockElement.textContent = timeString;
    }

    // 2. Update Greeting (Sapaan) berdasarkan jam
    const hour = now.getHours();
    let greetingText = '';

    if (hour >= 5 && hour < 12) {
        greetingText = 'Good Morning,';
    } else if (hour >= 12 && hour < 15) {
        greetingText = 'Good Afternoon,';
    } else if (hour >= 15 && hour < 19) {
        greetingText = 'Good Evening,';
    } else {
        greetingText = 'Good Night,';
    }

    const greetingElement = document.getElementById('greeting');
    if (greetingElement) {
        greetingElement.textContent = greetingText;
    }
}

// Jalankan fungsi saat halaman pertama kali load
document.addEventListener('DOMContentLoaded', () => {
    updateTime();
    // Update setiap 1 detik (1000 miliseconds)
    setInterval(updateTime, 1000);
});