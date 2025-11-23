// js/modules/materials/materials.controller.js
// مسئولیت: هماهنگی بین کاربر، سرویس و ویو

import { MaterialsService } from './materials.service.js';
import { MaterialsView } from './materials.view.js';
import { state } from '../../core/config.js';
import { parseLocaleNumber } from '../../core/utils.js';
import * as Units from '../../materials_units.js'; // هنوز از فایل قدیمی استفاده میکنیم تا وقتی اونم ماژولار کنیم

export const MaterialsController = {
    init(refreshAppCallback) {
        this.refreshApp = refreshAppCallback;
        this.setupEventListeners();
    },

    setupEventListeners() {
        // فرم ذخیره
        document.getElementById('material-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSave();
        });

        // جستجو
        document.getElementById('search-materials')?.addEventListener('input', (e) => {
            this.render(e.target.value);
        });

        // دکمه‌های لیست (چون لیست داینامیک است از Delegation استفاده میکنیم)
        const container = document.getElementById('materials-container');
        if (container) {
            container.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                if (e.target.classList.contains('btn-edit-mat')) this.handleEdit(id);
                if (e.target.classList.contains('btn-del-mat')) this.handleDelete(id);
            });
        }
        
        // دکمه جدید
        document.getElementById('btn-new-mat-plus')?.addEventListener('click', () => {
            MaterialsView.resetForm();
        });
    },

    render(filterText = '') {
        let list = state.materials.filter(m => m.name.includes(filterText));
        const sortType = document.getElementById('sort-materials')?.value || 'update_desc';
        
        list = MaterialsService.sortList(list, sortType);
        MaterialsView.renderList(list);
    },

    async handleSave() {
        const formData = this._getFormData();
        try {
            await MaterialsService.save(formData.data, formData.id);
            MaterialsView.resetForm();
            this.refreshApp(); // رفرش کردن کل برنامه
        } catch (e) {
            alert('خطا: ' + e.message);
        }
    },

    handleEdit(id) {
        const m = state.materials.find(x => x.$id === id);
        if (m) MaterialsView.fillForm(m);
    },

    async handleDelete(id) {
        if (!confirm('حذف شود؟')) return;
        try {
            await MaterialsService.delete(id);
            this.render(); // رفرش لیست محلی (سریعتر)
            // this.refreshApp(); // اگر نیاز به آپدیت سایر بخش‌ها بود
        } catch (e) {
            alert(e.message);
        }
    },

    _getFormData() {
        // منطق خواندن از فرم (خلاصه شده)
        return {
            id: document.getElementById('mat-id').value,
            data: {
                name: document.getElementById('mat-name').value,
                price: parseLocaleNumber(document.getElementById('mat-price').value),
                // ... سایر فیلدها
            }
        };
    }
};