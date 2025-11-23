// توابع کمکی UI فرمول‌ها
// توجه: تزریق HTML به فایل‌های core/layout منتقل شده است.

export function injectLayout() {
    // این تابع دیگر کاری انجام نمی‌دهد چون HTML توسط layout اصلی ساخته می‌شود.
    // برای سازگاری با کدهای قبلی این تابع خالی می‌ماند.
}

export function highlightSaveButton() {
    const btn = document.getElementById('btn-save-formula');
    if(btn) {
        btn.classList.remove('bg-slate-700', 'hover:bg-slate-600');
        btn.classList.add('bg-emerald-600', 'hover:bg-emerald-700', 'animate-pulse');
        btn.innerText = 'ثبت تغییرات (ذخیره نشده)';
    }
}

export function resetSaveButton() {
    const btn = document.getElementById('btn-save-formula');
    if(btn) {
        btn.className = 'btn bg-slate-700 hover:bg-slate-600 text-white w-full h-10 shadow-lg transition-all';
        btn.innerText = 'ثبت تغییرات';
        btn.disabled = false;
    }
}