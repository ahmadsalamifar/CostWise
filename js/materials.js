import { api } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { formatPrice, parseLocaleNumber, getDateBadge } from './utils.js';

export function setupMaterials(refreshCallback) {
    document.getElementById('material-form').onsubmit = (e) => { 
        e.preventDefault(); 
        saveMaterial(refreshCallback); 
    };
    
    document.getElementById('mat-cancel-btn').onclick = resetMatForm;
    document.getElementById('search-materials').oninput = (e) => renderMaterials(e.target.value);
    document.getElementById('sort-materials').onchange = () => renderMaterials();
    
    // دکمه اجرای اسکرپر
    const scraperBtn = document.getElementById('btn-scraper-trigger');
    if(scraperBtn) scraperBtn.onclick = async () => {
        if(!confirm('قیمت‌ها از سایت‌های مرجع بروزرسانی شوند؟')) return;
        scraperBtn.innerText = '⏳ ...';
        try {
            await api.runScraper();
            alert('انجام شد. صفحه رفرش می‌شود.');
            refreshCallback();
        } catch(e) { alert('خطا: ' + e.message); }
        finally { scraperBtn.innerText = '🤖 بروزرسانی قیمت‌ها'; }
    };
}

async function saveMaterial(cb) {
    const id = document.getElementById('mat-id').value;
    
    const data = {
        name: document.getElementById('mat-name').value,
        display_name: document.getElementById('mat-display-name').value || null,
        category_id: document.getElementById('mat-category').value || null,
        purchase_unit: document.getElementById('mat-purchase-unit').value,
        consumption_unit: document.getElementById('mat-consumption-unit').value,
        conversion_rate: parseFloat(document.getElementById('mat-conversion-rate').value) || 1,
        price: parseLocaleNumber(document.getElementById('mat-price').value),
        scraper_url: document.getElementById('mat-scraper-url').value || null,
        
        // --- فیلد جدید اینجاست ---
        scraper_factor: parseFloat(document.getElementById('mat-scraper-factor').value) || 1
    };

    try {
        if(id) await api.update(APPWRITE_CONFIG.COLS.MATS, id, data);
        else await api.create(APPWRITE_CONFIG.COLS.MATS, data);
        
        resetMatForm();
        cb();
    } catch(e){ alert(e.message); }
}

export function renderMaterials(filter='') {
    // (کد رندر لیست مواد - همان قبلی با کمی تغییر برای نمایش ضریب)
    const sort = document.getElementById('sort-materials').value;
    let list = state.materials.filter(m => m.name.includes(filter) || (m.display_name && m.display_name.includes(filter)));
    
    list.sort((a,b) => {
        if(sort === 'update_desc') return new Date(b.$updatedAt) - new Date(a.$updatedAt);
        if(sort === 'price_desc') return b.price - a.price;
        return 0;
    });
    
    const el = document.getElementById('materials-container');
    if(!list.length) { el.innerHTML='<p class="col-span-full text-center text-slate-400 text-xs">خالی</p>'; return; }
    
    el.innerHTML = list.map(m => {
        const cat = state.categories.find(c => c.$id === m.category_id)?.name || '-';
        const dateBadge = getDateBadge(m.$updatedAt);
        // نمایش ضریب اسکرپر اگر وجود داشته باشد
        const scraperInfo = m.scraper_url ? 
            `<span class="text-[9px] text-blue-500 bg-blue-50 px-1 rounded border border-blue-100" title="ضریب محاسبه: ${m.scraper_factor || 1}">Link × ${m.scraper_factor || 1}</span>` : '';

        return `
        <div class="bg-white p-3 rounded-xl border border-slate-100 group relative hover:border-teal-400 transition-colors shadow-sm">
            <div class="flex justify-between mb-1 items-start">
                <div class="flex flex-col items-start gap-1">
                    <span class="text-[10px] bg-slate-50 px-1 rounded text-slate-400 border border-slate-100">${cat}</span>
                    ${dateBadge}
                </div>
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="text-amber-500 px-1 btn-edit-mat" data-id="${m.$id}">✎</button>
                    <button class="text-rose-500 px-1 btn-del-mat" data-id="${m.$id}">×</button>
                </div>
            </div>
            <div class="font-bold text-xs text-slate-800 truncate mt-1">${m.name}</div>
            <div class="flex justify-between items-end mt-2 pt-2 border-t border-dashed border-slate-100">
                <div class="text-[10px] text-slate-400 flex flex-col">
                    <span>${m.consumption_unit}</span>
                    ${scraperInfo}
                </div>
                <div class="text-right">
                     <span class="font-mono font-bold text-teal-700 text-sm">${formatPrice(m.price)}</span>
                     <span class="text-[9px] text-slate-400">/${m.purchase_unit}</span>
                </div>
            </div>
        </div>`;
    }).join('');
    
    el.querySelectorAll('.btn-edit-mat').forEach(b => b.onclick = () => editMat(b.dataset.id));
    el.querySelectorAll('.btn-del-mat').forEach(b => b.onclick = async () => {
        if(confirm('حذف؟')) {
            try { await api.delete(APPWRITE_CONFIG.COLS.MATS, b.dataset.id); refreshCallback(); }
            catch(e) { alert(e.message); }
        }
    });
}

function editMat(id) {
    const m = state.materials.find(x => x.$id === id);
    if(!m) return;
    
    document.getElementById('mat-id').value = m.$id;
    document.getElementById('mat-name').value = m.name;
    document.getElementById('mat-display-name').value = m.display_name || '';
    document.getElementById('mat-category').value = m.category_id || '';
    document.getElementById('mat-purchase-unit').value = m.purchase_unit || '';
    document.getElementById('mat-consumption-unit').value = m.consumption_unit || '';
    document.getElementById('mat-conversion-rate').value = m.conversion_rate || 1;
    document.getElementById('mat-price').value = formatPrice(m.price);
    document.getElementById('mat-scraper-url').value = m.scraper_url || '';
    
    // --- لود کردن مقدار فیلد جدید ---
    document.getElementById('mat-scraper-factor').value = m.scraper_factor || 1;
    
    const btn = document.getElementById('mat-submit-btn');
    btn.innerText = 'ویرایش';
    document.getElementById('mat-cancel-btn').classList.remove('hidden');
    
    if(window.innerWidth < 768) document.getElementById('tab-materials').scrollIntoView({behavior:'smooth'});
}

function resetMatForm() {
    document.getElementById('material-form').reset();
    document.getElementById('mat-id').value = '';
    document.getElementById('mat-conversion-rate').value = 1;
    document.getElementById('mat-scraper-factor').value = 1; // ریست کردن فیلد جدید
    
    const btn = document.getElementById('mat-submit-btn');
    btn.innerText = 'ذخیره کالا';
    document.getElementById('mat-cancel-btn').classList.add('hidden');
}