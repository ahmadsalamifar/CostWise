import { api } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { formatPrice, parseLocaleNumber, getDateBadge } from './utils.js';

export function setupMaterials(refreshCallback) {
    // هندل کردن سابمیت فرم افزودن/ویرایش
    document.getElementById('material-form').onsubmit = (e) => { 
        e.preventDefault(); 
        saveMaterial(refreshCallback); 
    };
    
    // دکمه‌ها و فیلترها
    document.getElementById('mat-cancel-btn').onclick = resetMatForm;
    document.getElementById('search-materials').oninput = (e) => renderMaterials(e.target.value);
    document.getElementById('sort-materials').onchange = () => renderMaterials();
    
    // تریگر اسکرپر
    const scraperBtn = document.getElementById('btn-scraper-trigger');
    if(scraperBtn) scraperBtn.onclick = async () => {
        if(!confirm('آیا می خواهید ربات بروزرسانی قیمت را اجرا کنید؟ این عملیات ممکن است چند دقیقه طول بکشد.')) return;
        scraperBtn.innerText = '⏳ در حال اجرا...';
        try {
            await api.runScraper();
            alert('دستور اجرا شد. لطفا چند لحظه صبر کنید و سپس صفحه را رفرش کنید.');
            refreshCallback();
        } catch(e) { alert('خطا: ' + e.message); }
        finally { scraperBtn.innerText = '🤖 بروزرسانی قیمت‌ها'; }
    };
}

async function saveMaterial(cb) {
    const id = document.getElementById('mat-id').value;
    
    // جمع‌آوری داده‌های V2
    const data = {
        name: document.getElementById('mat-name').value,
        display_name: document.getElementById('mat-display-name').value || null, // فیلد جدید
        category_id: document.getElementById('mat-category').value || null,
        purchase_unit: document.getElementById('mat-purchase-unit').value, // واحد خرید
        consumption_unit: document.getElementById('mat-consumption-unit').value, // واحد مصرف
        conversion_rate: parseFloat(document.getElementById('mat-conversion-rate').value) || 1, // ضریب
        price: parseLocaleNumber(document.getElementById('mat-price').value), // قیمت واحد خرید
        scraper_url: document.getElementById('mat-scraper-url').value || null // لینک اسکرپر
    };

    try {
        if(id) await api.update(APPWRITE_CONFIG.COLS.MATS, id, data);
        else await api.create(APPWRITE_CONFIG.COLS.MATS, data);
        
        resetMatForm();
        cb(); // رفرش کل برنامه
    } catch(e){ alert(e.message); }
}

export function renderMaterials(filter='') {
    const sort = document.getElementById('sort-materials').value;
    let list = state.materials.filter(m => m.name.includes(filter) || (m.display_name && m.display_name.includes(filter)));
    
    // منطق مرتب‌سازی پیشرفته
    list.sort((a,b) => {
        if(sort === 'category') {
            const cA = state.categories.find(c=>c.$id===a.category_id)?.name || 'zzz';
            const cB = state.categories.find(c=>c.$id===b.category_id)?.name || 'zzz';
            return cA.localeCompare(cB);
        }
        if(sort === 'update_desc') return new Date(b.$updatedAt) - new Date(a.$updatedAt);
        if(sort === 'price_desc') return b.price - a.price;
        if(sort === 'price_asc') return a.price - b.price;
        return 0; // پیش‌فرض
    });
    
    const el = document.getElementById('materials-container');
    if(!list.length) { el.innerHTML='<p class="col-span-full text-center text-slate-400 text-xs mt-4">موردی یافت نشد</p>'; return; }
    
    el.innerHTML = list.map(m => {
        const cat = state.categories.find(c => c.$id === m.category_id)?.name || '-';
        const dateBadge = getDateBadge(m.$updatedAt);
        const displayName = m.display_name ? `<span class="text-slate-500 text-[10px]">(${m.display_name})</span>` : '';
        
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
            
            <div class="font-bold text-xs text-slate-800 truncate mt-1" title="${m.name}">${m.name} ${displayName}</div>
            
            <div class="flex justify-between items-end mt-2 pt-2 border-t border-dashed border-slate-100">
                <div class="text-[10px] text-slate-400">
                    <span>${m.consumption_unit}</span>
                    <span class="text-[9px] opacity-70 mx-1">(ضریب: ${m.conversion_rate})</span>
                </div>
                <div class="text-right">
                     <span class="font-mono font-bold text-teal-700 text-sm">${formatPrice(m.price)}</span>
                     <span class="text-[9px] text-slate-400">/${m.purchase_unit}</span>
                </div>
            </div>
            ${m.scraper_url ? '<div class="absolute bottom-1 left-2 text-[8px] text-blue-300">🔗</div>' : ''}
        </div>`;
    }).join('');
    
    // اتصال دکمه‌ها
    el.querySelectorAll('.btn-edit-mat').forEach(b => b.onclick = () => editMat(b.dataset.id));
    el.querySelectorAll('.btn-del-mat').forEach(b => b.onclick = async () => {
        if(confirm('آیا از حذف این کالا اطمینان دارید؟')) {
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
    
    const btn = document.getElementById('mat-submit-btn');
    btn.innerText = 'ویرایش و ذخیره';
    btn.classList.add('bg-amber-500');
    document.getElementById('mat-cancel-btn').classList.remove('hidden');
    
    // اسکرول به فرم در موبایل
    if(window.innerWidth < 768) document.getElementById('tab-materials').scrollIntoView({behavior:'smooth'});
}

function resetMatForm() {
    document.getElementById('material-form').reset();
    document.getElementById('mat-id').value = '';
    document.getElementById('mat-conversion-rate').value = 1;
    
    const btn = document.getElementById('mat-submit-btn');
    btn.innerText = 'ذخیره کالا';
    btn.classList.remove('bg-amber-500');
    document.getElementById('mat-cancel-btn').classList.add('hidden');
}