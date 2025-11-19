import { api } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { formatPrice, parseLocaleNumber, formatDate, openModal, closeModal } from './utils.js';

export function setupFormulas(refreshCallback) {
    // رویدادهای اصلی
    document.getElementById('btn-open-new-formula').onclick = () => openModal('new-formula-modal');
    document.getElementById('btn-cancel-formula').onclick = () => closeModal('new-formula-modal');
    document.getElementById('btn-create-formula').onclick = () => createFormula(refreshCallback);
    
    // جستجو
    const searchEl = document.getElementById('search-formulas');
    if(searchEl) searchEl.oninput = (e) => renderFormulaList(e.target.value);
    
    // افزودن جزء به فرمول
    document.getElementById('form-add-comp').onsubmit = (e) => { e.preventDefault(); addComp(refreshCallback); };

    // تغییر مقادیر مالی (دستمزد و ...)
    ['labor', 'overhead', 'profit'].forEach(key => {
        document.getElementById('inp-' + key).onchange = (e) => updateCostVariables(key, e.target.value, refreshCallback);
    });

    // فیلتر لیست افزودن
    document.getElementById('comp-filter').onchange = updateCompSelect;

    // انتخاب فرمول از لیست سمت راست
    document.getElementById('formula-master-list').addEventListener('click', (e) => {
        const item = e.target.closest('[data-id]');
        if(item) selectFormula(item.getAttribute('data-id'), refreshCallback);
    });

    // دکمه کپی
    document.getElementById('btn-duplicate-formula').onclick = () => duplicateFormula(refreshCallback);
    
    // تغییر نام
    document.getElementById('active-formula-name').onclick = () => renameFormula(refreshCallback);
    
    // حذف
    document.getElementById('btn-delete-formula').onclick = () => deleteFormula(refreshCallback);
}

// --- لیست سمت راست (Master List) ---
export function renderFormulaList(filter='') {
    const list = state.formulas.filter(f => f.name.includes(filter));
    const el = document.getElementById('formula-master-list');
    
    if(!list.length) { el.innerHTML = '<p class="text-center text-slate-400 text-xs mt-10">موردی یافت نشد</p>'; return; }
    
    el.innerHTML = list.map(f => `
        <div class="p-3 border-b border-slate-100 cursor-pointer hover:bg-teal-50 transition-colors ${f.$id===state.activeFormulaId ? 'bg-teal-50 border-r-4 border-teal-600' : ''}" data-id="${f.$id}">
            <div class="font-bold text-xs text-slate-700 pointer-events-none">${f.name}</div>
            <div class="text-[10px] text-slate-400 mt-0.5 pointer-events-none flex justify-between">
                <span>${formatDate(f.$updatedAt)}</span>
                <span>${formatPrice(calculateCost(f).final)} T</span>
            </div>
        </div>
    `).join('');
}

// --- انتخاب و نمایش جزئیات ---
export function selectFormula(id, refreshCallback) {
    state.activeFormulaId = id;
    renderFormulaList(); // برای هایلایت شدن آیتم
    
    document.getElementById('formula-detail-empty').classList.add('hidden');
    const viewEl = document.getElementById('formula-detail-view');
    viewEl.classList.remove('hidden');
    viewEl.classList.add('flex');

    const f = state.formulas.find(x => x.$id === id);
    if(f) renderFormulaDetail(f, refreshCallback);
    
    if(window.innerWidth < 1024) document.getElementById('detail-panel')?.scrollIntoView({behavior:'smooth'});
}

export function renderFormulaDetail(f, refreshCallback) {
    document.getElementById('active-formula-name').innerText = f.name;
    document.getElementById('active-formula-date').innerText = "بروزرسانی: " + formatDate(f.$updatedAt);
    
    document.getElementById('inp-labor').value = formatPrice(f.labor);
    document.getElementById('inp-overhead').value = formatPrice(f.overhead);
    document.getElementById('inp-profit').value = f.profit;

    updateDropdowns(); 
    updateCompSelect();

    // لیست اجزاء
    let comps = [];
    try { comps = JSON.parse(f.components || '[]'); } catch(e) { console.error(e); }

    const listEl = document.getElementById('formula-comps-list');
    
    if(comps.length === 0) {
        listEl.innerHTML = '<div class="p-8 text-center text-slate-400 text-xs">لیست مواد تشکیل دهنده خالی است.</div>';
    } else {
        listEl.innerHTML = comps.map((c, idx) => {
            let name = '?', unit = '-', price = 0, conversion = 1, total = 0, info='';
            
            if(c.type === 'mat') {
                const m = state.materials.find(x => x.$id === c.id);
                if(m) { 
                    name = m.display_name || m.name; // استفاده از نام نمایشی V2
                    unit = m.consumption_unit; // استفاده از واحد مصرف V2
                    conversion = m.conversion_rate || 1;
                    // محاسبه قیمت: (قیمت خرید / ضریب) * تعداد
                    price = (m.price / conversion); 
                    info = `(نرخ پایه: ${formatPrice(m.price)} / ${m.purchase_unit})`;
                } else { 
                    name = '(کالا حذف شده)'; 
                }
            } else {
                // اگر جزء خودش یک فرمول دیگر باشد (Sub-assembly)
                const sub = state.formulas.find(x => x.$id === c.id);
                if(sub) { 
                    name = `🔗 ${sub.name}`; unit = 'عدد'; 
                    price = calculateCost(sub).final;
                } else { name = '(فرمول حذف شده)'; }
            }
            
            total = price * c.qty;
            
            return `
            <div class="flex justify-between items-center p-3 text-sm hover:bg-slate-50 group">
                <div class="flex-grow">
                    <div class="font-bold text-slate-700 text-xs flex items-center gap-2">
                        ${name}
                    </div>
                    <div class="text-[10px] text-slate-400 mt-0.5">
                        <span class="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">${c.qty}</span> ${unit}
                        <span class="opacity-50 mx-1">×</span>
                        <span>${formatPrice(price.toFixed(0))}</span>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <div class="text-right">
                        <div class="font-mono font-bold text-slate-600 text-xs">${formatPrice(total.toFixed(0))}</div>
                    </div>
                    <button class="text-rose-400 opacity-0 group-hover:opacity-100 px-2 py-1 rounded hover:bg-rose-50 btn-del-comp transition-opacity" data-idx="${idx}">×</button>
                </div>
            </div>`;
        }).join('');
        
        // رویداد حذف سطر
        listEl.querySelectorAll('.btn-del-comp').forEach(btn => {
            btn.onclick = () => removeComp(f, parseInt(btn.dataset.idx), refreshCallback);
        });
    }

    // محاسبه نهایی
    const calc = calculateCost(f);
    document.getElementById('lbl-final-price').innerText = formatPrice(calc.final.toFixed(0));
}

// --- منطق محاسباتی V2 ---
export function calculateCost(f) {
    if(!f) return {matCost:0, sub:0, profit:0, final:0};
    let matCost=0;
    const comps = JSON.parse(f.components || '[]');
    
    comps.forEach(c => {
        if(c.type==='mat') {
            const m = state.materials.find(x => x.$id === c.id);
            if(m) {
                const conversion = m.conversion_rate || 1;
                // فرمول اصلی: (قیمت خرید / ضریب تبدیل) * مقدار مصرفی
                matCost += (m.price / conversion) * c.qty;
            }
        } else {
            const sub = state.formulas.find(x => x.$id === c.id);
            if(sub) matCost += calculateCost(sub).final * c.qty;
        }
    });
    
    const sub = matCost + (f.labor||0) + (f.overhead||0);
    const profit = (f.profit||0)/100 * sub;
    return {matCost, sub, profit, final: sub+profit};
}

// --- دراپ‌داون‌ها ---
export function updateDropdowns() {
    const filterEl = document.getElementById('comp-filter');
    if(!filterEl) return;
    const current = filterEl.value;
    const c = state.categories.map(x => `<option value="${x.$id}">${x.name}</option>`).join('');
    filterEl.innerHTML = '<option value="">همه دسته‌ها...</option>' + c + '<option value="FORM">فرمول‌ها (Sub-Assembly)</option>';
    filterEl.value = current;
}

export function updateCompSelect() {
    const sel = document.getElementById('comp-select');
    const f = document.getElementById('comp-filter').value;
    if(!sel) return;
    
    let h = '<option value="">انتخاب کالا...</option>';
    
    if(f === 'FORM') {
        h += `<optgroup label="فرمول‌های دیگر">` + 
             state.formulas.filter(x => x.$id !== state.activeFormulaId)
             .map(x => `<option value="FORM:${x.$id}">🔗 ${x.name}</option>`).join('') + 
             `</optgroup>`;
    } else {
        state.categories.forEach(cat => {
            if(f && f !== 'FORM' && f !== cat.$id) return;
            const m = state.materials.filter(x => x.category_id === cat.$id);
            if(m.length) {
                h += `<optgroup label="${cat.name}">` + 
                     m.map(x => `<option value="MAT:${x.$id}">${x.name} (${x.consumption_unit})</option>`).join('') + 
                     `</optgroup>`;
            }
        });
        // کالا های بدون دسته
        const o = state.materials.filter(x => !x.category_id);
        if((!f || f === 'null') && o.length) h += `<optgroup label="سایر">` + o.map(x => `<option value="MAT:${x.$id}">${x.name} (${x.consumption_unit})</option>`).join('') + `</optgroup>`;
    }
    sel.innerHTML = h;
}

// --- عملیات دیتابیس ---

async function createFormula(cb) {
    const name = document.getElementById('new-formula-name').value;
    if(!name) return;
    try {
        const res = await api.create(APPWRITE_CONFIG.COLS.FORMS, {
            name, components: '[]', labor: 0.0, overhead: 0.0, profit: 0.0, is_public: false
        });
        closeModal('new-formula-modal');
        document.getElementById('new-formula-name').value = '';
        cb(); // رفرش کامل برای دریافت فرمول جدید
    } catch(e) { alert(e.message); }
}

async function addComp(refreshCb) {
    if(!state.activeFormulaId) return;
    const val = document.getElementById('comp-select').value;
    const qty = parseFloat(document.getElementById('comp-qty').value);
    
    if(!val || !qty) { alert('لطفا کالا و تعداد را وارد کنید'); return; }

    const [typePrefix, id] = val.split(':');
    const type = typePrefix === 'MAT' ? 'mat' : 'form';

    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    let comps = JSON.parse(f.components || '[]');
    
    // بررسی تکراری بودن (اگر هست اضافه کن، اگر نه سطر جدید)
    const exist = comps.find(c => c.id === id && c.type === type);
    if(exist) exist.qty += qty; else comps.push({id, type, qty});
    
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { components: JSON.stringify(comps) });
        document.getElementById('comp-qty').value = '';
        
        // بروزرسانی لوکال برای سرعت بیشتر
        f.components = JSON.stringify(comps);
        renderFormulaDetail(f, refreshCb);
    } catch(e) { alert(e.message); }
}

async function removeComp(f, idx, cb) {
    let comps = JSON.parse(f.components || '[]');
    comps.splice(idx, 1);
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, f.$id, { components: JSON.stringify(comps) });
        f.components = JSON.stringify(comps);
        renderFormulaDetail(f, cb);
    } catch(e) { alert(e.message); }
}

async function updateCostVariables(key, val, cb) {
    if(!state.activeFormulaId) return;
    const numVal = parseLocaleNumber(val);
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { [key]: numVal });
        // آپدیت لوکال
        const f = state.formulas.find(x => x.$id === state.activeFormulaId);
        if(f) { f[key] = numVal; renderFormulaDetail(f, cb); }
    } catch(e) { console.error(e); }
}

// قابلیت جدید: کپی فرمول
async function duplicateFormula(cb) {
    if(!state.activeFormulaId) return;
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    if(!confirm(`از فرمول "${f.name}" یک کپی گرفته شود؟`)) return;
    
    try {
        const newData = {
            name: "کپی " + f.name,
            components: f.components,
            labor: f.labor,
            overhead: f.overhead,
            profit: f.profit,
            is_public: false
        };
        const res = await api.create(APPWRITE_CONFIG.COLS.FORMS, newData);
        alert('کپی ایجاد شد');
        cb(); // رفرش برای دیدن آیتم جدید در لیست
    } catch(e) { alert(e.message); }
}

async function renameFormula(cb) {
    const cur = document.getElementById('active-formula-name').innerText;
    const n = prompt('نام جدید محصول:', cur);
    if(n && n !== cur) {
        try { 
            await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { name: n }); 
            cb();
        } catch(e) { alert(e.message); }
    }
}

async function deleteFormula(cb) {
    if(confirm('این محصول حذف شود؟ قابل برگشت نیست.')) {
        try {
            await api.delete(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId);
            state.activeFormulaId = null;
            document.getElementById('formula-detail-view').classList.add('hidden');
            document.getElementById('formula-detail-empty').classList.remove('hidden');
            cb();
        } catch(e) { alert(e.message); }
    }
}