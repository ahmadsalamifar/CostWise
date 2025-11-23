// js/modules/materials/materials.service.js
// مسئولیت: فقط ذخیره، حذف و دریافت داده‌های مربوط به کالا

import { api } from '../../core/api.js';
import { APPWRITE_CONFIG } from '../../core/config.js';

export const MaterialsService = {
    async save(data, id = null) {
        if (id) {
            return await api.update(APPWRITE_CONFIG.COLS.MATS, id, data);
        } else {
            return await api.create(APPWRITE_CONFIG.COLS.MATS, data);
        }
    },

    async delete(id) {
        return await api.delete(APPWRITE_CONFIG.COLS.MATS, id);
    },

    // محاسبات بیزینسی مربوط به کالا (مثلا سورت کردن) اینجا انجام میشه
    sortList(list, sortType) {
        return list.sort((a, b) => {
            if(sortType === 'price_desc') return b.price - a.price;
            if(sortType === 'stock_asc') return (a.stock || 0) - (b.stock || 0);
            // ... سایر سورت‌ها
            return new Date(b.$updatedAt) - new Date(a.$updatedAt);
        });
    }
};