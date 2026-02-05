import { state } from '../../core/config.js';
import { formatPrice, formatDate, toggleElement } from '../../core/utils.js';
import { calculateCost, getUnitFactor } from './formulas_calc.js';
import { t } from '../../core/i18n.js';

export function renderDetailView(formula, callbacks) {
    if (!formula) {
        toggleElement('formula-detail-view', false);
        toggleElement('formula-detail-empty', true);
        return;
    }

    toggleElement('formula-detail-empty', false);
    toggleElement('formula-detail-view', true);

    const nameEl = document.getElementById('active-formula-name');
    if(nameEl) nameEl.innerText = formula.name;
    
    const dateEl = document.getElementById('active-formula-date');
    if(dateEl) dateEl.innerText = formatDate(formula.$updatedAt);
    
    const setVal = (id, val) => { 
        const el = document.getElementById(id); 
        if(el) el.value = typeof val === 'number' ? formatPrice(val) : val; 
    };
    setVal('inp-labor', formula.labor);
    setVal('inp-overhead', formula.overhead);
    
    const profitEl = document.getElementById('inp-profit');
    if(profitEl) profitEl.value = formula.profit || 0;

    renderComponentsTable(formula, callbacks.onDeleteComp);
    
    const calc = calculateCost(formula);
    const lblFinal = document.getElementById('lbl-final-price');
    if(lblFinal) lblFinal.innerText = formatPrice(calc.final);

    updateCompSelect();
}

function renderComponentsTable(formula, onDelete) {
    const listEl = document.getElementById('formula-comps-list');
    const countEl = document.getElementById('formula-item-count');
    if (!listEl) return;

    let comps = [];
    try { comps = typeof formula.components === 'string' ? JSON.parse(formula.components) : formula.components; } catch(e){}
    if (!Array.isArray(comps)) comps = [];

    if(countEl) countEl.innerText = `${comps.length} ${t('item_count')}`;

    if (comps.length === 0) {
        listEl.innerHTML = `<div class="p-8 text-center text-slate-400 text-xs">${t('formula_empty_state')}...</div>`;
        return;
    }

    listEl.innerHTML = comps.map((c, idx) => createComponentRow(c, idx)).join('');

    listEl.querySelectorAll('.btn-del-comp').forEach(btn => {
        btn.onclick = () => onDelete(parseInt(btn.dataset.idx));
    });
}

function createComponentRow(c, idx) {
    let name = '---', unitName = c.unit || '-', price = 0, total = 0;
    
    if (c.type === 'mat') {
        const m = state.materials.find(x => x.$id === c.id);
        if (m) {
            name = m.name;
            const factor = getUnitFactor(m, c.unit);
            let basePrice = m.price || 0;
            if(m.has_tax) basePrice *= 1.1;

            let rels = {};
            try { rels = typeof m.unit_relations === 'string' ? JSON.parse(m.unit_relations) : m.unit_relations; } catch(e){}
            const purchaseUnit = m.purchase_unit || rels?.price_unit || 'عدد';
            const purchaseFactor = getUnitFactor(m, purchaseUnit);
            
            if (purchaseFactor !== 0) {
                price = (basePrice / purchaseFactor) * factor;
            }
        } else name = 'Deleted';
    } else if (c.type === 'form') {
        const f = state.formulas.find(x => x.$id === c.id);
        name = f ? `🔗 ${f.name}` : 'Deleted';
        price = f ? calculateCost(f).final : 0;
        unitName = 'Count';
    }

    total = price * c.qty;

    return `
    <div class="flex justify-between items-center p-3 text-sm border-b border-slate-50 hover:bg-slate-50 group">
        <div>
            <div class="font-bold text-slate-700 text-xs">${name}</div>
            <div class="text-[10px] text-slate-500 mt-1">
                <span class="bg-slate-200 px-1.5 rounded font-mono font-bold text-slate-600">${c.qty}</span> ${unitName} × ${formatPrice(price)}
            </div>
        </div>
        <div class="flex items-center gap-2">
            <span class="font-bold text-slate-700 text-xs font-mono">${formatPrice(total)}</span>
            <button class="text-rose-400 opacity-0 group-hover:opacity-100 btn-del-comp px-2 transition-opacity" data-idx="${idx}">×</button>
        </div>
    </div>`;
}

export function updateCompSelect() {
    const filter = document.getElementById('comp-filter')?.value;
    const sel = document.getElementById('comp-select');
    if (!sel) return;

    let html = `<option value="">${t('comp_select_placeholder')}</option>`; 
    
    if (filter === 'FORM') {
        const others = state.formulas.filter(x => x.$id !== state.activeFormulaId);
        html += `<optgroup label="Formulas">` + others.map(x => `<option value="FORM:${x.$id}">🔗 ${x.name}</option>`).join('') + `</optgroup>`;
    } else {
        state.categories.forEach(cat => {
            if (filter && filter !== 'FORM' && filter !== cat.$id) return;
            const mats = state.materials.filter(x => x.category_id === cat.$id);
            if (mats.length) html += `<optgroup label="${cat.name}">` + mats.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + `</optgroup>`;
        });
        if (!filter) {
             const uncategorized = state.materials.filter(x => !x.category_id);
             if (uncategorized.length) html += `<optgroup label="Other">` + uncategorized.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + `</optgroup>`;
        }
    }
    sel.innerHTML = html;
}

export function setupDropdownListeners() {
    const filterEl = document.getElementById('comp-filter');
    if (filterEl) {
        const cats = state.categories.map(x => `<option value="${x.$id}">${x.name}</option>`).join('');
        filterEl.innerHTML = `<option value="">All...</option>${cats}<option value="FORM">Formulas</option>`;
        filterEl.onchange = updateCompSelect;
    }

    const compSel = document.getElementById('comp-select');
    if (compSel) compSel.onchange = updateUnitSelect;
}

function updateUnitSelect() {
    const val = document.getElementById('comp-select').value;
    const unitSel = document.getElementById('comp-unit-select');
    if (!unitSel) return;

    if (!val || val.startsWith('FORM:')) {
        unitSel.innerHTML = '<option value="count">Count</option>'; 
        return;
    }

    const id = val.split(':')[1];
    const m = state.materials.find(x => x.$id === id);
    if (m) {
        let opts = ['عدد'];
        try {
            const rels = typeof m.unit_relations === 'string' ? JSON.parse(m.unit_relations) : (m.unit_relations || {});
            if (rels.base) opts.push(rels.base);
            if (Array.isArray(rels.others)) rels.others.forEach(u => opts.push(u.name));
            if (m.purchase_unit) opts.push(m.purchase_unit);
            if (m.consumption_unit) opts.push(m.consumption_unit);
            opts = [...new Set(opts)]; 
        } catch(e){}
        unitSel.innerHTML = opts.map(u => `<option value="${u}">${u}</option>`).join('');
    }
}