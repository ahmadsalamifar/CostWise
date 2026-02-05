import { api } from '../../core/api.js';
import { APPWRITE_CONFIG, state } from '../../core/config.js';
import { closeModal, showToast } from '../../core/utils.js';
import { resetSaveButton } from './formulaUIHelpers.js';

export async function saveFormulaChanges(cb) {
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
        cb(); 
        showToast('فرمول ذخیره شد', 'success');
    } catch(e) {
        showToast('خطا در ثبت: ' + e.message, 'error');
        if(btn) { btn.innerText = 'ثبت تغییرات'; btn.disabled = false; }
    }
}

export async function createFormula(cb) {
    const name = document.getElementById('new-formula-name').value;
    if (!name) return;
    try {
        await api.create(APPWRITE_CONFIG.COLS.FORMS, {
            name, components: '[]', labor: 0, overhead: 0, profit: 0, is_public: false
        });
        closeModal('new-formula-modal');
        cb();
        showToast('محصول جدید ایجاد شد', 'success');
    } catch(e) { showToast(e.message, 'error'); }
}

export async function deleteFormula(cb) {
    if(confirm('آیا مطمئن هستید که این محصول حذف شود؟')) {
        try {
            await api.delete(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId);
            state.activeFormulaId = null;
            cb();
            showToast('محصول حذف شد', 'success');
        } catch(e) { showToast(e.message, 'error'); }
    }
}

export async function duplicateFormula(cb) {
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    if(!f) return;
    try {
        await api.create(APPWRITE_CONFIG.COLS.FORMS, {
            name: f.name + ' (کپی)',
            components: typeof f.components === 'string' ? f.components : JSON.stringify(f.components),
            labor: f.labor, overhead: f.overhead, profit: f.profit
        });
        cb();
        showToast('کپی فرمول ایجاد شد', 'success');
    } catch(e) { showToast(e.message, 'error'); }
}

export async function renameFormula(cb) {
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    const n = prompt('نام جدید:', f.name);
    if (n && n !== f.name) {
        try {
            await api.update(APPWRITE_CONFIG.COLS.FORMS, f.$id, { name: n });
            cb();
        } catch(e) { showToast(e.message, 'error'); }
    }
}