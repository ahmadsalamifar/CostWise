// مدیریت فرم ورود اطلاعات مواد
import { formatPrice, parseLocaleNumber } from '../../core/utils.js';
import * as Units from './materials_units.js';

export function setupFormListeners(onSubmit) {
    const form = document.getElementById('material-form');
    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();
            onSubmit(collectFormData());
        };
    }
    
    document.getElementById('mat-cancel-btn')?.addEventListener('click', resetForm);
    setupPriceInputFormat();
    setupCurrencyToggle(); // راه‌اندازی دکمه‌های ریال/تومان
}

function setupCurrencyToggle() {
    const btns = document.querySelectorAll('.currency-toggle .currency-btn');
    const input = document.getElementById('mat-scraper-currency');
    
    if (!input) return;
    
    btns.forEach(btn => {
        btn.onclick = () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            input.value = btn.dataset.val;
        };
    });
}

function collectFormData() {
    const unitData = Units.getUnitData(); 
    // اضافه کردن واحد پولی به دیتای واحدها (چون فیلد جداگانه در دیتابیس ندارد)
    unitData.scraper_currency = document.getElementById('mat-scraper-currency').value || 'toman';

    const rawPrice = document.getElementById('mat-price').value;
    
    return {
        name: document.getElementById('mat-name').value,
        display_name: document.getElementById('mat-display-name').value,
        category_id: document.getElementById('mat-category').value,
        price: parseLocaleNumber(rawPrice),
        unit_relations: JSON.stringify(unitData),
        has_tax: document.getElementById('mat-has-tax').checked,
        
        // فیلدهای اسکرپر
        scraper_url: document.getElementById('mat-scraper-url').value,
        scraper_anchor: document.getElementById('mat-scraper-anchor').value,
        scraper_factor: parseFloat(document.getElementById('mat-scraper-factor').value) || 1
    };
}

export function populateForm(m) {
    // 1. اطلاعات پایه
    document.getElementById('mat-id').value = m.$id;
    document.getElementById('mat-name').value = m.name;
    document.getElementById('mat-display-name').value = m.display_name || '';
    document.getElementById('mat-category').value = m.category_id || '';
    document.getElementById('mat-price').value = formatPrice(m.price);
    document.getElementById('mat-has-tax').checked = !!m.has_tax;
    
    // 2. اطلاعات اسکرپر (لینک و ...) - بخش جدید
    document.getElementById('mat-scraper-url').value = m.scraper_url || '';
    document.getElementById('mat-scraper-anchor').value = m.scraper_anchor || '';
    document.getElementById('mat-scraper-factor').value = m.scraper_factor || 1;

    // 3. بازیابی واحدها و ارز
    try {
        let rels = m.unit_relations;
        if (typeof rels === 'string') rels = JSON.parse(rels);
        if (!rels) rels = {};

        Units.setUnitData(rels);

        // تنظیم ارز (ریال/تومان)
        const currency = rels.scraper_currency || 'toman';
        document.getElementById('mat-scraper-currency').value = currency;
        document.querySelectorAll('.currency-toggle .currency-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.val === currency);
        });

    } catch(e) { 
        Units.resetUnitData(); 
    }

    // 4. تغییر حالت دکمه‌ها
    document.getElementById('mat-cancel-btn').classList.remove('hidden');
    document.getElementById('mat-submit-btn').innerText = 'ذخیره تغییرات';
    
    // اسکرول به فرم در موبایل
    if(window.innerWidth < 1024) {
        document.getElementById('material-form')?.scrollIntoView({ behavior: 'smooth' });
    }
}

export function resetForm() {
    document.getElementById('material-form').reset();
    document.getElementById('mat-id').value = '';
    
    // ریست دکمه‌های ارز
    document.getElementById('mat-scraper-currency').value = 'toman';
    document.querySelectorAll('.currency-toggle .currency-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.val === 'toman');
    });

    document.getElementById('mat-cancel-btn').classList.add('hidden');
    document.getElementById('mat-submit-btn').innerText = 'ذخیره کالا';
    Units.resetUnitData();
}

function setupPriceInputFormat() {
    const el = document.getElementById('mat-price');
    if(!el) return;
    el.onblur = (e) => e.target.value = formatPrice(parseLocaleNumber(e.target.value));
    el.onfocus = (e) => e.target.value = parseLocaleNumber(e.target.value) || '';
}