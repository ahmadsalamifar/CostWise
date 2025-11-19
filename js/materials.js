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
    document.getElementById('mat-base-unit-select').onchange = updateUnitDropdowns;
    document.getElementById('mat-scraper-unit').onchange = calculateScraperFactor;
    
    const scraperBtn = document.getElementById('btn-scraper-trigger');
    if(scraperBtn) scraperBtn.onclick = async () => {
        if(!confirm('بروزرسانی قیمت‌ها؟')) return;
        scraperBtn.innerText = '...';
        try { await api.runScraper(); refreshCallback(); } 
        catch(e) { alert(e.message); } finally { scraperBtn.innerText = '🤖 بروزرسانی قیمت‌ها'; }
    };
}

// --- UI مدیریت واحدها ---

function renderRelationsUI() {
    const container = document.getElementById('unit-relations-container');
    container.innerHTML = '';
    const baseUnitName = document.getElementById('mat-base-unit-select').value || 'واحد پایه';
    
    currentUnitRelations.forEach((rel, index) => {
        const options = state.units.map(u => `<option value="${u.name}" ${u.name === rel.name ? 'selected' : ''}>${u.name}</option>`).join('');
        const row = document.createElement('div');
        row.className = 'flex items-center gap-1 bg-white p-2 rounded border border-slate-100 mb-1 shadow-sm';
        row.innerHTML = `
            <input type="number" step="any" class="input-field h-7 w-12 text-center font-bold text-blue-600 px-0.5 text-xs rel-qty-unit" value="${rel.qtyUnit || 1}">
            <select class="input-field h-7 w-20 px-1 text-xs rel-name-select border-none bg-transparent font-bold">${options}</select>
            <span class="text-slate-400 mx-1">=</span>
            <input type="number" step="any" class="input-field h-7 w-12 text-center font-bold text-slate-600 px-0.5 text-xs rel-qty-base" value="${rel.qtyBase || 1}">
            <span class="text-slate-400 text-[10px] w-12 truncate base-unit-label">${baseUnitName}</span>
            <button type="button" class="text-rose-400 hover:text-rose-600 px-2 btn-remove-rel">×</button>
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
    const baseUnit = document.getElementById('mat-base-unit-select').value;
    let availableUnits = [baseUnit];
    currentUnitRelations.forEach(r => availableUnits.push(r.name));
    availableUnits = [...new Set(availableUnits)];

    const optionsHtml = availableUnits.map(u => `<option value="${u}">${u}</option>`).join('');
    
    // آپدیت دراپ‌داون واحد قیمت و اسکرپر
    const priceSelect = document.getElementById('mat-price-unit');
    const scraperSelect = document.getElementById('mat-scraper-unit');
    
    const prevPrice = priceSelect.value;
    const prevScraper = scraperSelect.value;
    
    priceSelect.innerHTML = optionsHtml;
    scraperSelect.innerHTML = optionsHtml;
    
    if(availableUnits.includes(prevPrice)) priceSelect.value = prevPrice;
    if(availableUnits.includes(prevScraper)) scraperSelect.value = prevScraper;
    
    document.querySelectorAll('.base-unit-label').forEach(el => el.innerText = baseUnit);
    calculateScraperFactor();
}

// تابع کمکی برای گرفتن ضریب تبدیل هر واحد نسبت به پایه
function getFactorToBase(unitName) {
    const baseUnit = document.getElementById('mat-base-unit-select').value;
    if (unitName === baseUnit) return 1;
    const rel = currentUnitRelations.find(r => r.name === unitName);
    if (!rel) return 1;
    return rel.qtyBase / rel.qtyUnit;
}

function calculateScraperFactor() {
    const sUnit = document.getElementById('mat-scraper-unit').value;
    // برای اسکرپر، ما میخواهیم همه چیز را به "واحد پایه" برگردانیم
    // چون در سیستم ما قیمت بر اساس "واحد قیمت" ذخیره میشود
    // این فیلد scraper_factor فقط برای بک‌اند استفاده می‌شود که ضرب نهایی را انجام دهد.
    // برای سادگی: ضریب اسکرپر = (1 / ضریب واحد سایت به پایه).
    // اما چون بک‌اند قیمت را میگیرد و ضرب میکند، ما اینجا فقط ضریب واحد سایت به پایه را حساب میکنیم.
    
    // در واقعیت، ما در Formulas.js محاسبات دقیق را انجام می‌دهیم.
    // اینجا فقط یک عدد تقریبی برای نمایش میگذاریم.
    document.getElementById('mat-scraper-factor').value = 1; 
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
        // فیلدهای قدیمی را با مقادیر پیش‌فرض پر می‌کنیم چون دیگر در UI نیستند
        purchase_unit: document.getElementById('mat-price-unit').value, 
        consumption_unit: document.getElementById('mat-price-unit').value, 
        scraper_factor: 1,
        unit_relations: JSON.stringify({
            base: document.getElementById('mat-base-unit-select').value,
            others: currentUnitRelations,
            price_unit: document.getElementById('mat-price-unit').value, // واحد قیمت مهم است
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
    if(state.units.length > 0 && baseSelect.options.length === 0) {
        baseSelect.innerHTML = state.units.map(u => `<option value="${u.name}">${u.name}</option>`).join('');
    }

    const sort = document.getElementById('sort-materials').value;
    let list = state.materials.filter(m => m.name.includes(filter) || (m.display_name && m.display_name.includes(filter)));
    
    list.sort((a,b) => {
        if(sort === 'update_desc') return new Date(b.$updatedAt) - new Date(a.$updatedAt);
        return 0;
    });
    
    const el = document.getElementById('materials-container');
    if(!list.length) { el.innerHTML='<p class="col-span-full text-center text-slate-400 text-xs">خالی</p>'; return; }
    
    el.innerHTML = list.map(m => {
        const cat = state.categories.find(c => c.$id === m.category_id)?.name || '-';
        let rels = {};
        try { rels = JSON.parse(m.unit_relations || '{}'); } catch(e){}
        
        const priceUnit = rels.price_unit || m.purchase_unit || 'واحد';

        return `
        <div class="bg-white p-3 rounded-xl border border-slate-100 group relative hover:border-teal-400 transition-colors shadow-sm">
            <div class="flex justify-between mb-1">
                <span class="text-[10px] bg-slate-50 px-2 rounded text-slate-500 border border-slate-100">${cat}</span>
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
        if(state.units.length === 0) baseSelect.innerHTML = `<option value="${rels.base}">${rels.base}</option>`;
        if(rels.base) baseSelect.value = rels.base;

        currentUnitRelations = (rels.others || []).map(r => ({
            name: r.name, qtyUnit: r.qtyUnit || 1, qtyBase: r.qtyBase || 1
        }));
        renderRelationsUI();
        updateUnitDropdowns();
        
        if(rels.price_unit) document.getElementById('mat-price-unit').value = rels.price_unit;
        if(rels.scraper_unit) document.getElementById('mat-scraper-unit').value = rels.scraper_unit;

    } catch(e) { currentUnitRelations = []; renderRelationsUI(); }
    
    document.getElementById('mat-price').value = formatPrice(m.price);
    document.getElementById('mat-scraper-url').value = m.scraper_url || '';
    
    const btn = document.getElementById('mat-submit-btn');
    btn.innerText = 'ذخیره تغییرات';
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
    btn.innerText = 'ذخیره کالا';
    document.getElementById('mat-cancel-btn').classList.add('hidden');
}
