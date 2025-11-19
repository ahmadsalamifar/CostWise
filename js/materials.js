import { api } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { formatPrice } from './utils.js';

export function setupMaterials(refreshCallback) {
    document.getElementById('material-form').onsubmit = (e) => { e.preventDefault(); saveMaterial(refreshCallback); };
    document.getElementById('mat-cancel-btn').onclick = resetMatForm;
    document.getElementById('search-materials').oninput = (e) => renderMaterials(e.target.value);
    document.getElementById('sort-materials').onchange = () => renderMaterials();
}

async function saveMaterial(cb) {
    const id = document.getElementById('mat-id').value;
    const data = {
        name: document.getElementById('mat-name').value,
        unit: document.getElementById('mat-unit').value,
        price: parseFloat(document.getElementById('mat-price').value.replace(/,/g,'')) || 0,
        category_id: document.getElementById('mat-category').value || null
    };
    try {
        if(id) await api.update(APPWRITE_CONFIG.COLS.MATS, id, data);
        else await api.create(APPWRITE_CONFIG.COLS.MATS, data);
        resetMatForm();
        cb();
    } catch(e){ alert(e.message); }
}

export function renderMaterials(filter='') {
    const sort = document.getElementById('sort-materials').value;
    let list = state.materials.filter(m => m.name.includes(filter));
    list.sort((a,b) => sort==='date_desc' ? new Date(b.$updatedAt)-new Date(a.$updatedAt) : a.name.localeCompare(b.name));
    
    const el = document.getElementById('materials-container');
    if(!list.length) { el.innerHTML='<p class="col-span-full text-center text-slate-400 text-xs mt-4">خالی</p>'; return; }
    
    el.innerHTML = list.map(m => {
        const cat = state.categories.find(c => c.$id === m.category_id)?.name || '-';
        return `
        <div class="bg-white p-3 rounded-xl border border-slate-100 group relative">
            <div class="flex justify-between mb-1">
                <span class="text-[10px] bg-slate-50 px-1 rounded text-slate-400">${cat}</span>
                <div class="flex gap-1"><button class="text-amber-500 px-1 btn-edit-mat" data-id="${m.$id}">✎</button><button class="text-rose-500 px-1 btn-del-mat" data-id="${m.$id}">×</button></div>
            </div>
            <div class="font-bold text-xs text-slate-800 truncate">${m.name}</div>
            <div class="flex justify-between items-end mt-1">
                <span class="text-[10px] text-slate-400">${m.unit}</span>
                <span class="font-mono font-bold text-teal-700">${formatPrice(m.price)}</span>
            </div>
        </div>`;
    }).join('');
    
    el.querySelectorAll('.btn-edit-mat').forEach(b => b.onclick = () => editMat(b.dataset.id));
    el.querySelectorAll('.btn-del-mat').forEach(b => b.onclick = async () => {
        if(confirm('حذف؟')) {
            try { await api.delete(APPWRITE_CONFIG.COLS.MATS, b.dataset.id); import('./api.js').then(m=>m.fetchAllData().then(renderMaterials)); } // Quick refresh
            catch(e) { alert(e.message); }
        }
    });
}

function editMat(id) {
    const m = state.materials.find(x => x.$id === id);
    document.getElementById('mat-id').value = m.$id;
    document.getElementById('mat-name').value = m.name;
    document.getElementById('mat-unit').value = m.unit;
    document.getElementById('mat-price').value = formatPrice(m.price);
    document.getElementById('mat-category').value = m.category_id || '';
    
    document.getElementById('mat-submit-btn').innerText = 'ویرایش';
    document.getElementById('mat-cancel-btn').classList.remove('hidden');
}

function resetMatForm() {
    document.getElementById('material-form').reset();
    document.getElementById('mat-id').value = '';
    document.getElementById('mat-submit-btn').innerText = 'ذخیره کالا';
    document.getElementById('mat-cancel-btn').classList.add('hidden');
}