export function formatPrice(n) {
    if (n === undefined || n === null) return '0';
    return Number(n).toLocaleString('en-US');
}

export function formatDate(d) {
    return d ? new Date(d).toLocaleDateString('fa-IR') : '';
}

export function getDateBadge(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const diffTime = Math.abs(new Date() - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // سبز برای جدید (زیر ۷ روز)، نارنجی برای قدیمی
    const color = diffDays < 7 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-orange-600 bg-orange-50 border-orange-200';
    return `<span class="text-[10px] px-1.5 py-0.5 rounded border ${color}">${formatDate(dateString)}</span>`;
}

export function formatInput(el) {
    const r = el.value.replace(/[^0-9.]/g, '');
    el.value = r ? parseFloat(r).toLocaleString('en-US') : '';
}

export function switchTab(id) {
    ['formulas', 'materials', 'categories', 'store'].forEach(t => {
        const el = document.getElementById('tab-' + t);
        const btn = document.getElementById('btn-tab-' + t);
        if (el) el.classList.add('hidden');
        if (btn) btn.classList.remove('active');
    });
    document.getElementById('tab-' + id).classList.remove('hidden');
    document.getElementById('btn-tab-' + id).classList.add('active');
}

export function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.remove('hidden');
        el.style.display = 'flex';
    }
}

export function closeModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('hidden');
        el.style.display = 'none';
    }
}