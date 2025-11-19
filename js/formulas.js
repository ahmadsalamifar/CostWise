import { api, fetchSingleFormula } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { formatPrice, formatDate, getDateBadge, openModal, closeModal } from './utils.js';

export function setupFormulas(refreshCallback) {
    // دکمه‌های ثابت
    document.getElementById('btn-open-new-formula').onclick = () => openModal('new-formula-modal');
    document.getElementById('btn-create-formula').onclick = () => createFormula(refreshCallback);
    document.getElementById('btn-cancel-formula').onclick = () => closeModal('new-formula-modal');
    
    // جستجو
    document.getElementById('search-formulas').oninput = (e) => renderFormulaList(e.target.value);
    
    // فرم افزودن کالا (با رفرش)
    document.getElementById('form-add-comp').onsubmit = (e) => { 
        e.preventDefault(); 
        addComp(refreshCallback); 
    };

    // اینپوت‌های هزینه
    ['labor', 'overhead', 'profit'].forEach(key => {
        document.getElementById('inp-' + key).onchange = (e) => updateCost(key, e.target.value, refreshCallback);
    });

    // دکمه‌های ویرایش/حذف (اینجا مقدار اولیه می‌دهیم، اما در render دوباره ست می‌شوند)
    document.getElementById('active-formula-name').onclick = () => renameFormula(refreshCallback);
    document.getElementById('btn-delete-formula').onclick = () => deleteFormula(refreshCallback);
    
    // فیلتر
    document.getElementById('comp-filter').onchange = updateCompSelect;
    
    // انتخاب از لیست
    const listEl = document.getElementById('formula-master-list');
    if(listEl) {
        listEl.addEventListener('click', (e) => {
            const item = e.target.closest('[data-id]');
            if(item) selectFormula(item.getAttribute('data-id'), refreshCallback);
        });
    }
}

// --- 1. رندر لیست (Sidebar) ---
export function renderFormulaList(filter='') {
    const list = state.formulas.filter(f => f.name.includes(filter));
    const el = document.getElementById('formula-master-list');
    
    if(!list.length) { 
        el.innerHTML = '<p class="text-center text-slate-400 text-xs mt-10">یافت نشد</p>'; 
        return; 
    }
    
    el.innerHTML = list.map(f => `
        <div class="p-3 border-b border-slate-100 cursor-pointer hover:bg-teal-50 transition-colors ${f.$id===state.activeFormulaId ? 'bg-teal-50 border-r-4 border-teal-600' : ''}" data-id="${f.$id}">
            <div class="font-bold text-xs text-slate-700 pointer-events-none">${f.name}</div>
            <div class="text-[10px] text-slate-400 mt-0.5 pointer-events-none">${formatDate(f.$updatedAt)}</div>
        </div>
    `).join('');
}

// --- 2. انتخاب فرمول ---
export function selectFormula(id, refreshCallback) {
    state.activeFormulaId = id;
    renderFormulaList(); // آپدیت رنگ انتخاب
    
    document.getElementById('formula-detail-empty').classList.add('hidden');
    document.getElementById('formula-detail-view').classList.remove('hidden');
    document.getElementById('formula-detail-view').classList.add('flex');
    
    const f = state.formulas.find(x => x.$id === id);
    if(f) renderFormulaDetail(f, refreshCallback);
    
    if(window.innerWidth < 1024) document.getElementById('detail-panel').scrollIntoView({behavior: 'smooth'});
}

// --- 3. رندر جزئیات (قلب برنامه) ---
export function renderFormulaDetail(f, refreshCallback) {
    // الف) نمایش اطلاعات کلی
    const nameEl = document.getElementById('active-formula-name');
    nameEl.innerText = f.name;
    // اتصال مجدد رویداد کلیک برای ویرایش نام (خیلی مهم)
    nameEl.onclick = () => renameFormula(refreshCallback);
    nameEl.style.cursor = 'pointer';

    // اتصال مجدد دکمه حذف
    document.getElementById('btn-delete-formula').onclick = () => deleteFormula(refreshCallback);

    document.getElementById('inp-labor').value = formatPrice(f.labor);
    document.getElementById('inp-overhead').value = formatPrice(f.overhead);
    document.getElementById('inp-profit').value = f.profit;

    // ب) پر کردن دراپ‌داون‌ها (حل مشکل فیلتر خالی)
    updateDropdowns(); 
    updateCompSelect();

    // ج) پارس کردن اجزا
    let comps = [];
    try {
        if(f.components && f.components !== 'null') comps = JSON.parse(f.components);
    } catch(e) { console.error("JSON Parse Error", e); }

    // د) رندر لیست کالاها
    const listEl = document.getElementById('formula-comps-list');
    
    if (comps.length === 0) {
        listEl.innerHTML = '<div class="p-8 text-center text-slate-400 text-xs">لیست مواد خالی است</div>';
    } else {
        listEl.innerHTML = comps.map((c, idx) => {
            let name='-', unit='-', price=0, total=0, badge='';
            
            if(c.type === 'mat') {
                const m = state.materials.find(x => x.$id === c.id);
                if(m) { 
                    name = m.name; unit = m.unit; price = m.price; 
                    badge = getDateBadge(m.$updatedAt); 
                } else { 
                    name = '(کالا حذف شده)'; badge = '<span class="text-rose-500">!</span>'; 
                }
            } else {
                const sub = state.formulas.find(x => x.$id === c.id);
                if(sub) { 
                    name = `🔗 ${sub.name}`; unit = 'عدد'; 
                    price = calculateCost(sub).final; 
                    badge = getDateBadge(sub.$updatedAt);
                } else { name = '(حذف شده)'; }
            }
            
            total = price * c.qty;
            
            return `
            <div class="flex justify-between items-center p-3 text-sm border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <div class="flex-grow">
                    <div class="font-bold text-slate-700 text-xs flex items-center gap-2">
                        ${name} ${badge}
                    </div>
                    <div class="text-[10px] text-slate-400 mt-0.5">
                        <span class="bg-slate-100 px-1 rounded border">${c.qty}</span> ${unit} × ${formatPrice(price)}
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="font-mono font-bold text-slate-600 text-xs">${formatPrice(total)}</span>
                    <button class="text-rose-400 hover:text-rose-600 px-2 py-1 rounded hover:bg-rose-50 btn-del-comp" data-idx="${idx}">×</button>
                </div>
            </div>`;
        }).join('');

        // اتصال دکمه‌های حذف سطر
        listEl.querySelectorAll('.btn-del-comp').forEach(btn => {
            btn.onclick = () => removeComp(f.$id, parseInt(btn.dataset.idx), () => {
                // رفرش داخلی و سریع
                api.get(APPWRITE_CONFIG.COLS.FORMS, f.$id).then(updatedF => {
                    const idx = state.formulas.findIndex(i => i.$id === f.$id);
                    if(idx!==-1) state.formulas[idx] = updatedF;
                    renderFormulaDetail(updatedF, refreshCallback);
                });
            });
        });
    }

    // هـ) محاسبه قیمت نهایی
    const calc = calculateCost(f);
    document.getElementById('lbl-final-price').innerText = formatPrice(calc.final);
}

// --- محاسبات ---
export function calculateCost(f) {
    if(!f) return {matCost:0, sub:0, profit:0, final:0};
    let matCost=0;
    const comps = JSON.parse(f.components || '[]');
    comps.forEach(c => {
        if(c.type==='mat') {
            const m = state.materials.find(x => x.$id === c.id);
            if(m) matCost += m.price * c.qty;
        } else {
            const sub = state.formulas.find(x => x.$id === c.id);
            if(sub) matCost += calculateCost(sub).final * c.qty;
        }
    });
    const sub = matCost + (f.labor||0) + (f.overhead||0);
    const profit = (f.profit||0)/100 * sub;
    return {matCost, sub, profit, final: sub+profit};
}

// --- عملیات ---
async function createFormula(cb) {
    const name = document.getElementById('new-formula-name').value;
    if(!name) return;
    try {
        const res = await api.create(APPWRITE_CONFIG.COLS.FORMS, {
            name, components: '[]', labor: 0.0, overhead: 0.0, profit: 0.0, is_public: false
        });
        state.formulas.unshift(res);
        closeModal('new-formula-modal');
        document.getElementById('new-formula-name').value = '';
        selectFormula(res.$id, cb);
    } catch(e) { alert(e.message); }
}

async function addComp(cb) {
    if(!state.activeFormulaId) return;
    const val = document.getElementById('comp-select').value;
    const qty = parseFloat(document.getElementById('comp-qty').value);
    if(!val || !qty) { alert('ناقص'); return; }

    const [typePrefix, id] = val.split(':');
    const type = typePrefix === 'MAT' ? 'mat' : 'form';
    if(type === 'form' && id === state.activeFormulaId) { alert('لوپ!'); return; }
    
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    let comps = JSON.parse(f.components || '[]');
    const exist = comps.find(c => c.id === id && c.type === type);
    if(exist) exist.qty += qty; else comps.push({id, type, qty});
    
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { components: JSON.stringify(comps) });
        document.getElementById('comp-qty').value = '';
        
        // دریافت مجدد فرمول برای اطمینان
        const updatedF = await fetchSingleFormula(state.activeFormulaId);
        renderFormulaDetail(updatedF, cb);
    } catch(e) { alert(e.message); }
}

async function removeComp(fid, idx, localRefresh) {
    const f = state.formulas.find(x => x.$id === fid);
    let comps = JSON.parse(f.components || '[]');
    comps.splice(idx, 1);
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, fid, { components: JSON.stringify(comps) });
        localRefresh();
    } catch(e) { alert(e.message); }
}

async function updateCost(key, val, cb) {
    if(!state.activeFormulaId) return;
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { [key]: parseFloat(val.replace(/,/g,'')) || 0 });
        const f = await fetchSingleFormula(state.activeFormulaId);
        renderFormulaDetail(f, cb);
    } catch(e) { console.error(e); }
}

async function renameFormula(cb) {
    // استفاده از مودال جدید (اگر وجود دارد) یا prompt
    const modal = document.getElementById('rename-modal');
    if (modal) {
        document.getElementById('rename-input').value = document.getElementById('active-formula-name').innerText;
        openModal('rename-modal');
        
        // تنظیم دکمه ذخیره مودال
        const btnSave = document.getElementById('btn-save-rename');
        btnSave.onclick = async () => {
            const newName = document.getElementById('rename-input').value;
            if(newName) {
                try {
                    await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { name: newName });
                    closeModal('rename-modal');
                    cb(); // رفرش کامل لیست
                } catch(e) { alert(e.message); }
            }
        };
    } else {
        // فال‌بک به prompt
        const n = prompt('نام جدید:', document.getElementById('active-formula-name').innerText);
        if(n) {
            try { await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { name: n }); cb(); }
            catch(e) { alert(e.message); }
        }
    }
}

async function deleteFormula(cb) {
    if(confirm('حذف شود؟')) {
        try {
            await api.delete(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId);
            state.activeFormulaId = null;
            cb(); // رفرش کامل لیست
        } catch(e) { alert(e.message); }
    }
}

export function updateDropdowns() {
    const filterEl = document.getElementById('comp-filter');
    // فقط اگر گزینه‌ها کم بود (لود نشده بود) پر کن، یا اگر مجبوریم
    const c = state.categories.map(x => `<option value="${x.$id}">${x.name}</option>`).join('');
    const cur = filterEl.value;
    filterEl.innerHTML = '<option value="">همه دسته‌ها...</option>' + c + '<option value="FORM">فرمول‌ها</option>';
    filterEl.value = cur;
}

export function updateCompSelect() {
    const sel = document.getElementById('comp-select');
    const f = document.getElementById('comp-filter').value;
    if(!sel) return;
    
    let h = '<option value="">انتخاب کالا...</option>';
    if(f === 'FORM') {
        h += `<optgroup label="فرمول‌ها">` + state.formulas.filter(x => x.$id !== state.activeFormulaId).map(x => `<option value="FORM:${x.$id}">🔗 ${x.name}</option>`).join('') + `</optgroup>`;
    } else {
        state.categories.forEach(cat => {
            if(f && f !== 'FORM' && f !== cat.$id) return;
            const m = state.materials.filter(x => x.category_id === cat.$id);
            if(m.length) h += `<optgroup label="${cat.name}">` + m.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + `</optgroup>`;
        });
        const o = state.materials.filter(x => !x.category_id);
        if((!f || f === 'null') && o.length) h += `<optgroup label="سایر">` + o.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + `</optgroup>`;
    }
    sel.innerHTML = h;
}