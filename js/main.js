import { account, state, APPWRITE_CONFIG } from './config.js';
import { fetchAllData, api } from './api.js';

// === STARTUP (شروع برنامه) ===
document.addEventListener('DOMContentLoaded', async () => {
    // 1. ابتدا دکمه‌ها را فعال می‌کنیم (خیلی مهم)
    setupEvents();

    try {
        // 2. بررسی وضعیت لاگین
        try { await account.get(); } catch { await account.createAnonymousSession(); }
        
        // 3. دریافت داده‌ها از سرور
        await fetchAllData();
        
        // 4. نمایش برنامه
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        
        // پیش‌فرض روی تب محصولات
        switchTab('formulas');
        updateUI();
        
    } catch (err) {
        document.getElementById('loading-text').innerText = "خطا: " + err.message;
        document.getElementById('loading-text').style.color = "red";
        console.error(err);
    }
});

// === EVENTS (اتصال دکمه‌ها) ===
function setupEvents() {
    // تب‌ها
    document.getElementById('btn-tab-formulas').onclick = () => switchTab('formulas');
    document.getElementById('btn-tab-materials').onclick = () => switchTab('materials');
    document.getElementById('btn-tab-categories').onclick = () => switchTab('categories');
    document.getElementById('btn-open-store').onclick = () => switchTab('store');

    // عملیات فرمول (جدید، ویرایش، حذف، پرینت)
    document.getElementById('btn-open-new-formula').onclick = () => openModal('new-formula-modal');
    document.getElementById('btn-create-formula').onclick = createFormula;
    document.getElementById('btn-cancel-formula').onclick = () => closeModal('new-formula-modal');
    
    document.getElementById('btn-print').onclick = printFormula;
    document.getElementById('btn-close-print').onclick = () => closeModal('print-modal');
    
    // جستجو
    document.getElementById('search-formulas').oninput = (e) => renderFormulaList(e.target.value);
    document.getElementById('search-materials').oninput = (e) => renderMaterials(e.target.value);
    document.getElementById('sort-materials').onchange = () => renderMaterials();
    
    // فرم‌ها (جلوگیری از رفرش صفحه)
    document.getElementById('material-form').onsubmit = (e) => { e.preventDefault(); saveMaterial(); };
    document.getElementById('mat-cancel-btn').onclick = resetMatForm;
    document.getElementById('category-form').onsubmit = (e) => { e.preventDefault(); addCategory(); };
    
    // افزودن کالا به فرمول
    document.getElementById('form-add-comp').onsubmit = (e) => { 
        e.preventDefault(); 
        addComp(); 
    };

    // تغییرات محاسباتی (دستمزد و سربار)
    document.getElementById('inp-labor').onchange = (e) => updateCost('labor', e.target.value);
    document.getElementById('inp-overhead').onchange = (e) => updateCost('overhead', e.target.value);
    document.getElementById('inp-profit').onchange = (e) => updateCost('profit', e.target.value);
    
    // *** اتصال دکمه‌های مهم ویرایش و حذف ***
    const nameTitle = document.getElementById('active-formula-name');
    if(nameTitle) nameTitle.onclick = renameFormula; // کلیک روی اسم برای تغییر نام
    
    const delBtn = document.getElementById('btn-delete-formula');
    if(delBtn) delBtn.onclick = deleteFormula; // دکمه سطل آشغال

    document.getElementById('comp-filter').onchange = updateCompSelect;
}

// === LOGIC FUNCTIONS ===

// 1. ایجاد فرمول جدید
async function createFormula() {
    const name = document.getElementById('new-formula-name').value;
    if(!name) return;
    
    try {
        // نکته: فیلد components به صورت رشته متنی (String) ذخیره می‌شود
        const res = await api.create(APPWRITE_CONFIG.COLS.FORMS, {
            name, 
            components: '[]', // آرایه خالی به صورت متن
            labor: 0.0, 
            overhead: 0.0, 
            profit: 0.0, 
            is_public: false
        });
        
        state.formulas.unshift(res);
        closeModal('new-formula-modal');
        document.getElementById('new-formula-name').value = '';
        selectFormula(res.$id); // باز کردن فرمول جدید
    } catch(e) { 
        alert("خطا در ساخت فرمول: " + e.message); 
    }
}

// 2. انتخاب و نمایش جزئیات فرمول
function selectFormula(id) {
    state.activeFormulaId = id;
    renderFormulaList(); // برای هایلایت شدن آیتم لیست
    
    document.getElementById('formula-detail-empty').classList.add('hidden');
    document.getElementById('formula-detail-view').classList.remove('hidden');
    document.getElementById('formula-detail-view').classList.add('flex');
    
    const f = state.formulas.find(x => x.$id === id);
    if(f) renderFormulaDetail(f);
    
    // در موبایل اسکرول کن پایین
    if(window.innerWidth < 1024) {
        document.getElementById('detail-panel').scrollIntoView({behavior: 'smooth'});
    }
}

// 3. رندر کردن جزئیات (لیست کالاها و قیمت)
function renderFormulaDetail(f) {
    // الف) نمایش اطلاعات پایه
    document.getElementById('active-formula-name').innerText = f.name;
    document.getElementById('inp-labor').value = formatPrice(f.labor);
    document.getElementById('inp-overhead').value = formatPrice(f.overhead);
    document.getElementById('inp-profit').value = f.profit;

    // ب) پارس کردن لیست کالاها با امنیت بالا
    let comps = [];
    try {
        // تلاش برای خواندن از components یا components_json (برای سازگاری با قدیم)
        const raw = f.components || f.components_json || '[]';
        comps = JSON.parse(raw);
    } catch (err) {
        console.error("Error parsing components:", err);
        comps = [];
    }

    // ج) محاسبه قیمت کل
    const calc = calculateCost(f);
    document.getElementById('lbl-final-price').innerText = formatPrice(calc.final);
    
    // د) بروزرسانی دراپ‌داون انتخاب کالا
    updateCompSelect();
    
    // هـ) ساخت لیست HTML کالاها
    const listEl = document.getElementById('formula-comps-list');
    
    if (comps.length === 0) {
        listEl.innerHTML = '<div class="p-8 text-center text-slate-400 text-xs">هنوز کالایی اضافه نشده است</div>';
    } else {
        listEl.innerHTML = comps.map((c, idx) => {
            let name = '---', unit = '-', price = 0, total = 0;
            let isDeleted = false;

            if(c.type === 'mat') {
                const m = state.materials.find(x => x.$id === c.id);
                if(m) {
                    name = m.name;
                    unit = m.unit;
                    price = m.price;
                } else {
                    name = '(کالا حذف شده)';
                    isDeleted = true;
                }
            } else {
                const sub = state.formulas.find(x => x.$id === c.id);
                if(sub) {
                    name = `🔗 ${sub.name}`;
                    unit = 'عدد';
                    price = calculateCost(sub).final;
                } else {
                    name = '(فرمول حذف شده)';
                    isDeleted = true;
                }
            }
            
            total = price * c.qty;
            
            return `
            <div class="flex justify-between items-center p-3 text-sm border-b border-slate-50 hover:bg-slate-50 transition-colors ${isDeleted ? 'bg-rose-50' : ''}">
                <div class="flex-grow">
                    <div class="font-bold text-slate-700 text-xs ${isDeleted ? 'text-rose-500' : ''}">${name}</div>
                    <div class="text-[10px] text-slate-400 mt-1">
                        <span class="bg-white border px-1.5 rounded">${c.qty}</span> 
                        ${unit} × ${formatPrice(price)}
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <span class="font-mono font-bold text-slate-600 text-xs">${formatPrice(total)}</span>
                    <button class="text-rose-400 hover:text-rose-600 p-1 rounded btn-del-comp" data-idx="${idx}" title="حذف">
                        🗑
                    </button>
                </div>
            </div>`;
        }).join('');

        // اتصال دکمه‌های حذف هر سطر
        listEl.querySelectorAll('.btn-del-comp').forEach(btn => {
            btn.onclick = () => removeComp(f.$id, parseInt(btn.dataset.idx));
        });
    }
}

// 4. افزودن کالا به فرمول
async function addComp() {
    if(!state.activeFormulaId) return;
    
    const val = document.getElementById('comp-select').value;
    const qty = parseFloat(document.getElementById('comp-qty').value);
    
    if(!val || !qty) {
        alert("لطفاً کالا و تعداد را وارد کنید");
        return;
    }
    
    const [typePrefix, id] = val.split(':');
    const type = typePrefix === 'MAT' ? 'mat' : 'form';
    
    // جلوگیری از لوپ (اضافه کردن فرمول به خودش)
    if(type === 'form' && id === state.activeFormulaId) { 
        alert('خطا: نمی‌توانید یک محصول را درون خودش استفاده کنید!'); 
        return; 
    }
    
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    let comps = [];
    try { comps = JSON.parse(f.components || f.components_json || '[]'); } catch(e){}
    
    // اگر کالا قبلاً بود، تعدادش را زیاد کن
    const exist = comps.find(c => c.id === id && c.type === type);
    if(exist) {
        exist.qty += qty;
    } else {
        comps.push({id, type, qty});
    }
    
    try {
        // ذخیره در دیتابیس (حتماً به صورت String)
        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { 
            components: JSON.stringify(comps) 
        });
        
        // پاک کردن ورودی تعداد
        document.getElementById('comp-qty').value = '';
        
        // رفرش اطلاعات
        await fetchAllData(); 
        updateUI();
    } catch(e) { 
        alert("خطا در ذخیره: " + e.message); 
    }
}

// 5. حذف کالا از فرمول
async function removeComp(fid, idx) {
    const f = state.formulas.find(x => x.$id === fid);
    let comps = JSON.parse(f.components || f.components_json || '[]');
    
    // حذف از آرایه
    comps.splice(idx, 1);
    
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, fid, { 
            components: JSON.stringify(comps) 
        });
        await fetchAllData(); 
        updateUI();
    } catch(e) { alert(e.message); }
}

// 6. ویرایش نام فرمول
async function renameFormula() {
    const cur = document.getElementById('active-formula-name').innerText;
    const n = prompt('نام جدید محصول را وارد کنید:', cur);
    
    if(n && n !== cur) {
        try {
            await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { name: n });
            await fetchAllData(); 
            updateUI();
        } catch(e) { alert("خطا: " + e.message); }
    }
}

// 7. حذف کل فرمول
async function deleteFormula() {
    if(confirm('آیا مطمئن هستید؟ این محصول به طور کامل حذف خواهد شد.')) {
        try {
            await api.delete(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId);
            state.activeFormulaId = null; // انتخاب را بردار
            await fetchAllData(); 
            updateUI();
        } catch(e) { alert("خطا: " + e.message); }
    }
}

// --- توابع کمکی دیگر ---

function formatPrice(n) { return Number(n).toLocaleString('en-US'); }

function switchTab(id) {
    ['formulas', 'materials', 'categories', 'store'].forEach(t => {
        document.getElementById('tab-'+t).classList.add('hidden');
        const btn = document.getElementById('btn-tab-'+t);
        if(btn) btn.classList.remove('active');
    });
    document.getElementById('tab-'+id).classList.remove('hidden');
    const targetBtn = document.getElementById('btn-tab-'+id);
    if(targetBtn) targetBtn.classList.add('active');
}

function openModal(id) { 
    const el = document.getElementById(id); 
    el.classList.remove('hidden'); 
    el.style.display = 'flex'; 
}

function closeModal(id) { 
    const el = document.getElementById(id); 
    el.classList.add('hidden'); 
    el.style.display = 'none'; 
}

async function updateCost(key, val) {
    if(!state.activeFormulaId) return;
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { 
            [key]: parseFloat(val.replace(/,/g,'')) || 0 
        });
        await fetchAllData(); 
        updateUI();
    } catch(e) { alert(e.message); }
}

// --- محاسبات قیمت (Recursive) ---
function calculateCost(f) {
    if(!f) return {matCost:0, sub:0, profit:0, final:0};
    let matCost=0; 
    
    const comps = JSON.parse(f.components || f.components_json || '[]');
    
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

// --- رندر لیست فرمول‌ها (سایدبار) ---
function renderFormulaList(filter='') {
    const list = state.formulas.filter(f => f.name.includes(filter));
    const el = document.getElementById('formula-master-list');
    
    if(!list.length) { el.innerHTML = '<p class="text-center text-slate-400 text-xs mt-4">موردی یافت نشد</p>'; return; }
    
    el.innerHTML = list.map(f => `
        <div class="p-3 border-b border-slate-100 cursor-pointer hover:bg-teal-50 transition-colors ${f.$id===state.activeFormulaId ? 'bg-teal-50 border-r-4 border-teal-600' : ''}" data-id="${f.$id}">
            <div class="font-bold text-xs text-slate-700 pointer-events-none">${f.name}</div>
            <div class="text-[10px] text-slate-400 mt-0.5 pointer-events-none">${new Date(f.$updatedAt).toLocaleDateString('fa-IR')}</div>
        </div>
    `).join('');
    
    // اتصال رویداد کلیک به آیتم‌های لیست
    Array.from(el.children).forEach(child => {
        child.onclick = () => selectFormula(child.dataset.id);
    });
}

// --- سایر بخش‌ها (کالاها، دسته‌ها، پرینت) ---
async function saveMaterial() {
    const id = document.getElementById('mat-id').value;
    const data = {
        name: document.getElementById('mat-name').value,
        unit: document.getElementById('mat-unit').value,
        price: parseFloat(document.getElementById('mat-price').value.replace(/,/g,'')) || 0,
        category_id: document.getElementById('mat-category').value || null
    };
    try {
        if(id) await api.update(APPWRITE_CONFIG.COLS.MATS, id, data);
        else await api.create(APPWRITE_CONFIG.COLS.MATS, data);
        resetMatForm();
        await fetchAllData(); updateUI();
    } catch(e){ alert(e.message); }
}

function renderMaterials(filter='') {
    const sort = document.getElementById('sort-materials').value;
    let list = state.materials.filter(m => m.name.includes(filter));
    list.sort((a,b) => sort==='date_desc' ? new Date(b.$updatedAt)-new Date(a.$updatedAt) : a.name.localeCompare(b.name));
    
    const el = document.getElementById('materials-container');
    if(!list.length) { el.innerHTML='<p class="col-span-full text-center text-slate-400 text-xs mt-4">خالی</p>'; return; }
    
    el.innerHTML = list.map(m => {
        const cat = state.categories.find(c => c.$id === m.category_id)?.name || '-';
        return `
        <div class="bg-white p-3 rounded-xl border border-slate-100 group relative">
            <div class="flex justify-between mb-1">
                <span class="text-[10px] bg-slate-50 px-1 rounded text-slate-400">${cat}</span>
                <div class="flex gap-1"><button class="text-amber-500 px-1 btn-edit-mat" data-id="${m.$id}">✎</button><button class="text-rose-500 px-1 btn-del-mat" data-id="${m.$id}">×</button></div>
            </div>
            <div class="font-bold text-xs text-slate-800 truncate">${m.name}</div>
            <div class="flex justify-between items-end mt-1">
                <span class="text-[10px] text-slate-400">${m.unit}</span>
                <span class="font-mono font-bold text-teal-700">${formatPrice(m.price)}</span>
            </div>
        </div>`;
    }).join('');
    
    el.querySelectorAll('.btn-edit-mat').forEach(b => b.onclick = () => editMat(b.dataset.id));
    el.querySelectorAll('.btn-del-mat').forEach(b => b.onclick = () => delItem(APPWRITE_CONFIG.COLS.MATS, b.dataset.id));
}

function editMat(id) {
    const m = state.materials.find(x => x.$id === id);
    document.getElementById('mat-id').value = m.$id;
    document.getElementById('mat-name').value = m.name;
    document.getElementById('mat-unit').value = m.unit;
    document.getElementById('mat-price').value = formatPrice(m.price);
    document.getElementById('mat-category').value = m.category_id || '';
    
    const btn = document.getElementById('mat-submit-btn');
    btn.innerText = 'ویرایش';
    btn.className = 'btn btn-primary flex-grow text-xs bg-amber-500 hover:bg-amber-600'; 
    document.getElementById('mat-cancel-btn').classList.remove('hidden');
    if(window.innerWidth < 1024) document.getElementById('tab-materials').scrollIntoView({behavior:'smooth'});
}

function resetMatForm() {
    document.getElementById('material-form').reset();
    document.getElementById('mat-id').value = '';
    const btn = document.getElementById('mat-submit-btn');
    btn.innerText = 'ذخیره کالا';
    btn.className = 'btn btn-primary flex-grow text-xs';
    document.getElementById('mat-cancel-btn').classList.add('hidden');
}

async function delItem(col, id) {
    if(confirm('حذف؟')) {
        try { await api.delete(col, id); await fetchAllData(); updateUI(); }
        catch(e) { alert(e.message); }
    }
}

async function handleAddCategory(e){
    e.preventDefault(); const n=document.getElementById('cat-name').value; if(!n)return; 
    try {
        await api.create(APPWRITE_CONFIG.COLS.CATS, {name:n});
        document.getElementById('cat-name').value=''; loadAllData();
    } catch(e) { alert(e.message); }
}

function renderCategories(){
    const el = document.getElementById('category-list');
    el.innerHTML = state.categories.map(c=>`
        <div class="flex justify-between p-2 bg-slate-50 rounded border mb-1 text-xs">
            <span>${c.name}</span>
            <button class="text-rose-500 btn-del-cat" data-id="${c.$id}">🗑</button>
        </div>
    `).join('');
    el.querySelectorAll('.btn-del-cat').forEach(b => b.onclick = () => delItem(APPWRITE_CONFIG.COLS.CATS, b.dataset.id));
}

function renderStore() {
    const el = document.getElementById('store-container');
    if(!state.publicFormulas.length) { el.innerHTML = '<p class="col-span-full text-center text-slate-400 text-xs">خالی</p>'; return; }
    el.innerHTML = state.publicFormulas.map(f => `
        <div class="bg-white p-3 rounded border text-center">
            <div class="font-bold mb-2 text-sm">${f.name}</div>
            <button class="btn btn-secondary text-xs w-full btn-copy-store" data-id="${f.$id}">افزودن به لیست</button>
        </div>
    `).join('');
    el.querySelectorAll('.btn-copy-store').forEach(b => b.onclick = () => copyStore(b.dataset.id));
}

async function copyStore(id) {
    if(!confirm('کپی شود؟')) return;
    const t = state.publicFormulas.find(x => x.$id === id);
    try {
        await api.create(APPWRITE_CONFIG.COLS.FORMS, {
            name: t.name + ' (کپی)', components: t.components || t.components_json, labor: t.labor, overhead: t.overhead, profit: t.profit, is_public: false
        });
        alert('انجام شد'); await fetchAllData(); updateUI(); switchTab('formulas');
    } catch(e) { alert(e.message); }
}

function updateDropdowns() {
    const c = state.categories.map(x => `<option value="${x.$id}">${x.name}</option>`).join('');
    document.getElementById('mat-category').innerHTML = '<option value="">بدون دسته</option>' + c;
    document.getElementById('comp-filter').innerHTML = '<option value="">همه...</option>' + c + '<option value="FORM">فرمول‌ها</option>';
    updateCompSelect();
}

function updateCompSelect() {
    const sel = document.getElementById('comp-select');
    const f = document.getElementById('comp-filter').value;
    let h = '<option value="">انتخاب...</option>';
    
    if(f === 'FORM') {
        h += state.formulas.filter(x => x.$id !== state.activeFormulaId)
            .map(x => `<option value="FORM:${x.$id}">🔗 ${x.name}</option>`).join('');
    } else {
        state.categories.forEach(cat => {
            if(f && f !== cat.$id) return;
            const m = state.materials.filter(x => x.category_id === cat.$id);
            if(m.length) h += `<optgroup label="${cat.name}">` + m.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + `</optgroup>`;
        });
        const o = state.materials.filter(x => !x.category_id);
        if((!f || f === 'null') && o.length) h += `<optgroup label="سایر">` + o.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + `</optgroup>`;
    }
    sel.innerHTML = h;
}

function printFormula() {
    if(!state.activeFormulaId) return;
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    const calc = calculateCost(f);
    const comps = JSON.parse(f.components || f.components_json || '[]');
    
    document.getElementById('print-title').innerText = f.name;
    document.getElementById('print-id').innerText = f.$id.substring(0,6).toUpperCase();
    document.getElementById('print-date').innerText = new Date().toLocaleDateString('fa-IR');
    
    document.getElementById('print-rows').innerHTML = comps.map(c => {
        let n='-', u='-';
        if(c.type==='mat') { const m = state.materials.find(x=>x.$id===c.id); n=m?m.name:'-'; u=m?m.unit:'-'; }
        else { const s = state.formulas.find(x=>x.$id===c.id); n=s?s.name:'-'; u='عدد'; }
        return `<tr><td class="py-2 text-right">${n}</td><td class="text-center">${c.qty}</td><td class="text-center text-xs text-slate-400">${u}</td></tr>`;
    }).join('');
    
    const sub = calc.final; 
    const vat = Math.round(sub * 0.1);
    document.getElementById('print-profit').innerText = formatPrice(calc.profit);
    document.getElementById('print-subtotal').innerText = formatPrice(sub);
    document.getElementById('print-vat').innerText = formatPrice(vat);
    document.getElementById('print-final').innerText = formatPrice(sub+vat);
    
    openModal('print-modal');
}