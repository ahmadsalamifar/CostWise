export function formatPrice(n) {
    if (n === undefined || n === null) return '0';
    return Number(n).toLocaleString('en-US');
}

export function formatDate(d) {
    return d ? new Date(d).toLocaleDateString('fa-IR') : '';
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