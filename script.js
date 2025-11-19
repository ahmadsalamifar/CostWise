// =========================================
// 1. CONFIG & STATE
// =========================================
const APPWRITE_CONFIG = {
    ENDPOINT: 'https://cloud.appwrite.io/v1',
    PROJECT_ID: '691c9337000c1532f26a', 
    DB_ID: '691c956400150133e319',
    COLS: { CATS: 'categories', MATS: 'materials', FORMS: 'formulas' }
};

let client, account, db;
let state = { categories: [], materials: [], formulas: [], activeFormulaId: null, publicFormulas: [] };

// =========================================
// 2. INITIALIZATION
// =========================================
if (typeof Appwrite === 'undefined') {
    document.getElementById('loading-text').innerText = "خطا: کتابخانه Appwrite بارگذاری نشد";
    document.getElementById('loading-text').classList.add('text-red-400');
} else {
    const { Client, Account, Databases } = Appwrite;
    client = new Client().setEndpoint(APPWRITE_CONFIG.ENDPOINT).setProject(APPWRITE_CONFIG.PROJECT_ID);
    account = new Account(client);
    db = new Databases(client);
    init();
}

async function init() {
    try {
        try { await account.get(); } catch { await account.createAnonymousSession(); }
        await loadAllData();
        
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('app-content').classList.remove('hidden');
        
        // پیش‌فرض: تب فرمول‌ها
        switchTab('formulas'); 
    } catch (err) {
        document.getElementById('loading-text').innerText = "خطا در اتصال! لطفاً اینترنت را بررسی کنید.";
        console.error(err);
    }
}

async function loadAllData() {
    const { Query } = Appwrite;
    const [cRes, mRes, fRes] = await Promise.all([
        db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.CATS, [Query.limit(100)]),
        db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.MATS, [Query.limit(5000)]),
        db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, [Query.limit(500)])
    ]);
    
    state.categories = cRes.documents;
    state.materials = mRes.documents;
    state.formulas = fRes.documents.sort((a, b) => new Date(b.$updatedAt) - new Date(a.$updatedAt));
    
    try {
        const sRes = await db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, [Query.equal('is_public', true), Query.limit(50)]);
        state.publicFormulas = sRes.documents;
    } catch {}
    
    updateUI();
}

function updateUI() {
    renderCategories(); renderMaterials(); renderFormulaList(); renderStore(); updateDropdowns();

    if (state.activeFormulaId && state.formulas.find(f => f.$id === state.activeFormulaId)) {
        renderFormulaDetail(state.activeFormulaId);
    } else {
        state.activeFormulaId = null;
        document.getElementById('formula-detail-view').classList.add('hidden');
        document.getElementById('formula-detail-view').classList.remove('flex');
        document.getElementById('formula-detail-empty').classList.remove('hidden');
    }
}

// =========================================
// 3. UTILS
// =========================================
function switchTab(tabId) {
    ['formulas', 'materials', 'categories', 'store'].forEach(id => {
        document.getElementById('tab-' + id).classList.add('hidden');
        document.getElementById('btn-' + id).classList.remove('active');
    });
    document.getElementById('tab-' + tabId).classList.remove('hidden');
    document.getElementById('btn-' + tabId).classList.add('active');
}

function openModal(id) { 
    const el = document.getElementById(id); el.classList.remove('hidden'); el.classList.add('flex'); 
}
function closeModal(id) { 
    const el = document.getElementById(id); el.classList.remove('flex'); el.classList.add('hidden'); 
}
function formatPrice(n) { return Number(n).toLocaleString('en-US'); }
function formatInput(el) { 
    const r = el.value.replace(/[^0-9.]/g, ''); 
    el.value = r ? parseFloat(r).toLocaleString('en-US') : ''; 
}
function formatDate(d) { return d ? new Date(d).toLocaleDateString('fa-IR') : ''; }

// =========================================
// 4. MATERIALS LOGIC
// =========================================
async function handleSaveMaterial(e) {
    e.preventDefault();
    const { ID } = Appwrite;
    const id = document.getElementById('mat-id').value;
    const data = {
        name: document.getElementById('mat-name').value,
        unit: document.getElementById('mat-unit').value,
        price: parseFloat(document.getElementById('mat-price').value.replace(/,/g,''))||0,
        category_id: document.getElementById('mat-category').value || null
    };
    try {
        if(id) await db.updateDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.MATS, id, data);
        else await db.createDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.MATS, ID.unique(), data);
        resetMaterialForm(); loadAllData();
    } catch(e){ alert(e.message); }
}

function renderMaterials(filter='') {
    const sort = document.getElementById('sort-materials').value;
    let list = state.materials.filter(m => m.name.includes(filter));
    list.sort((a,b) => {
        if(sort==='price_desc') return b.price - a.price;
        if(sort==='date_desc') return new Date(b.$updatedAt) - new Date(a.$updatedAt);
        return a.name.localeCompare(b.name);
    });
    
    const container = document.getElementById('materials-container');
    if(list.length === 0) { container.innerHTML = '<p class="col-span-full text-center text-slate-400 py-4">موردی یافت نشد</p>'; return; }

    container.innerHTML = list.map(m => {
        const cat = state.categories.find(c => c.$id === m.category_id)?.name || '-';
        return `
        <div class="bg-white p-3 rounded-xl border border-slate-100 hover:border-teal-400 group relative transition-all">
            <div class="flex justify-between mb-1">
                <span class="text-[10px] bg-slate-50 px-1.5 py-0.5 rounded text-slate-400 border border-slate-100">${cat}</span>
                <div class="flex gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="editMaterial('${m.$id}')" class="text-amber-500 p-1">✎</button>
                    <button onclick="deleteDoc('${APPWRITE_CONFIG.COLS.MATS}','${m.$id}')" class="text-rose-500 p-1">×</button>
                </div>
            </div>
            <div class="font-bold text-sm text-slate-800 truncate mb-1">${m.name}</div>
            <div class="flex justify-between items-end">
                <span class="text-[10px] text-slate-400">${m.unit}</span>
                <span class="font-mono font-bold text-teal-700 text-base">${formatPrice(m.price)}</span>
            </div>
        </div>`;
    }).join('');
}

function editMaterial(id){
    const m = state.materials.find(x=>x.$id===id);
    document.getElementById('mat-id').value=m.$id; 
    document.getElementById('mat-name').value=m.name;
    document.getElementById('mat-unit').value=m.unit; 
    document.getElementById('mat-price').value=formatPrice(m.price);
    document.getElementById('mat-category').value=m.category_id||'';
    
    const btn=document.getElementById('mat-submit-btn'); 
    btn.innerText='ویرایش کالا'; 
    btn.className='btn bg-amber-500 text-white flex-grow text-xs';
    document.getElementById('mat-cancel-btn').classList.remove('hidden');
    
    if(window.innerWidth < 768) document.getElementById('tab-materials').scrollIntoView({behavior:'smooth'});
}

function resetMaterialForm(){
    document.getElementById('material-form').reset(); 
    document.getElementById('mat-id').value='';
    const btn=document.getElementById('mat-submit-btn'); 
    btn.innerText='ذخیره کالا'; 
    btn.className='btn btn-primary flex-grow text-xs';
    document.getElementById('mat-cancel-btn').classList.add('hidden');
}

// =========================================
// 5. FORMULAS LOGIC
// =========================================
async function handleCreateFormula() {
    const name = document.getElementById('new-formula-name').value; if(!name)return;
    const { ID } = Appwrite;
    const res = await db.createDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, ID.unique(), {
        name, components_json:'[]', labor:0.0, overhead:0.0, profit:0.0, is_public:false
    });
    state.formulas.unshift(res); 
    closeModal('new-formula-modal'); 
    document.getElementById('new-formula-name').value='';
    selectFormula(res.$id);
}

function renderFormulaList(filter='') {
    const el = document.getElementById('formula-master-list');
    const list = state.formulas.filter(f => f.name.includes(filter));
    if(list.length===0) { el.innerHTML='<p class="text-center text-xs text-slate-400 py-4">یافت نشد</p>'; return; }

    el.innerHTML = list.map(f => `
        <div onclick="selectFormula('${f.$id}')" class="p-3 border-b border-slate-50 cursor-pointer hover:bg-teal-50 transition-colors ${f.$id===state.activeFormulaId?'bg-teal-50 border-r-4 border-teal-600':''}">
            <div class="font-bold text-sm text-slate-700 truncate">${f.name}</div>
            <div class="flex justify-between mt-1">
                <span class="text-[10px] text-slate-400">${formatDate(f.$updatedAt)}</span>
            </div>
        </div>`).join('');
}

function selectFormula(id) {
    state.activeFormulaId = id; 
    renderFormulaList();
    
    document.getElementById('formula-detail-empty').classList.add('hidden');
    document.getElementById('formula-detail-view').classList.remove('hidden');
    document.getElementById('formula-detail-view').classList.add('flex');
    
    if(window.innerWidth < 1024) {
        setTimeout(() => {
            document.getElementById('detail-panel').scrollIntoView({behavior: 'smooth', block: 'start'});
        }, 100);
    }
    renderFormulaDetail(id);
}

function calculateCost(f) {
    if(!f) return {matCost:0, sub:0, profit:0, final:0};
    let matCost=0; 
    const comps=JSON.parse(f.components_json||'[]');
    comps.forEach(c => {
        if(c.type==='mat'){ 
            const m=state.materials.find(x=>x.$id===c.id); 
            if(m) matCost+=m.price*c.qty; 
        } else if(c.type==='form'){ 
            const sub=state.formulas.find(x=>x.$id===c.id); 
            if(sub) matCost+=calculateCost(sub).final*c.qty;
        }
    });
    const sub = matCost + (f.labor||0) + (f.overhead||0);
    const profit = (f.profit||0)/100 * sub;
    return {matCost, sub, profit, final:sub+profit};
}

function renderFormulaDetail(id) {
    const f = state.formulas.find(x=>x.$id===id); if(!f)return;
    const calc = calculateCost(f); 
    const comps = JSON.parse(f.components_json||'[]');

    document.getElementById('active-formula-name').innerText = f.name;
    document.getElementById('active-formula-date').innerText = 'ویرایش: ' + formatDate(f.$updatedAt);
    document.getElementById('inp-labor').value = formatPrice(f.labor);
    document.getElementById('inp-overhead').value = formatPrice(f.overhead);
    document.getElementById('inp-profit').value = f.profit;
    document.getElementById('lbl-final-price').innerText = formatPrice(calc.final);
    
    updateComponentSelect();
    
    const listEl = document.getElementById('formula-comps-list');
    if(comps.length===0) { listEl.innerHTML='<p class="text-center text-xs text-slate-400 py-8">هنوز موادی اضافه نشده است</p>'; return; }

    listEl.innerHTML = comps.map((c,idx) => {
        let name='?', unit='-', price=0, total=0, isErr=false;
        if(c.type==='mat'){ 
            const m=state.materials.find(x=>x.$id===c.id); 
            name=m?m.name:'حذف شده'; unit=m?m.unit:'-'; price=m?m.price:0; isErr=!m;
        } else { 
            const sub=state.formulas.find(x=>x.$id===c.id); 
            name=sub?'🔗 '+sub.name:'محصول حذف شده'; unit='عدد'; price=sub?calculateCost(sub).final:0; isErr=!sub;
        }
        total=price*c.qty;
        return `
        <div class="flex justify-between items-center p-3 text-sm border-b border-slate-50 hover:bg-slate-50 transition-colors ${isErr?'bg-rose-50':''}">
            <div class="flex-grow">
                <div class="font-bold text-slate-700 text-xs ${isErr?'text-rose-500':''}">${name}</div>
                <div class="text-[10px] text-slate-400 mt-1">
                    <span class="bg-white border px-1 rounded">${c.qty}</span> ${unit} × ${formatPrice(price)}
                </div>
            </div>
            <div class="flex items-center gap-3">
                <span class="font-mono font-bold text-slate-600 text-xs">${formatPrice(total)}</span>
                <button onclick="removeComp('${id}',${idx})" class="text-slate-300 hover:text-rose-500 p-1 rounded-full transition-colors">✖</button>
            </div>
        </div>`;
    }).join('');
}

async function addComp(e){
    e.preventDefault(); if(!state.activeFormulaId)return;
    const val=document.getElementById('comp-select').value; 
    const qty=parseFloat(document.getElementById('comp-qty').value);
    if(!val||!qty)return;
    const [p,id]=val.split(':'); 
    if(p==='FORM' && id===state.activeFormulaId){ alert('نمی‌توانید محصول را در خودش استفاده کنید!'); return; }
    
    const f=state.formulas.find(x=>x.$id===state.activeFormulaId); 
    let comps=JSON.parse(f.components_json||'[]');
    const ex=comps.find(c=>c.id===id && c.type===(p==='MAT'?'mat':'form'));
    if(ex) ex.qty+=qty; else comps.push({id, type:p==='MAT'?'mat':'form', qty});
    
    await db.updateDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, {components_json:JSON.stringify(comps)});
    document.getElementById('comp-qty').value=''; loadAllData();
}

async function removeComp(fid,idx){
    const f=state.formulas.find(x=>x.$id===fid); 
    let comps=JSON.parse(f.components_json||'[]');
    comps.splice(idx,1);
    await db.updateDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, fid, {components_json:JSON.stringify(comps)});
    loadAllData();
}

async function updateCost(k,v){
    await db.updateDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, {[k]:parseFloat(v.replace(/,/g,''))||0});
    loadAllData();
}

async function editFormulaName(){
    const cur = document.getElementById('active-formula-name').innerText;
    const n=prompt('نام جدید محصول:', cur);
    if(n && n!==cur) { 
        await db.updateDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, {name:n}); 
        loadAllData(); 
    }
}

async function deleteFormula(){
    if(confirm('آیا مطمئن هستید؟')){ 
        await db.deleteDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId); 
        state.activeFormulaId=null; 
        loadAllData(); 
    }
}

// =========================================
// 6. CATEGORIES & STORE & DROPDOWN
// =========================================
async function handleAddCategory(e){
    e.preventDefault(); 
    const n=document.getElementById('cat-name').value; if(!n)return; 
    const {ID}=Appwrite;
    await db.createDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.CATS, ID.unique(), {name:n});
    document.getElementById('cat-name').value=''; loadAllData();
}

function renderCategories(){
    document.getElementById('category-list').innerHTML = state.categories.map(c=>`
        <div class="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 mb-2 text-sm">
            <span class="font-bold text-slate-700">${c.name}</span>
            <button onclick="deleteDoc('${APPWRITE_CONFIG.COLS.CATS}','${c.$id}')" class="text-slate-400 hover:text-rose-500 transition-colors">🗑</button>
        </div>
    `).join('');
}

function renderStore(){
    const el = document.getElementById('store-container');
    if(!state.publicFormulas.length) { el.innerHTML = '<p class="col-span-full text-center text-slate-400">خالی است</p>'; return; }
    el.innerHTML = state.publicFormulas.map(f=>`
        <div class="bg-white p-4 rounded-2xl border border-slate-100 hover:shadow-md transition-all text-center">
            <div class="font-bold text-slate-800 mb-3 text-lg">${f.name}</div>
            <button onclick="copyTemplate('${f.$id}')" class="btn bg-indigo-50 text-indigo-600 text-xs w-full font-bold">افزودن به لیست من</button>
        </div>
    `).join('');
}

async function copyTemplate(id){
    if(!confirm('اضافه شود؟'))return; 
    const t=state.publicFormulas.find(x=>x.$id===id); 
    const {ID}=Appwrite;
    await db.createDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, ID.unique(), {
        name:t.name+' (کپی)', components_json:t.components_json, labor:t.labor, overhead:t.overhead, profit:t.profit, is_public:false
    });
    alert('اضافه شد!'); loadAllData(); switchTab('formulas');
}

async function deleteDoc(col,id){ 
    if(confirm('حذف شود؟')){ await db.deleteDocument(APPWRITE_CONFIG.DB_ID, col, id); loadAllData(); } 
}

function updateDropdowns() {
    const c=state.categories.map(x=>`<option value="${x.$id}">${x.name}</option>`).join('');
    document.getElementById('mat-category').innerHTML='<option value="">بدون دسته</option>'+c;
    document.getElementById('comp-filter').innerHTML='<option value="">همه...</option>'+c+'<option value="FORM">محصولات دیگر</option>';
    updateComponentSelect();
}

function updateComponentSelect() {
    const sel = document.getElementById('comp-select');
    if(!sel)return;
    const f=document.getElementById('comp-filter').value; 
    let h='<option value="">انتخاب کنید...</option>';
    
    if(f==='FORM') {
        h+=state.formulas.filter(x=>x.$id!==state.activeFormulaId).map(x=>`<option value="FORM:${x.$id}">🔗 ${x.name}</option>`).join('');
    } else {
        state.categories.forEach(cat=>{
            if(f&&f!==cat.$id)return;
            const m=state.materials.filter(x=>x.category_id===cat.$id);
            if(m.length) h+=`<optgroup label="${cat.name}">`+m.map(x=>`<option value="MAT:${x.$id}">${x.name}</option>`).join('')+`</optgroup>`;
        });
        const o=state.materials.filter(x=>!x.category_id);
        if((!f||f==='null')&&o.length) h+=`<optgroup label="سایر">`+o.map(x=>`<option value="MAT:${x.$id}">${x.name}</option>`).join('')+`</optgroup>`;
    }
    sel.innerHTML=h;
}

// =========================================
// 7. PRINT
// =========================================
function printFormula(){
    if(!state.activeFormulaId)return; 
    const f=state.formulas.find(x=>x.$id===state.activeFormulaId);
    const calc=calculateCost(f); 
    const comps=JSON.parse(f.components_json||'[]');
    
    document.getElementById('print-title').innerText=f.name; 
    document.getElementById('print-id').innerText=f.$id.substring(0,6).toUpperCase();
    document.getElementById('print-date').innerText=formatDate(new Date());
    
    document.getElementById('print-rows').innerHTML=comps.map(c=>{
        let n='-'; 
        if(c.type==='mat'){const m=state.materials.find(x=>x.$id===c.id);n=m?m.name:'-';}
        else{const s=state.formulas.find(x=>x.$id===c.id);n=s?s.name:'-';}
        return `<tr>
            <td class="py-2 text-right pr-2">${n}</td>
            <td class="text-center bg-slate-50 font-mono">${c.qty}</td>
            <td class="text-center text-xs text-slate-400">-</td>
        </tr>`;
    }).join('');
    
    const subTotal = calc.final; 
    const vat = Math.round(subTotal * 0.10); 
    const final = subTotal + vat;

    document.getElementById('print-base').innerText=formatPrice(calc.sub);
    document.getElementById('print-profit').innerText=formatPrice(calc.profit);
    document.getElementById('print-subtotal').innerText=formatPrice(subTotal);
    document.getElementById('print-vat').innerText=formatPrice(vat);
    document.getElementById('print-final').innerText=formatPrice(final);
    
    openModal('print-modal');
}