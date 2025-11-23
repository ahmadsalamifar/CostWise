// کنترل‌کننده اصلی بخش مواد اولیه
import { api } from '../../core/api.js';
import { state, APPWRITE_CONFIG } from '../../core/config.js';
import * as ListUI from './materialList.js';
import * as FormUI from './materialForm.js';
// ایمپورت ماژول اسکرپر (بخش جدید)
import * as Scraper from './materials_scraper.js';

export function init(refreshAppCallback) {
    // 1. راه‌اندازی لیست و جستجو
    ListUI.setupSearchListeners(renderMaterials);
    
    // 2. راه‌اندازی فرم و دکمه‌ها
    FormUI.setupFormListeners(async (formData) => {
        await saveMaterial(formData);
        refreshAppCallback();
    });

    // 3. راه‌اندازی اسکرپر (دکمه بروزرسانی و تست) - بخش جدید
    Scraper.setupScraperListeners(refreshAppCallback);

    // 4. دکمه کالای جدید
    const btnNew = document.getElementById('btn-new-mat-plus');
    if (btnNew) btnNew.onclick = FormUI.resetForm;
}

export function renderMaterials() {
    ListUI.renderGrid(state.materials, state.categories, handleDelete, handleEdit);
}

async function saveMaterial(data) {
    const id = document.getElementById('mat-id').value;
    try {
        if (id) {
            await api.update(APPWRITE_CONFIG.COLS.MATS, id, data);
        } else {
            await api.create(APPWRITE_CONFIG.COLS.MATS, data);
        }
        FormUI.resetForm();
    } catch(e) {
        alert('خطا در ذخیره: ' + e.message);
    }
}

async function handleDelete(id) {
    if(confirm('حذف شود؟')) {
        try {
            await api.delete(APPWRITE_CONFIG.COLS.MATS, id);
            state.materials = state.materials.filter(m => m.$id !== id);
            renderMaterials();
        } catch(e) { alert(e.message); }
    }
}

function handleEdit(id) {
    const material = state.materials.find(m => m.$id === id);
    if (material) FormUI.populateForm(material);
}