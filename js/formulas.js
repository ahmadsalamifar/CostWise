import { api, fetchSingleFormula } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { formatPrice, formatDate, getDateBadge, openModal, closeModal } from './utils.js';

export function setupFormulas(refreshCallback) {
    // --- مودال محصول جدید ---
    const btnNew = document.getElementById('btn-open-new-formula');
    if(btnNew) btnNew.onclick = () => openModal('new-formula-modal');
    
    const btnCreate = document.getElementById('btn-create-formula');
    if(btnCreate) btnCreate.onclick = () => createFormula(refreshCallback);
    
    const btnCancel = document.getElementById('btn-cancel-formula');
    if(btnCancel) btnCancel.onclick = () => closeModal('new-formula-modal');

    // --- مودال تغییر نام (جدید) ---
    const btnSaveRename = document.getElementById('btn-save-rename');
    // نکته: ما اینجا یک تابع میانی می‌نویسیم که saveRename واقعی را صدا بزند
    if(btnSaveRename) btnSaveRename.onclick = () => saveRename(refreshCallback);

    const btnCancelRename = document.getElementById('btn-cancel-rename');
    if(btnCancelRename) btnCancelRename.onclick = () => closeModal('rename-modal');

    // --- سایر بخش‌ها ---
    const addForm = document.getElementById('form-add-comp');
    if(addForm) addForm.onsubmit = (e) => { e.preventDefault(); addComp(refreshCallback); };

    ['labor', 'overhead', 'profit'].forEach(key => {
        const el = document.getElementById('inp-' + key);
        if(el) el.onchange = (e) => updateCost(key, e.target.value, refreshCallback);
    });

    // فیلتر و جستجو
    const filterEl = document.getElementById('comp-filter');
    if(filterEl) filterEl.onchange = updateCompSelect;
    
    const searchEl = document.getElementById('search-formulas');
    if(searchEl) searchEl.oninput = (e) => renderFormulaList(e.target.value);

    // انتخاب از لیست
    const listEl = document.getElementById('formula-master-list');
    if(listEl) {
        listEl.addEventListener('click', (e) => {
            const item = e.target.closest('[data-id]');
            if(item) selectFormula(item.getAttribute('data-id'), refreshCallback);
        });
    }
}

// --- رندر لیست ---
export function renderFormulaList(filter='') {
    const list = state.formulas.filter(f => f.name.includes(filter));
    const el = document.getElementById('formula-master-list');
    if(!el) return;
    
    if(!list.length) { el.innerHTML = '<p class="text-center text-slate-400 text-xs mt-10">موردی یافت نشد</p>'; return; }
    
    el.innerHTML = list.map(f => `
        <div class="p-4 border-b border-slate-100 cursor-pointer hover:bg-teal-50 transition-all duration-200 ${f.$id===state.activeFormulaId ? 'bg-teal-50 border-r-4 border-teal-600 shadow-inner' : ''}" data-id="${f.$id}">
            <div class="font-bold text-sm text-slate-800 pointer-events-none">${f.name}</div>
            <div class="text-[10px] text-slate-400 mt-1 pointer-events-none flex justify-between">
                <span>${formatDate(f.$updatedAt)}</span>
            </div>
        </div>
    `).join('');
}

// --- انتخاب فرمول ---
export function selectFormula(id, refreshCallback) {
    state.activeFormulaId = id;
    renderFormulaList();
    
    document.getElementById('formula-detail-empty').classList.add('hidden');
    const viewEl = document.getElementById('formula-detail-view');
    viewEl.classList.remove('hidden');
    viewEl.classList.add('flex');
    
    const f = state.formulas.find(x => x.$id === id);
    if(f) renderFormulaDetail(f, refreshCallback);
    
    if(window.innerWidth < 1024) document.getElementById('detail-panel')?.scrollIntoView({behavior:'smooth'});
}

// --- نمایش جزئیات (دکمه‌های زیبا شده) ---
export function renderFormulaDetail(f, refreshCallback) {
    // 1. هدر: نام و دکمه‌ها
    const headerContainer = document.querySelector('#formula-detail-view .border-b');
    if(headerContainer) {
        headerContainer.innerHTML = `
            <div class="flex-grow overflow-hidden">
                <h2 id="active-formula-name" class="text-xl font-black text-slate-800 cursor-pointer truncate hover:text-teal-600 transition-colors" title="برای تغییر نام کلیک کنید">
                    ${f.name} <span class="text-xs font-normal text-slate-400 mr-2">✎</span>
                </h2>
            </div>
            <div class="flex gap-2 mr-4">
                <button id="btn-print" class="btn bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-800 hover:shadow-md transition-all h-10 px-4 text-sm shadow-sm">
                    <span class="text-lg">🖨</span> <span class="hidden md:inline mr-1">چاپ</span>
                </button>
                <button id="btn-delete-formula" class="btn bg-white text-rose-500 border border-rose-100 hover:bg-rose-50 hover:border-rose-300 hover:shadow-md transition-all h-10 px-4 text-sm shadow-sm">
                    <span class="text-lg">🗑</span> <span class="hidden md:inline mr-1">حذف</span>
                </button>
            </div>
        `;
        
        // اتصال مجدد رویدادها چون HTML را عوض کردیم
        document.getElementById('active-formula-name').onclick = () => openRenameModal();
        document.getElementById('btn-delete-formula').onclick = () => deleteFormula(refreshCallback);
        // ایمپورت پرینت اینجا در دسترس نیست، پس از window یا رویداد سراسری استفاده نمیکنیم
        // راه حل: تابع پرینت را از main یا print.js فراخوانی کنیم. 
        // اما چون اینجاژ ماژول است، بهتر است یک Custom Event بسازیم یا printFormula را ایمپورت کنیم.
        // ساده‌ترین راه: استفاده از ماژول print.js که قبلاً داشتیم.
        import('./print.js').then(module => {
            document.getElementById('btn-print').onclick = module.printFormula || window.printFormula;
        });
    }

    // بقیه فیلدها
    document.getElementById('inp-labor').value = formatPrice(f.labor);
    document.getElementById('inp-overhead').value = formatPrice(f.overhead);
    document.getElementById('inp-profit').value = f.profit;

    if(document.getElementById('comp-filter').options.length <= 1) updateDropdowns();
    updateCompSelect();

    let comps = [];
    try { comps = JSON.parse(f.components || '[]'); } catch(e) { console.error(e); }

    const listEl = document.getElementById('formula-comps-list');
    if(comps.length === 0) {
        listEl.innerHTML = '<div class="p-10 text-center text-slate-400 text-sm flex flex-col items-center gap-2"><span class="text-3xl opacity-50">📦</span>لیست مواد خالی است.<br>از نوار بالا کالا اضافه کنید.</div>';
    } else {
        listEl.innerHTML = comps.map((c, idx) => {
            let name = '?', unit = '-', price = 0, total = 0, badge = '';
            if(c.type === 'mat') {
                const m = state.materials.find(x => x.$id === c.id);
                if(m) { name = m.name; unit = m.unit; price = m.price; badge = getDateBadge(m.$updatedAt); }
                else { name = '(حذف شده)'; badge = '<span class="text-rose-500 text-[10px]">!</span>'; }
            } else {
                const sub = state.formulas.find(x => x.$id === c.id);
                if(sub) { name = `🔗 ${sub.name}`; unit = 'عدد'; price = calculateCost(sub).final; badge = getDateBadge(sub.$updatedAt); }
                else { name = '(حذف شده)'; }
            }
            total = price * c.qty;
            return `
            <div class="flex justify-between items-center p-3 text-sm border-b border-slate-50 hover:bg-slate-50 group transition-colors">
                <div class="flex-grow">
                    <div class="font-bold text-slate-700 text-xs flex items-center gap-2">${name} ${badge}</div>
                    <div class="text-[11px] text-slate-400 mt-1"><span class="bg-white border px-1.5 rounded font-mono text-slate-600">${c.qty}</span> ${unit} × ${formatPrice(price)}</div>
                </div>
                <div class="flex items-center gap-3">
                    <span class="font-mono font-bold text-slate-600 text-xs">${formatPrice(total)}</span>
                    <button class="text-rose-300 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 btn-del-comp" data-idx="${idx}">🗑</button>
                </div>
            </div>`;
        }).join('');

        listEl.querySelectorAll('.btn-del-comp').forEach(btn => {
            btn.onclick = () => removeComp(f.$id, parseInt(btn.dataset.idx), () => {
                api.get(APPWRITE_CONFIG.COLS.FORMS, f.$id).then(updatedF => {
                    const index = state.formulas.findIndex(i => i.$id === f.$id);
                    if(index !== -1) state.formulas[index] = updatedF;
                    renderFormulaDetail(updatedF, refreshCallback);
                });
            });
        });
    }

    const calc = calculateCost(f);
    document.getElementById('lbl-final-price').innerText = formatPrice(calc.final);
}

// --- سایر توابع کمکی و محاسباتی ---
export function calculateCost(f) {
    if(!f) return {matCost:0, sub:0, profit:0, final:0};
    let matCost=0; const comps = JSON.parse(f.components || '[]');
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

// --- عملیات اصلی ---
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

// --- تغییر نام با مودال ---
function openRenameModal() {
    const currentName = document.getElementById('active-formula-name').innerText.replace(' ✎', '');
    const input = document.getElementById('rename-input');
    input.value = currentName;
    openModal('rename-modal');
    input.select(); // انتخاب متن برای ویرایش سریع
}

async function saveRename(cb) {
    const newName = document.getElementById('rename-input').value.trim();
    if(!newName || !state.activeFormulaId) return;
    
    try {
        // دکمه را در حالت لودینگ قرار بده
        const btn = document.getElementById('btn-save-rename');
        const oldText = btn.innerText;
        btn.innerText = "..."; btn.disabled = true;

        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { name: newName });
        
        closeModal('rename-modal');
        btn.innerText = oldText; btn.disabled = false;
        
        // رفرش کل برنامه (چون اسم در لیست سایدبار هم باید عوض شود)
        cb(); 
    } catch(e) { alert("خطا: " + e.message); }
}

async function deleteFormula(cb) {
    if(confirm('آیا از حذف کامل این محصول و تمام محتویات آن مطمئن هستید؟')) {
        try {
            await api.delete(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId);
            state.activeFormulaId = null;
            cb();
        } catch(e) { alert(e.message); }
    }
}

// (بقیه توابع مثل addComp, removeComp, updateCost و Dropdown ها تغییری نکرده و مثل قبل هستند)
// برای کوتاه شدن پاسخ، آن‌ها را تکرار نمی‌کنم چون در فایل قبلی درست بودند. 
// فقط حتماً مطمئن شوید که توابع addComp, removeComp, updateCost, updateDropdowns, updateCompSelect 
// در انتهای این فایل وجود داشته باشند (کپی از کد قبلی).
async function addComp(refreshCb) { /* کد قبلی */ 
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
        const updatedF = await api.get(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId);
        const idx = state.formulas.findIndex(x => x.$id === state.activeFormulaId);
        if(idx !== -1) state.formulas[idx] = updatedF;
        renderFormulaDetail(updatedF, refreshCb);
    } catch(e) { alert(e.message); }
}

async function removeComp(fid, idx, localRefresh) { /* کد قبلی */
    const f = state.formulas.find(x => x.$id === fid);
    let comps = JSON.parse(f.components || '[]');
    comps.splice(idx, 1);
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, fid, { components: JSON.stringify(comps) });
        localRefresh();
    } catch(e) { alert(e.message); }
}

async function updateCost(key, val, cb) { /* کد قبلی */
    if(!state.activeFormulaId) return;
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { [key]: parseFloat(val.replace(/,/g,'')) || 0 });
        const updatedF = await api.get(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId);
        renderFormulaDetail(updatedF, cb);
    } catch(e) { console.error(e); }
}

export function updateDropdowns() { /* کد قبلی */
    const filterEl = document.getElementById('comp-filter');
    if(!filterEl) return;
    const c = state.categories.map(x => `<option value="${x.$id}">${x.name}</option>`).join('');
    const cur = filterEl.value;
    filterEl.innerHTML = '<option value="">همه دسته‌ها...</option>' + c + '<option value="FORM">فرمول‌ها</option>';
    filterEl.value = cur;
}

export function updateCompSelect() { /* کد قبلی */
    const sel = document.getElementById('comp-select');
    const f = document.getElementById('comp-filter').value;
    if(!sel) return;
    let h = '<option value="">انتخاب...</option>';
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