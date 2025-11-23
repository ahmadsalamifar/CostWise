// js/modules/materials/materials.view.js
// مسئولیت: فقط تولید HTML و کار با DOM

import { formatPrice, getDateBadge } from '../../core/utils.js';
import { state } from '../../core/config.js';

export const MaterialsView = {
    container: document.getElementById('materials-container'),

    renderList(materials) {
        if (!this.container) return;
        
        if (!materials.length) {
            this.container.innerHTML = '<p class="col-span-full text-center text-slate-400 text-xs">موردی یافت نشد</p>';
            return;
        }

        this.container.innerHTML = materials.map(m => this._createCard(m)).join('');
    },

    _createCard(m) {
        const cat = state.categories.find(c => c.$id === m.category_id)?.name || '-';
        const linkIcon = m.scraper_url ? '🔗' : '';
        const stockClass = (m.stock || 0) <= 0 ? 'text-rose-500 bg-rose-50' : 'text-indigo-600 bg-indigo-50';

        return `
        <div class="bg-white p-3 rounded-xl border border-slate-100 group hover:shadow-md transition-all">
            <div class="flex justify-between mb-2">
                <div>
                    <span class="text-[10px] bg-slate-50 px-2 rounded text-slate-500">${cat}</span>
                    <span class="text-[9px] px-1.5 rounded ${stockClass} border border-slate-100 font-bold">موجودی: ${m.stock || 0}</span>
                </div>
                <div class="flex gap-1">
                    <button class="bg-emerald-50 text-emerald-600 p-1 rounded hover:bg-emerald-100 btn-buy-mat" data-id="${m.$id}">🛒</button>
                    <button class="bg-amber-50 text-amber-500 p-1 rounded hover:bg-amber-100 btn-edit-mat" data-id="${m.$id}">✎</button>
                    <button class="bg-rose-50 text-rose-500 p-1 rounded hover:bg-rose-100 btn-del-mat" data-id="${m.$id}">×</button>
                </div>
            </div>
            <div class="font-bold text-sm text-slate-800 mb-2">${linkIcon} ${m.name}</div>
            <div class="flex justify-between text-[10px] border-t pt-2 border-slate-50">
                 <span class="text-slate-400">${getDateBadge(m.$updatedAt)}</span>
                 <span class="font-bold text-teal-700">${formatPrice(m.price)} تومان</span>
            </div>
        </div>`;
    },

    fillForm(m) {
        document.getElementById('mat-id').value = m.$id;
        document.getElementById('mat-name').value = m.name;
        document.getElementById('mat-price').value = formatPrice(m.price);
        // ... پر کردن بقیه فیلدها
        document.getElementById('mat-submit-btn').innerText = 'ذخیره تغییرات';
        document.getElementById('mat-cancel-btn').classList.remove('hidden');
    },

    resetForm() {
        document.getElementById('material-form').reset();
        document.getElementById('mat-id').value = '';
        document.getElementById('mat-submit-btn').innerText = 'ذخیره کالا';
        document.getElementById('mat-cancel-btn').classList.add('hidden');
    }
};