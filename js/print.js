import { state } from './config.js';
import { calculateCost } from './formulas.js';
import { formatPrice, formatDate, openModal, closeModal } from './utils.js';

export function setupPrint() {
    document.getElementById('btn-print').onclick = printInvoice;
    document.getElementById('btn-close-print').onclick = () => closeModal('print-modal');
    
    // آپدیت زنده تیترها هنگام تایپ در اینپوت‌های پرینت
    document.getElementById('print-buyer-input').oninput = (e) => {
        document.getElementById('print-buyer-name').innerText = e.target.value || '---';
    };
    document.getElementById('print-seller-input').oninput = (e) => {
        document.getElementById('print-seller-name').innerText = e.target.value || 'سیمرغ گستر پویا';
    };
}

export function printInvoice() {
    if(!state.activeFormulaId) return;
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    const calc = calculateCost(f);
    const comps = JSON.parse(f.components || '[]');
    
    // پر کردن اطلاعات هدر
    document.getElementById('print-title').innerText = f.name;
    document.getElementById('print-id').innerText = f.$id.substring(0,8).toUpperCase();
    document.getElementById('print-date').innerText = formatDate(new Date());
    
    // نام فروشنده و خریدار پیش‌فرض
    document.getElementById('print-seller-name').innerText = document.getElementById('print-seller-input').value;
    document.getElementById('print-buyer-name').innerText = document.getElementById('print-buyer-input').value || 'مشتری گرامی';
    
    // تولید سطرها
    document.getElementById('print-rows').innerHTML = comps.map((c, idx) => {
        let name='-', unit='-';
        
        if(c.type==='mat') { 
            const m = state.materials.find(x=>x.$id===c.id); 
            if(m) {
                // اولویت با display_name است
                name = m.display_name || m.name; 
                unit = m.consumption_unit; // واحد مصرف
            }
        }
        else { 
            const s = state.formulas.find(x=>x.$id===c.id); 
            name = s ? s.name : 'محصول فرعی'; 
            unit = 'عدد'; 
        }
        
        return `
        <tr>
            <td class="py-2 text-right w-10 text-slate-400">${idx+1}</td>
            <td class="py-2 text-right font-bold">${name}</td>
            <td class="text-center font-mono">${c.qty}</td>
            <td class="text-center text-xs text-slate-500">${unit}</td>
        </tr>`;
    }).join('');
    
    // فوتر مالی
    document.getElementById('print-raw-total').innerText = formatPrice(calc.sub.toFixed(0));
    document.getElementById('print-profit').innerText = formatPrice(calc.profit.toFixed(0));
    document.getElementById('print-final').innerText = formatPrice(calc.final.toFixed(0));
    
    openModal('print-modal');
}