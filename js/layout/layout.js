import { t } from '../core/i18n.js';

export function getOtherTabsHTML() {
    return `
    <div id="tab-categories" class="tab-content hidden h-full overflow-y-auto p-2 md:p-4 pb-20">
        <!-- پنل زبان (جدید) -->
        <div class="max-w-4xl mx-auto mb-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 class="font-bold text-slate-700 text-center mb-4 border-b pb-2 text-sm">🌍 ${t('language_settings')}</h3>
            <div class="flex justify-center gap-4">
                <button id="btn-set-lang-fa" class="btn btn-secondary border border-slate-300 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 min-w-[100px] text-xs sm:text-sm py-2">
                    🇮🇷 فارسی
                </button>
                <button id="btn-set-lang-en" class="btn btn-secondary border border-slate-300 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 min-w-[100px] text-xs sm:text-sm py-2">
                    🇺🇸 English
                </button>
            </div>
            <p class="text-center text-[10px] text-slate-400 mt-2">Page will reload.</p>
        </div>

        <div class="max-w-4xl mx-auto mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- پنل دسته‌بندی -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 class="font-bold text-slate-700 text-center mb-4 border-b pb-2 text-sm">${t('category_grouping')}</h3>
                <form id="category-form" class="flex gap-2 mb-4"><input type="text" id="cat-name" class="input-field text-xs" placeholder="${t('group_name_ph')}" required><button class="btn btn-primary px-3 text-lg" type="submit">+</button></form>
                <div id="category-list" class="space-y-1 max-h-80 overflow-y-auto pr-1 custom-scrollbar"></div>
            </div>
            <!-- پنل واحدها -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 class="font-bold text-slate-700 text-center mb-4 border-b pb-2 text-sm">${t('unit_measures')}</h3>
                <form id="unit-form" class="flex gap-2 mb-4"><input type="text" id="unit-name" class="input-field text-xs" placeholder="${t('unit_name_ph')}" required><button class="btn btn-primary px-3 text-lg" type="submit">+</button></form>
                <div id="unit-list" class="space-y-1 max-h-80 overflow-y-auto pr-1 custom-scrollbar"></div>
            </div>
        </div>
    </div>
    
    <div id="tab-store" class="tab-content hidden h-full overflow-y-auto p-4"><div id="store-container" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"></div></div>
    `;
}