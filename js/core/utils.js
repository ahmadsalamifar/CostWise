// js/core/utils.js
// توابع کمکی خالص (Pure Functions)

export function parseLocaleNumber(stringNumber) {
    if (!stringNumber) return 0;
    if (typeof stringNumber === 'number') return stringNumber;
    
    let str = stringNumber.toString().trim();
    str = str.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
             .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    const clean = str.replace(/[^0-9.-]/g, '');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
}

export function formatPrice(n) {
    if (n == null || isNaN(n)) return '۰';
    return Math.round(Number(n)).toLocaleString('fa-IR');
}

export function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fa-IR');
}

export function getDateBadge(dateString) {
    if (!dateString) return '';
    const diffDays = Math.ceil(Math.abs(new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24));
    let color = 'bg-emerald-100 text-emerald-700';
    if(diffDays > 30) color = 'bg-slate-100 text-slate-500';
    else if(diffDays > 7) color = 'bg-orange-100 text-orange-700';
    
    return `<span class="text-[10px] px-1.5 py-0.5 rounded border ${color}">${formatDate(dateString)}</span>`;
}

export function switchTab(id) {
    ['formulas', 'materials', 'categories', 'store', 'reports'].forEach(t => {
        document.getElementById('tab-' + t)?.classList.add('hidden');
        document.getElementById('btn-tab-' + t)?.classList.remove('active');
    });
    document.getElementById('tab-' + id)?.classList.remove('hidden');
    document.getElementById('btn-tab-' + id)?.classList.add('active');
}

export function openModal(id) {
    const el = document.getElementById(id);
    if(el) { el.classList.remove('hidden'); el.style.display = 'flex'; }
}

export function closeModal(id) {
    const el = document.getElementById(id);
    if(el) { el.classList.add('hidden'); el.style.display = 'none'; }
}