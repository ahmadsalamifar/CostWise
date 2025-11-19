import { api } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';

export function setupCategories(refreshCallback) {
    document.getElementById('category-form').onsubmit = (e) => { 
        e.preventDefault(); 
        addCategory(refreshCallback); 
    };
}

async function addCategory(cb) {
    const n = document.getElementById('cat-name').value;
    if(!n) return;
    try {
        await api.create(APPWRITE_CONFIG.COLS.CATS, {name:n});
        document.getElementById('cat-name').value='';
        cb();
    } catch(e) { alert(e.message); }
}

export function renderCategories(refreshCallback) {
    const el = document.getElementById('category-list');
    el.innerHTML = state.categories.map(c=>`
        <div class="flex justify-between p-2 bg-slate-50 rounded border mb-1 text-xs items-center">
            <span class="font-bold text-slate-700">${c.name}</span>
            <button class="text-rose-500 btn-del-cat w-6 h-6 flex items-center justify-center hover:bg-rose-50 rounded" data-id="${c.$id}">×</button>
        </div>
    `).join('');
    
    el.querySelectorAll('.btn-del-cat').forEach(b => {
        b.onclick = async () => {
            if(confirm('این دسته حذف شود؟')) {
                try { await api.delete(APPWRITE_CONFIG.COLS.CATS, b.dataset.id); refreshCallback(); }
                catch(e) { alert(e.message); }
            }
        };
    });
}