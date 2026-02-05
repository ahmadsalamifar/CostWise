import { formatPrice } from '../../core/utils.js';
import { t } from '../../core/i18n.js';

export function getImpactToolHTML(materials) {
    const matOptions = '<option value="">...</option>' + 
        materials.sort((a,b) => a.name.localeCompare(b.name)).map(m => 
            `<option value="${m.$id}">${m.name}</option>`
        ).join('');

    return `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div class="p-4 bg-slate-50 border-b flex justify-between items-center">
            <h3 class="font-bold text-slate-700 flex items-center gap-2">
                <span class="bg-indigo-100 text-indigo-600 p-1 rounded">📅</span>
                ${t('price_history_chart')}
            </h3>
        </div>

        <div class="p-6">
            <p class="text-xs text-slate-500 mb-4">${t('history_desc')}</p>
            
            <div class="flex flex-col md:flex-row gap-3 mb-6 items-end">
                <div class="w-full md:w-1/3">
                    <select id="history-mat-select" class="input-field text-xs h-10 bg-slate-50 w-full">${matOptions}</select>
                </div>
                <div class="w-full md:w-auto">
                    <button id="btn-load-history" class="btn btn-primary h-10 text-xs px-6 w-full md:w-auto shadow-md shadow-indigo-500/20">
                        ${t('load_chart')}
                    </button>
                </div>
            </div>

            <!-- کانتینر نمودار -->
            <div class="relative w-full h-80 bg-slate-50 rounded-xl border border-slate-100 p-4 flex items-center justify-center" id="chart-container">
                <div id="chart-placeholder" class="text-center">
                    <span class="text-4xl block mb-2 opacity-20">📊</span>
                    <p class="text-slate-400 text-xs">${t('no_chart_data')}</p>
                </div>
                <canvas id="price-history-chart" class="hidden w-full h-full"></canvas>
            </div>
        </div>
    </div>`;
}

export function renderResultsTable(list) {}