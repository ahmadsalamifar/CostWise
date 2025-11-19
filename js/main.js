import { account, state } from './config.js';
import { fetchAllData } from './api.js';
import { switchTab, formatInput } from './utils.js';
import * as Formulas from './formulas.js';
import * as Materials from './materials.js';
import * as Categories from './categories.js';
import * as Store from './store.js';
import * as Print from './print.js';

async function refreshApp() {
    console.log("🔄 Refreshing...");
    await fetchAllData();
    updateUI();
}

function updateUI() {
    Formulas.renderFormulaList();
    Materials.renderMaterials();
    Categories.renderCategories(refreshApp);
    Store.renderStore(refreshApp);
    
    // اطمینان از رندر شدن فرمول فعال
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
    
    // اطمینان از پر بودن دراپ‌داون
    Formulas.updateDropdowns();
    Formulas.updateCompSelect();

    // دراپ‌داون مواد اولیه
    const matCat = document.getElementById('mat-category');
    if(matCat && state.categories.length > 0) {
        const val = matCat.value;
        const c = state.categories.map(x => `<option value="${x.$id}">${x.name}</option>`).join('');
        matCat.innerHTML = '<option value="">بدون دسته</option>' + c;
        matCat.value = val;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        try { await account.get(); } catch { await account.createAnonymousSession(); }
        await fetchAllData();
        
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        
        // Tabs
        document.getElementById('btn-tab-formulas').onclick = () => switchTab('formulas');
        document.getElementById('btn-tab-materials').onclick = () => switchTab('materials');
        document.getElementById('btn-tab-categories').onclick = () => switchTab('categories');
        document.getElementById('btn-open-store').onclick = () => switchTab('store');
        
        // Modules
        Formulas.setupFormulas(refreshApp);
        Materials.setupMaterials(refreshApp);
        Categories.setupCategories(refreshApp);
        Store.setupStore(refreshApp);
        Print.setupPrint();
        
        document.querySelectorAll('.price-input').forEach(el => {
            el.addEventListener('input', () => formatInput(el));
        });

        // First Render
        updateUI();
        switchTab('formulas');
        
    } catch (err) {
        console.error(err);
        document.getElementById('loading-text').innerText = err.message;
        document.getElementById('loading-text').style.color = 'red';
    }
});