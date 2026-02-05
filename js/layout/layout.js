import { getHeaderHTML, getTabsHTML } from './header.js';
import { getMaterialsTabHTML } from './materials.js';
import { getFormulasTabHTML } from './formulas.js';
import { getReportsTabHTML } from './reports.js'; 
import { getOtherTabsHTML } from './others.js';
import { getModalsHTML, getLoadingHTML, getLanguageModalHTML } from './modals.js'; 
import { openModal } from '../core/utils.js';
import { setLanguage } from '../core/i18n.js'; // اضافه کردن این خط

export function injectAppLayout() {
    const appHTML = `
        ${getLanguageModalHTML()} 
        ${getLoadingHTML()}

        <div id="app-content" class="hidden h-screen flex flex-col overflow-hidden bg-slate-50">
            ${getHeaderHTML()}
            ${getTabsHTML()}

            <main class="flex-1 overflow-hidden p-2 md:p-4 relative">
                ${getFormulasTabHTML()}
                ${getMaterialsTabHTML()}
                ${getReportsTabHTML()}
                ${getOtherTabsHTML()}
            </main>
        </div>

        ${getModalsHTML()}
    `;

    document.body.innerHTML = appHTML;
    setupLayoutEvents();
}

function setupLayoutEvents() {
    // دکمه فرمول جدید
    const btnOpenNewFormula = document.getElementById('btn-open-new-formula');
    if (btnOpenNewFormula) {
        btnOpenNewFormula.onclick = () => openModal('new-formula-modal');
    }

    // دکمه‌های انتخاب زبان (بخش جدید)
    const btnFa = document.getElementById('btn-lang-fa');
    if (btnFa) {
        btnFa.onclick = () => {
            if (setLanguage('fa')) location.reload();
        };
    }

    const btnEn = document.getElementById('btn-lang-en');
    if (btnEn) {
        btnEn.onclick = () => {
            if (setLanguage('en')) location.reload();
        };
    }
}