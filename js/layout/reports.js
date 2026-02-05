import { t } from '../core/i18n.js';

export function getReportsTabHTML() {
    return `
    <div id="tab-reports" class="tab-content hidden h-full overflow-y-auto p-2 md:p-4">
        <!-- محل قرارگیری ابزار تحلیل نوسان قیمت -->
        <div id="impact-analysis-container"></div>
        
        <!-- نمودارها -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pb-20">
            <!-- نمودار ۱ -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 class="font-bold text-slate-700 mb-4">${t('stock_value_chart')}</h3>
                <div class="relative h-80 w-full">
                    <canvas id="chart-stock-value"></canvas>
                </div>
            </div>
            
            <!-- نمودار ۲ -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 class="font-bold text-slate-700 mb-4">${t('category_dist_chart')}</h3>
                <div class="relative h-80 w-full">
                    <canvas id="chart-categories"></canvas>
                </div>
            </div>
        </div>
    </div>
    `;
}