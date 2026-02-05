// سیستم نمایش نوتیفیکیشن (Toast)
// جایگزینی زیبا برای alert() با استفاده از Tailwind CSS

let toastContainer = null;

function createContainer() {
    if (document.getElementById('toast-container')) return;
    
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed bottom-4 left-4 z-[9999] flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(toastContainer);
}

/**
 * نمایش پیام
 * @param {string} message - متن پیام
 * @param {string} type - نوع پیام (success, error, info)
 */
export function showToast(message, type = 'info') {
    if (!toastContainer) createContainer();

    const toast = document.createElement('div');
    
    // استایل‌های پایه
    let bgClass = 'bg-slate-800';
    let icon = 'ℹ️';

    if (type === 'success') {
        bgClass = 'bg-emerald-600';
        icon = '✅';
    } else if (type === 'error') {
        bgClass = 'bg-rose-600';
        icon = '⚠️';
    }

    toast.className = `
        ${bgClass} text-white px-4 py-3 rounded-lg shadow-lg 
        flex items-center gap-3 min-w-[300px] max-w-sm
        transform transition-all duration-300 translate-y-10 opacity-0
        pointer-events-auto font-bold text-sm border border-white/10
    `;

    toast.innerHTML = `
        <span class="text-lg">${icon}</span>
        <p class="flex-1 leading-tight">${message}</p>
    `;

    toastContainer.appendChild(toast);

    // انیمیشن ورود
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    });

    // حذف خودکار بعد از ۳ ثانیه
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}