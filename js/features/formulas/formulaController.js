// کنترلر اصلی فرمول‌ها
// وظیفه: هماهنگی بین لیست، جزئیات و API

import { api } from '../../core/api.js';
import { state, APPWRITE_CONFIG } from '../../core/config.js';
import { parseLocaleNumber, openModal, closeModal } from '../../core/utils.js';
import * as ListUI from './formulaList.js';
import * as DetailUI from './formulaDetail.js';

export function init(refreshCb) {
    injectLayout(); 
    
    setTimeout(() => {
        ListUI.setupSearch(() => ListUI.renderList(state.activeFormulaId, selectFormula));
        
        // دکمه‌های سراسری
        const btnOpen = document.getElementById('btn-open-new-formula');
        if(btnOpen) btnOpen.onclick = () => openModal('new-formula-modal');
        
        const btnCreate = document.getElementById('btn-create-formula');
        if(btnCreate) btnCreate.onclick = () => createFormula(refreshCb);
        
        const btnCancel = document.getElementById('btn-cancel-formula');
        if(btnCancel) btnCancel.onclick = () => closeModal('new-formula-modal');

        // پنل جزئیات - دکمه‌های جدید
        document.getElementById('form-add-comp').onsubmit = (e) => {
            e.preventDefault();
            addComponent(refreshCb);
        };
        
        // دکمه ثبت تغییرات (جدید)
        const btnSave = document.getElementById('btn-save-formula');
        if(btnSave) btnSave.onclick = () => saveFormulaChanges(refreshCb);

        // تغییرات ورودی‌ها دیگر مستقیماً به API نمی‌روند، فقط لوکال استیت را آپدیت می‌کنند
        ['labor', 'overhead', 'profit'].forEach(key => {
            const inp = document.getElementById('inp-' + key);
            if(inp) inp.onchange = (e) => {
                if(state.activeFormulaId) {
                    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
                    if(f) {
                        f[key] = parseLocaleNumber(e.target.value);
                        DetailUI.renderDetailView(f, { onDeleteComp: (idx) => removeComponent(idx, refreshCb) }); // رفرش محاسبات
                        highlightSaveButton(); // تغییر رنگ دکمه ثبت
                    }
                }
            };
        });

        document.getElementById('btn-delete-formula').onclick = () => deleteFormula(refreshCb);
        document.getElementById('btn-duplicate-formula').onclick = () => duplicateFormula(refreshCb);
        document.getElementById('active-formula-name').onclick = () => renameFormula(refreshCb);

        DetailUI.setupDropdownListeners();
    }, 50); 
}

export function renderFormulaList() {
    ListUI.renderList(state.activeFormulaId, selectFormula);
}

function selectFormula(id) {
    state.activeFormulaId = id;
    renderFormulaList();
    
    const formula = state.formulas.find(f => f.$id === id);
    resetSaveButton(); // بازنشانی دکمه ثبت به حالت عادی
    DetailUI.renderDetailView(formula, {
        onDeleteComp: (idx) => removeComponent(idx, () => selectFormula(id))
    });

    if (window.innerWidth < 1024) document.getElementById('detail-panel')?.scrollIntoView({ behavior: 'smooth' });
}

// --- عملیات دیتا ---

async function saveFormulaChanges(cb) {
    if (!state.activeFormulaId) return;
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    if(!f) return;

    const btn = document.getElementById('btn-save-formula');
    if(btn) { btn.innerText = '⏳ در حال ثبت...'; btn.disabled = true; }

    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, f.$id, {
            labor: f.labor,
            overhead: f.overhead,
            profit: f.profit,
            components: typeof f.components === 'string' ? f.components : JSON.stringify(f.components)
        });
        resetSaveButton();
        cb(); // رفرش کلی برای اطمینان
        // alert('تغییرات با موفقیت ثبت شد');
    } catch(e) {
        alert('خطا در ثبت: ' + e.message);
        if(btn) { btn.innerText = 'ثبت تغییرات'; btn.disabled = false; }
    }
}

function highlightSaveButton() {
    const btn = document.getElementById('btn-save-formula');
    if(btn) {
        btn.classList.remove('bg-slate-700', 'hover:bg-slate-600');
        btn.classList.add('bg-emerald-600', 'hover:bg-emerald-700', 'animate-pulse');
        btn.innerText = 'ثبت تغییرات (ذخیره نشده)';
    }
}

function resetSaveButton() {
    const btn = document.getElementById('btn-save-formula');
    if(btn) {
        btn.className = 'btn bg-slate-700 hover:bg-slate-600 text-white w-full h-10 shadow-lg transition-all';
        btn.innerText = 'ثبت تغییرات';
        btn.disabled = false;
    }
}

// ... (createFormula, deleteFormula, duplicateFormula, renameFormula same as before) ...
async function createFormula(cb) {
    const name = document.getElementById('new-formula-name').value;
    if (!name) return;
    try {
        await api.create(APPWRITE_CONFIG.COLS.FORMS, {
            name, components: '[]', labor: 0, overhead: 0, profit: 0, is_public: false
        });
        closeModal('new-formula-modal');
        cb();
    } catch(e) { alert(e.message); }
}

async function deleteFormula(cb) {
    if(confirm('حذف شود؟')) {
        await api.delete(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId);
        state.activeFormulaId = null;
        cb();
    }
}

async function duplicateFormula(cb) {
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    if(!f) return;
    try {
        await api.create(APPWRITE_CONFIG.COLS.FORMS, {
            name: f.name + ' (کپی)',
            components: typeof f.components === 'string' ? f.components : JSON.stringify(f.components),
            labor: f.labor, overhead: f.overhead, profit: f.profit
        });
        cb();
    } catch(e) { alert(e.message); }
}

async function renameFormula(cb) {
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    const n = prompt('نام جدید:', f.name);
    if (n && n !== f.name) {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, f.$id, { name: n });
        cb();
    }
}

// افزودن و حذف کامپوننت: فعلاً لوکال آپدیت می‌کنیم، کاربر باید دکمه ثبت را بزند
// (یا می‌توانیم برای این‌ها استثنا قائل شویم و اتومات ذخیره کنیم - اما طبق درخواست شما همه چیز با دکمه ثبت باشد)
// استراتژی: تغییر لوکال + هایلایت دکمه ثبت
async function addComponent(cb) {
    if (!state.activeFormulaId) return;
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    
    const val = document.getElementById('comp-select').value;
    const qty = parseFloat(document.getElementById('comp-qty').value);
    const unit = document.getElementById('comp-unit-select').value;

    if (!val || !qty) return alert('اطلاعات ناقص است');

    const [typePrefix, id] = val.split(':');
    const type = typePrefix === 'MAT' ? 'mat' : 'form';
    
    let comps = parseComponents(f.components);
    const exist = comps.find(c => c.id === id && c.type === type && c.unit === unit);
    if (exist) exist.qty += qty; else comps.push({ id, type, qty, unit });

    // آپدیت لوکال
    f.components = comps; // اینجا هنوز استرینگ نشده، آرایه است که خوبه
    DetailUI.renderDetailView(f, { onDeleteComp: (idx) => removeComponent(idx, cb) });
    highlightSaveButton();
}

async function removeComponent(idx, cb) {
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    let comps = parseComponents(f.components);
    comps.splice(idx, 1);
    f.components = comps;
    DetailUI.renderDetailView(f, { onDeleteComp: (idx) => removeComponent(idx, cb) });
    highlightSaveButton();
}

function parseComponents(data) {
    try { return typeof data === 'string' ? JSON.parse(data) : (data || []); } catch { return []; }
}

// اصلاح HTML تزریقی
function injectLayout() {
    const container = document.getElementById('tab-formulas');
    if (!container || document.getElementById('formula-master-list')) return;

    container.innerHTML = `
        <div class="w-full lg:w-1/3 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-[350px] lg:h-full shrink-0">
            <div class="p-3 border-b flex gap-2 bg-slate-50 sticky top-0 z-10">
                <input type="text" id="search-formulas" placeholder="جستجو..." class="input-field text-xs h-10">
                <button id="btn-open-new-formula" class="bg-teal-600 text-white w-10 h-10 rounded-xl font-bold shadow text-xl hover:bg-teal-700 shrink-0 transition-colors" title="فرمول جدید">+</button>
            </div>
            <div id="formula-master-list" class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1"></div>
        </div>
        
        <div class="w-full lg:w-2/3 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative min-h-[500px] lg:h-full" id="detail-panel">
            <div id="formula-detail-empty" class="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                <span class="text-6xl mb-4 opacity-20">🏗️</span>
                <p class="font-bold text-sm">یک محصول انتخاب کنید</p>
            </div>
            <div id="formula-detail-view" class="hidden flex-col h-full w-full absolute inset-0 bg-white">
                <div class="p-3 border-b flex flex-wrap justify-between items-center bg-slate-50 gap-2">
                    <div class="overflow-hidden mr-2 flex-1 min-w-[150px]">
                        <h2 id="active-formula-name" class="text-base font-bold text-slate-800 cursor-pointer hover:text-teal-600 border-b border-dashed border-slate-300 pb-1 truncate w-fit max-w-full">---</h2>
                        <div class="flex items-center gap-2 mt-1">
                            <span id="active-formula-date" class="text-[10px] text-slate-400"></span>
                            <span id="formula-item-count" class="text-[9px] bg-slate-200 text-slate-600 px-1.5 rounded-full">0 قلم</span>
                        </div>
                    </div>
                    <div class="flex gap-2 shrink-0">
                         <button id="btn-duplicate-formula" class="btn btn-white border border-blue-200 text-blue-600 py-1.5 px-3 text-xs shadow-sm hover:bg-blue-50 flex items-center gap-1"><span>📑</span> کپی</button>
                         <button id="btn-print" class="btn btn-white border border-slate-200 text-slate-600 py-1.5 px-3 text-xs shadow-sm hover:bg-slate-50 flex items-center gap-1"><span>🖨</span> چاپ</button>
                         <button id="btn-delete-formula" class="btn btn-white border border-rose-200 text-rose-600 py-1.5 px-3 text-xs shadow-sm hover:bg-rose-50 flex items-center gap-1"><span>🗑</span> حذف</button>
                    </div>
                </div>
                
                <div class="p-3 border-b bg-white shadow-sm z-20">
                    <form id="form-add-comp" class="flex flex-col gap-2">
                         <div class="flex gap-2">
                            <select id="comp-filter" class="input-field w-1/3 text-[10px] bg-slate-50 px-1"></select>
                            <select id="comp-select" class="input-field w-2/3 text-xs font-bold" required></select>
                         </div>
                         <div class="flex gap-2 items-center">
                            <select id="comp-unit-select" class="input-field w-1/3 text-[10px] bg-slate-50 px-1"></select>
                            <input id="comp-qty" class="input-field w-1/3 text-center font-bold" placeholder="تعداد" type="number" step="any" required>
                            <button class="btn btn-primary w-1/3 text-xs shadow-md h-9">افزودن</button>
                         </div>
                    </form>
                </div>
                
                <div id="formula-comps-list" class="flex-1 overflow-y-auto bg-slate-50/30 divide-y divide-slate-100 pb-20 custom-scrollbar"></div>
                
                <div class="p-4 bg-slate-800 text-slate-200 border-t z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    <div class="grid grid-cols-3 gap-3 mb-4">
                        <div><label class="text-[9px] block text-slate-400 mb-1 text-center">دستمزد</label><input id="inp-labor" class="w-full bg-slate-700 p-2 rounded text-center text-sm text-white border border-slate-600 focus:border-teal-500 outline-none"></div>
                        <div><label class="text-[9px] block text-slate-400 mb-1 text-center">سربار</label><input id="inp-overhead" class="w-full bg-slate-700 p-2 rounded text-center text-sm text-white border border-slate-600 focus:border-teal-500 outline-none"></div>
                        <div><label class="text-[9px] block text-slate-400 mb-1 text-center">سود %</label><input id="inp-profit" class="w-full bg-slate-700 p-2 rounded text-center text-sm text-white border border-slate-600 focus:border-teal-500 outline-none" type="number"></div>
                    </div>
                    
                    <div class="flex gap-3 items-end">
                        <button id="btn-save-formula" class="btn bg-slate-700 hover:bg-slate-600 text-white w-full h-10 shadow-lg transition-all flex-1">ثبت تغییرات</button>
                        
                        <div class="text-right min-w-[120px]">
                            <span class="text-[10px] text-slate-400 block">قیمت نهایی:</span>
                            <div><span id="lbl-final-price" class="text-xl md:text-2xl font-black text-teal-400 tracking-tight">0</span> <span class="text-[10px] text-slate-500">تومان</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}