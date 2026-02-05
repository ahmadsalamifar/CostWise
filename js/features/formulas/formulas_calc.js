// موتور محاسباتی فرمول‌ها (اصلاح شده: جلوگیری از حلقه بی‌نهایت)
import { state } from '../../core/config.js';

/**
 * دریافت ضریب تبدیل واحد برای یک متریال خاص
 */
export function getUnitFactor(material, unitName) {
    if (!material || !unitName) return 1;
    
    try {
        let rels = material.unit_relations;
        if (typeof rels === 'string') rels = JSON.parse(rels);
        if (!rels) rels = {};

        if (unitName === rels.base) return 1;
        
        const found = (rels.others || []).find(u => u.name === unitName);
        if (found && found.qtyUnit !== 0) {
            return found.qtyBase / found.qtyUnit;
        }
        
        if (unitName === material.purchase_unit) {
             return 1;
        }

        return 1;
    } catch (e) { 
        console.warn(`Error calculating unit factor for ${material.name}:`, e);
        return 1; 
    }
}

/**
 * محاسبه قیمت فرمول با محافظت در برابر ارجاع دوری (Circular Dependency)
 * @param {object} f - آبجکت فرمول
 * @param {Set} visited - مجموعه‌ای از IDهای بازدید شده در این شاخه محاسبه
 */
export function calculateCost(f, visited = new Set()) {
    if(!f) return { matCost:0, sub:0, profit:0, final:0 };

    // بررسی جلوگیری از حلقه بی‌نهایت
    if (visited.has(f.$id)) {
        console.warn(`Circular dependency detected in formula: ${f.name}`);
        return { matCost: 0, sub: 0, profit: 0, final: 0 };
    }

    // اضافه کردن ID فعلی به لیست بازدید شده‌ها (برای این شاخه)
    const currentVisited = new Set(visited);
    currentVisited.add(f.$id);
    
    let matCost = 0;
    let comps = parseComponents(f.components);

    comps.forEach(c => {
        if (c.type === 'mat') {
            const m = state.materials.find(x => x.$id === c.id);
            if (m) {
                let currentPrice = m.price || 0;
                if (m.has_tax) currentPrice *= 1.10;

                let rels = {};
                try { rels = typeof m.unit_relations === 'string' ? JSON.parse(m.unit_relations) : m.unit_relations; } catch(e){}
                
                const priceUnit = m.purchase_unit || rels?.price_unit || m.unit || 'عدد';
                
                const priceFactor = getUnitFactor(m, priceUnit);
                const consumptionFactor = getUnitFactor(m, c.unit);
                
                if (priceFactor !== 0) {
                    const baseUnitPrice = currentPrice / priceFactor;
                    matCost += baseUnitPrice * consumptionFactor * c.qty;
                } else {
                     matCost += currentPrice * c.qty;
                }
            }
        } else if (c.type === 'form') {
            const sub = state.formulas.find(x => x.$id === c.id);
            if (sub) {
                 // ارسال لیست بازدید شده‌ها به مرحله بعدی
                 matCost += calculateCost(sub, currentVisited).final * c.qty;
            }
        }
    });

    const labor = f.labor || 0;
    const overhead = f.overhead || 0;
    const subTotal = matCost + labor + overhead;
    const profit = (f.profit || 0) / 100 * subTotal;
    
    return {
        matCost, 
        sub: subTotal, 
        profit, 
        final: subTotal + profit
    };
}

function parseComponents(data) {
    try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
}