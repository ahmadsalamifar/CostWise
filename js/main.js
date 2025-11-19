import { account, state } from './config.js';
import { fetchAllData } from './api.js';
import { switchTab, formatInput } from './utils.js';
import * as Formulas from './formulas.js';
import * as Materials from './materials.js';
import * as Categories from './categories.js';
import * as Store from './store.js';
import * as Print from './print.js';

// --- مدیریت اصلی وضعیت برنامه ---

async function refreshApp() {
    try {
        await fetchAllData();
        updateUI();
    } catch (e) { console.error(e); }
}

function updateUI() {
    // رفرش کردن همه ماژول‌ها
    Formulas.renderFormulaList();
    Materials.renderMaterials();
    Categories.renderCategories(refreshApp);
    Store.renderStore(refreshApp);
    
    // اگر فرمولی باز بود، رفرش شود
    if (state.activeFormulaId) {
        const f = state.formulas.find(x => x.$id === state.activeFormulaId);
        if (f) {
            Formulas.renderFormulaDetail(f, refreshApp);
        } else {
            state.activeFormulaId = null;
            document.getElementById('formula-detail-view').classList.add('hidden');
            document.getElementById('formula-detail-empty').classList.remove('hidden');
        }
    }
    
    Formulas.updateDropdowns();
    Formulas.updateCompSelect();
    updateMatCatDropdown();
}

function updateMatCatDropdown() {
    const matCat = document.getElementById('mat-category');
    if(matCat) {
        const val = matCat.value;
        const c = state.categories.map(x => `<option value="${x.$id}">${x.name}</option>`).join('');
        matCat.innerHTML = '<option value="">بدون دسته</option>' + c;
        matCat.value = val;
    }
}

// --- شروع برنامه ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // ورود خودکار (Anonymous)
        try { await account.get(); } catch { await account.createAnonymousSession(); }
        
        await fetchAllData();
        
        // نمایش UI
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        
        // تب‌ها
        document.getElementById('btn-tab-formulas').onclick = () => switchTab('formulas');
        document.getElementById('btn-tab-materials').onclick = () => switchTab('materials');
        document.getElementById('btn-tab-categories').onclick = () => switchTab('categories');
        document.getElementById('btn-open-store').onclick = () => switchTab('store');
        
        // راه‌اندازی ماژول‌ها
        Formulas.setupFormulas(refreshApp);
        Materials.setupMaterials(refreshApp);
        Categories.setupCategories(refreshApp);
        Store.setupStore(refreshApp);
        Print.setupPrint();
        
        // فرمترهای ورودی پول
        document.querySelectorAll('.price-input').forEach(el => {
            el.addEventListener('input', () => formatInput(el));
        });

        updateUI();
        switchTab('formulas');
        
    } catch (err) {
        console.error(err);
        document.getElementById('loading-text').innerText = "خطا در اتصال: " + err.message;
        document.getElementById('loading-text').className = 'text-rose-500 text-sm font-bold';
    }
});