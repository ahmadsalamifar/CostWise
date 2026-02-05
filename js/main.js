// نقطه ورود برنامه
import { account, state, APPWRITE_CONFIG, Query } from './core/config.js';
import { api } from './core/api.js';
import { switchTab, toggleElement, showToast } from './core/utils.js';
import { setupPrint } from './print.js'; 
import { injectAppLayout } from './layout/layout.js';

import * as MaterialController from './features/materials/materialController.js';
import * as FormulaController from './features/formulas/formulaController.js';
import * as SettingsController from './features/settings/settingsController.js';
import * as StoreController from './features/store/storeController.js';
import * as ReportController from './features/reports/reportController.js';

async function initApp() {
    try {
        injectAppLayout();

        try { await account.get(); } 
        catch { await account.createAnonymousSession(); }

        await refreshData();
        
        FormulaController.init(refreshApp);
        MaterialController.init(refreshApp);
        SettingsController.init(refreshApp);
        if(StoreController.init) StoreController.init(refreshApp);
        ReportController.init();
        
        setupPrint(); 

        toggleElement('loading-screen', false);
        toggleElement('app-content', true);
        
        setupTabs();
        switchTab('formulas');
        
        updateAllUI();

    } catch (err) {
        console.error(err);
        const loadingText = document.getElementById('loading-text');
        if(loadingText) loadingText.innerText = "خطا: " + err.message;
        else showToast(err.message, 'error');
    }
}

async function refreshData() {
    const [c, u, m, f] = await Promise.all([
        api.list(APPWRITE_CONFIG.COLS.CATS, [Query.limit(100)]),
        api.list(APPWRITE_CONFIG.COLS.UNITS, [Query.limit(100)]),
        api.list(APPWRITE_CONFIG.COLS.MATS, [Query.limit(5000)]),
        api.list(APPWRITE_CONFIG.COLS.FORMS, [Query.limit(500)])
    ]);

    state.categories = c.documents;
    state.units = u.documents;
    state.materials = m.documents;
    state.formulas = f.documents;
    
    if(!document.getElementById('loading-screen').classList.contains('hidden')) return;
    updateAllUI();
}

function updateAllUI() {
    MaterialController.renderMaterials();
    FormulaController.renderFormulaList();
    SettingsController.renderSettings(refreshApp);
    StoreController.renderStore(refreshApp);
    ReportController.renderReports();
}

function setupTabs() {
    ['formulas', 'materials', 'reports', 'categories'].forEach(t => {
        const btn = document.getElementById('btn-tab-' + t);
        if(btn) btn.onclick = () => {
            switchTab(t);
            if (t === 'reports') ReportController.renderReports();
        };
    });
    const btnStore = document.getElementById('btn-open-store');
    if(btnStore) btnStore.onclick = () => switchTab('store');
}

async function refreshApp() {
    await refreshData();
}

document.addEventListener('DOMContentLoaded', initApp);