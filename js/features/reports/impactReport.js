import { state } from '../../core/config.js';
import * as UI from './impactUI.js';
import * as HistoryModule from './impactHistory.js';

export function renderImpactTool(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 1. رندر کردن HTML
    container.innerHTML = UI.getImpactToolHTML(state.materials);

    // 2. اتصال دکمه مشاهده نمودار
    const btnHistory = document.getElementById('btn-load-history');
    if (btnHistory) {
        btnHistory.onclick = () => {
            const matId = document.getElementById('history-mat-select').value;
            HistoryModule.loadPriceHistory(matId);
        };
    }
}