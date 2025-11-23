import { api } from './api.js';
import { state, APPWRITE_CONFIG } from './core/config.js';

export function setupCategories(refreshCallback) {
    // مدیریت دسته‌ها
    document.getElementById('category-form').onsubmit = (e) => { 
        e.preventDefault(); 
        addItem(APPWRITE_CONFIG.COLS.CATS, 'cat-name', refreshCallback); 
    };

    // مدیریت واحدها
    document.getElementById('unit-form').onsubmit = (e) => { 
        e.preventDefault(); 
        addItem(APPWRITE_CONFIG.COLS.UNITS, 'unit-name', refreshCallback); 
    };

    // --- اضافه کردن دکمه بکاپ به صفحه مدیریت داده‌ها ---
    // بررسی می‌کنیم دکمه تکراری نسازیم
    const container = document.getElementById('tab-categories');
    if(container && !document.getElementById('btn-full-backup')) {
        const wrapper = document.createElement('div');
        wrapper.className = "max-w-4xl mx-auto mt-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center";
        
        wrapper.innerHTML = `
            <h3 class="font-bold text-slate-700 mb-2 text-sm">پشتیبان‌گیری و بازنشانی</h3>
            <p class="text-xs text-slate-400 mb-4">دانلود تمام اطلاعات (کالاها، فرمول‌ها، واحدها) در یک فایل JSON</p>
            <button id="btn-full-backup" class="btn btn-primary w-full md:w-1/3 mx-auto flex gap-2">
                <span>💾</span> دانلود فایل بکاپ
            </button>
        `;
        container.appendChild(wrapper);
        
        // اتصال رویداد کلیک
        setTimeout(() => {
             document.getElementById('btn-full-backup').onclick = exportDatabase;
        }, 100);
    }
}

function exportDatabase() {
    const data = {
        timestamp: new Date().toISOString(),
        version: "3.0",
        materials: state.materials,
        formulas: state.formulas,
        categories: state.categories,
        units: state.units
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "simorgh_full_backup_" + new Date().toISOString().split('T')[0] + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

async function addItem(col, inputId, cb) {
    const input = document.getElementById(inputId);
    const val = input.value;
    if(!val) return;
    try {
        await api.create(col, {name: val});
        input.value = '';
        cb();
    } catch(e) { alert(e.message); }
}

export function renderCategories(refreshCallback) {
    renderList('category-list', state.categories, APPWRITE_CONFIG.COLS.CATS, refreshCallback);
    renderList('unit-list', state.units, APPWRITE_CONFIG.COLS.UNITS, refreshCallback);
}

function renderList(elementId, data, col, cb) {
    const el = document.getElementById(elementId);
    if(!el) return;

    el.innerHTML = data.map(item => `
        <div class="flex justify-between p-2 bg-slate-50 rounded border mb-1 text-xs items-center">
            <span class="font-bold text-slate-700">${item.name}</span>
            <button class="text-rose-500 btn-del-${col} w-6 h-6 flex items-center justify-center hover:bg-rose-50 rounded" data-id="${item.$id}">×</button>
        </div>
    `).join('');
    
    el.querySelectorAll(`.btn-del-${col}`).forEach(b => {
        b.onclick = async () => {
            if(confirm('حذف شود؟')) {
                try { await api.delete(col, b.dataset.id); cb(); }
                catch(e) { alert(e.message); }
            }
        };
    });
}
