import { api } from '../../core/api.js';
import { state, APPWRITE_CONFIG, Query } from '../../core/config.js';
import { showToast } from '../../core/utils.js';
import * as UI from './storeUI.js';

export function init() {}

export async function renderStore(refreshCb) {
    if (state.publicFormulas.length === 0) {
        try {
            const res = await api.list(APPWRITE_CONFIG.COLS.FORMS, [Query.equal('is_public', true), Query.limit(50)]);
            state.publicFormulas = res.documents;
        } catch(e) { console.warn(e); }
    }

    UI.renderGrid(state.publicFormulas, (id) => copyToMyList(id, refreshCb));
}

async function copyToMyList(id, cb) {
    const t = state.publicFormulas.find(x => x.$id === id);
    if (!t || !confirm(`"${t.name}" اضافه شود؟`)) return;

    try {
        await api.create(APPWRITE_CONFIG.COLS.FORMS, {
            name: t.name, 
            components: t.components,
            labor: t.labor, overhead: t.overhead, profit: t.profit, is_public: false
        });
        showToast('فرمول به لیست شما اضافه شد', 'success');
        cb();
    } catch(e) { showToast(e.message, 'error'); }
}