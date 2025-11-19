import { api } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { formatPrice, parseLocaleNumber, getDateBadge } from './utils.js';

let currentUnitRelations = []; 

export function setupMaterials(refreshCallback) {
    document.getElementById('material-form').onsubmit = (e) => { e.preventDefault(); saveMaterial(refreshCallback); };
    document.getElementById('mat-cancel-btn').onclick = resetMatForm;
    document.getElementById('search-materials').oninput = (e) => renderMaterials(e.target.value);
    document.getElementById('sort-materials').onchange = () => renderMaterials();
    document.getElementById('btn-add-relation').onclick = addRelationRow;
    
    // تریگرها
    const baseUnitSelect = document.getElementById('mat-base-unit-select');
    if(baseUnitSelect) baseUnitSelect.onchange = updateUnitDropdowns;
    
    const scraperUnit = document.getElementById('mat-scraper-unit');
    if(scraperUnit) scraperUnit.onchange = calculateScraperFactor;
    
    const scraperBtn = document.getElementById('btn-scraper-trigger');
    if(scraperBtn) scraperBtn.onclick = async () => {
        if(!confirm('بروزرسانی قیمت‌ها از سایت؟')) return;
        scraperBtn.innerText = '...';
        try { await api.runScraper(); refreshCallback(); } 
        catch(e) { alert(e.message); } finally { scraperBtn.innerText = '🤖 بروزرسانی قیمت‌ها'; }
    };
}

// --- UI مدیریت واحدها (اصلاح شده: سایز بزرگتر) ---

function renderRelationsUI() {
    const container = document.getElementById('unit-relations-container');
    if(!container) return;
    container.innerHTML = '';
    
    const baseElem = document.getElementById('mat-base-unit-select');
    const baseUnitName = baseElem ? (baseElem.value || 'واحد پایه') : 'واحد پایه';
    
    currentUnitRelations.forEach((rel, index) => {
        const options = state.units.map(u => `<option value="${u.name}" ${u.name === rel.name ? 'selected' : ''}>${u.name}</option>`).join('');
        
        const row = document.createElement('div');
        // ظاهر جدید: کادرهای بزرگتر و خوانا
        row.className = 'flex items-center gap-2 bg-white p-2 rounded border border-slate-200 mb-2 shadow-sm';
        
        row.innerHTML = `
            <input type="number" step="any" class="input-field h-9 w-16 text-center font-bold text-slate-700 text-xs border-slate-200 bg-slate-50 rel-qty-unit" value="${rel.qtyUnit || 1}" placeholder="#">
            
            <select class="input-field h-9 w-28 px-2 text-xs rel-name-select border-slate-200 bg-white text-slate-700">${options}</select>
            
            <span class="text-slate-400 text-lg">=</span>
            
            <input type="number" step="any" class="input-field h-9 w-16 text-center font-bold text-slate-500 text-xs border-slate-200 bg-slate-50 rel-qty-base" value="${rel.qtyBase || 1}" placeholder="#">
            
            <span class="text-slate-500 text-xs w-16 truncate base-unit-label font-bold">${baseUnitName}</span>
            
            <button type="button" class="text-slate-300 hover:text-rose-500 px-2 text-lg mr-auto transition-colors btn-remove-rel">×</button>
        `;
        
        const updateRow = () => {
            currentUnitRelations[index].name = row.querySelector('.rel-name-select').value;
            currentUnitRelations[index].qtyUnit = parseFloat(row.querySelector('.rel-qty-unit').value) || 1;
            currentUnitRelations[index].qtyBase = parseFloat(row.querySelector('.rel-qty-base').value) || 1;
            updateUnitDropdowns();
        };

        row.querySelector('.rel-name-select').onchange = updateRow;
        row.querySelector('.rel-qty-unit').oninput = updateRow;
        row.querySelector('.rel-qty-base').oninput = updateRow;
        row.querySelector('.btn-remove-rel').onclick = () => { 
            currentUnitRelations.splice(index, 1); 
            renderRelationsUI(); 
            updateUnitDropdowns(); 
        };
        container.appendChild(row);
    });
    
    // آپدیت نام واحد پایه در تمام سطرها
    document.querySelectorAll('.base-unit-label').forEach(el => el.innerText = baseUnitName);
}

function addRelationRow() {
    const usedNames = currentUnitRelations.map(r => r.name);
    const available = state.units.find(u => !usedNames.includes(u.name));
    const name = available ? available.name : (state.units[0]?.name || 'Unit');
    currentUnitRelations.push({ name: name, qtyUnit: 1, qtyBase: 1 });
    renderRelationsUI();
    updateUnitDropdowns();
}

function updateUnitDropdowns() {
    const baseElem = document.getElementById('mat-base-unit-select');
    if(!baseElem) return;
    
    const baseUnit = baseElem.value;
    let availableUnits = [baseUnit];
    currentUnitRelations.forEach(r => availableUnits.push(r.name));
    availableUnits = [...new Set(availableUnits)];

    const optionsHtml = availableUnits.map(u => `<option value="${u}">${u}</option>`).join('');
    
    const priceSelect = document.getElementById('mat-price-unit');
    const scraperSelect = document.getElementById('mat-scraper-unit');
    
    if(priceSelect && scraperSelect) {
        const prevPrice = priceSelect.value;
        const prevScraper = scraperSelect.value;
        
        priceSelect.innerHTML = optionsHtml;
        scraperSelect.innerHTML = optionsHtml;
        
        if(availableUnits.includes(prevPrice)) priceSelect.value = prevPrice;
        if(availableUnits.includes(prevScraper)) scraperSelect.value = prevScraper;
    }
    
    document.querySelectorAll('.base-unit-label').forEach(el => el.innerText = baseUnit);
    calculateScraperFactor();
}

function calculateScraperFactor() {
    const el = document.getElementById('mat-scraper-factor');
    if(el) el.value = 1; 
}

// --- CRUD ---

async function saveMaterial(cb) {
    const id = document.getElementById('mat-id').value;
    
    const data = {
        name: document.getElementById('mat-name').value,
        display_name: document.getElementById('mat-display-name').value || null,
        category_id: document.getElementById('mat-category').value || null,
        price: parseLocaleNumber(document.getElementById('mat-price').value),
        scraper_url: document.getElementById('mat-scraper-url').value || null,
        scraper_anchor: document.getElementById('mat-scraper-anchor').value || null, // فیلد جدید
        
        // مقادیر پیش‌فرض برای فیلدهای قدیمی دیتابیس
        purchase_unit: document.getElementById('mat-price-unit').value, 
        consumption_unit: document.getElementById('mat-price-unit').value, 
        scraper_factor: 1,
        
        // ذخیره کامل ساختار واحدها
        unit_relations: JSON.stringify({
            base: document.getElementById('mat-base-unit-select').value,
            others: currentUnitRelations,
            price_unit: document.getElementById('mat-price-unit').value,
            scraper_unit: document.getElementById('mat-scraper-unit').value
        })
    };

    try {
        if(id) await api.update(APPWRITE_CONFIG.COLS.MATS, id, data);
        else await api.create(APPWRITE_CONFIG.COLS.MATS, data);
        resetMatForm();
        cb();
    } catch(e){ alert(e.message); }
}

export function renderMaterials(filter='') {
    const baseSelect = document.getElementById('mat-base-unit-select');
    if(baseSelect && state.units.length > 0 && baseSelect.options.length === 0) {
        baseSelect.innerHTML = state.units.map(u => `<option value="${u.name}">${u.name}</option>`).join('');
    }

    const sortElem = document.getElementById('sort-materials');
    const sort = sortElem ? sortElem.value : 'update_desc';
    
    let list = state.materials.filter(m => m.name.includes(filter) || (m.display_name && m.display_name.includes(filter)));
    
    // --- منطق مرتب‌سازی کامل ---
    list.sort((a,b) => {
        // مرتب‌سازی بر اساس دسته‌بندی
        if(sort === 'category') {
            const getCatName = (id) => {
                const c = state.categories.find(cat => cat.$id === id);
                return c ? c.name : 'zzz'; // موارد بدون دسته بروند آخر
            };
            return getCatName(a.category_id).localeCompare(getCatName(b.category_id));
        }
        // سایر مرتب‌سازی‌ها
        if(sort === 'price_desc') return b.price - a.price;
        if(sort === 'price_asc') return a.price - b.price;
        if(sort === 'name_asc') return a.name.localeCompare(b.name);
        if(sort === 'update_asc') return new Date(a.$updatedAt) - new Date(b.$updatedAt);
        
        return new Date(b.$updatedAt) - new Date(a.$updatedAt); // پیش‌فرض: جدیدترین
    });
    
    const el = document.getElementById('materials-container');
    if(!el) return;

    if(!list.length) { el.innerHTML='<p class="col-span-full text-center text-slate-400 text-xs">خالی</p>'; return; }
    
    el.innerHTML = list.map(m => {
        const cat = state.categories.find(c => c.$id === m.category_id)?.name || '-';
        let rels = {};
        try { rels = JSON.parse(m.unit_relations || '{}'); } catch(e){}
        
        const priceUnit = rels.price_unit || m.purchase_unit || 'واحد';
        const dateBadge = getDateBadge(m.$updatedAt);

        return `
        <div class="bg-white p-3 rounded-xl border border-slate-100 group relative hover:border-teal-400 transition-colors shadow-sm">
            <div class="flex justify-between mb-1 items-start">
                <div class="flex flex-col gap-1">
                    <span class="text-[10px] bg-slate-50 px-2 rounded text-slate-500 border border-slate-100 w-fit">${cat}</span>
                    ${dateBadge}
                </div>
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="text-amber-500 px-1 btn-edit-mat" data-id="${m.$id}">✎</button>
                    <button class="text-rose-500 px-1 btn-del-mat" data-id="${m.$id}">×</button>
                </div>
            </div>
            <div class="font-bold text-sm text-slate-800 truncate mt-1">${m.name}</div>
            <div class="flex justify-between items-end mt-3 pt-2 border-t border-dashed border-slate-100">
                <div class="text-right w-full">
                     <span class="font-mono font-bold text-teal-700 text-lg">${formatPrice(m.price)}</span>
                     <span class="text-[10px] text-slate-400 mr-1">/${priceUnit}</span>
                </div>
            </div>
        </div>`;
    }).join('');
    
    el.querySelectorAll('.btn-edit-mat').forEach(b => b.onclick = () => editMat(b.dataset.id));
    el.querySelectorAll('.btn-del-mat').forEach(b => b.onclick = async () => {
        if(confirm('حذف؟')) {
            try { await api.delete(APPWRITE_CONFIG.COLS.MATS, b.dataset.id); refreshCallback(); } catch(e) { alert(e.message); }
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
    
    try {
        const rels = JSON.parse(m.unit_relations || '{}');
        const baseSelect = document.getElementById('mat-base-unit-select');
        if(state.units.length === 0) {
             baseSelect.innerHTML = `<option value="${rels.base || 'Unit'}">${rels.base || 'Unit'}</option>`;
        }
        if(rels.base) baseSelect.value = rels.base;

        currentUnitRelations = (rels.others || []).map(r => ({
            name: r.name, qtyUnit: r.qtyUnit || 1, qtyBase: r.qtyBase || 1
        }));
        renderRelationsUI();
        updateUnitDropdowns();
        
        // انتخاب مقادیر ذخیره شده
        if(rels.price_unit) {
             document.getElementById('mat-price-unit').value = rels.price_unit;
        } else if(m.purchase_unit) {
             document.getElementById('mat-price-unit').value = m.purchase_unit;
        }

        // انتخاب واحد اسکرپر
        if(rels.scraper_unit) {
             document.getElementById('mat-scraper-unit').value = rels.scraper_unit;
        }
        
        calculateScraperFactor(); 

    } catch(e) {
        console.error("Error parsing unit relations", e);
        currentUnitRelations = [];
        renderRelationsUI();
    }
    
    document.getElementById('mat-price').value = formatPrice(m.price);
    document.getElementById('mat-scraper-url').value = m.scraper_url || '';
    // بازگردانی انکر تکست
    document.getElementById('mat-scraper-anchor').value = m.scraper_anchor || '';
    
    const btn = document.getElementById('mat-submit-btn');
    if(btn) btn.innerText = 'ذخیره تغییرات';
    document.getElementById('mat-cancel-btn').classList.remove('hidden');
    
    if(window.innerWidth < 768) document.getElementById('tab-materials').scrollIntoView({behavior:'smooth'});
}

function resetMatForm() {
    document.getElementById('material-form').reset();
    document.getElementById('mat-id').value = '';
    currentUnitRelations = [];
    renderRelationsUI();
    updateUnitDropdowns();
    
    const btn = document.getElementById('mat-submit-btn');
    if(btn) btn.innerText = 'ذخیره کالا';
    document.getElementById('mat-cancel-btn').classList.add('hidden');
}
