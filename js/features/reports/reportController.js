// کنترلر بخش گزارشات و نمودارها
import { state } from '../../core/config.js';
import { formatPrice } from '../../core/utils.js';

let stockChart = null;
let categoryChart = null;

export function init() {
    // اگر نیاز به لیسنر خاصی بود اینجا اضافه می‌شود
    // فعلاً فقط با رندر شدن دیتا کار داریم
}

export function renderReports() {
    // بررسی اینکه آیا در تب گزارشات هستیم یا نه (برای پرفورمنس)
    // اگر کانتینر مخفی باشد، Chart.js ممکن است درست رندر نکند، اما ما فعلا همیشه رندر می‌کنیم
    renderStockChart();
    renderCategoryChart();
}

function renderStockChart() {
    const canvas = document.getElementById('chart-stock-value');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // محاسبه ارزش کالاها به تفکیک دسته
    // از آنجا که فیلد "تعداد در انبار" نداریم، فعلاً میانگین قیمت یا مجموع قیمت واحد را نمایش می‌دهیم
    // یا صرفاً تعداد کالاها. اینجا "تعداد کالا در هر دسته" را نمایش می‌دهیم که منطقی‌تر است
    // اگر فیلد موجودی اضافه شود، می‌توان فرمول Price * Stock را پیاده کرد.
    
    const catData = {};
    
    state.materials.forEach(m => {
        const catName = state.categories.find(c => c.$id === m.category_id)?.name || 'بدون دسته';
        if (!catData[catName]) catData[catName] = 0;
        // فعلاً مجموع قیمت واحد را به عنوان شاخص ارزش در نظر می‌گیریم (چون موجودی نداریم)
        catData[catName] += m.price || 0;
    });

    const labels = Object.keys(catData);
    const data = Object.values(catData);

    if (stockChart) stockChart.destroy();

    stockChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'مجموع ارزش ریالی واحدها',
                data: data,
                backgroundColor: '#0d9488',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatPrice(context.raw) + ' تومان';
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function renderCategoryChart() {
    const canvas = document.getElementById('chart-categories');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const catCounts = {};
    state.materials.forEach(m => {
        const catName = state.categories.find(c => c.$id === m.category_id)?.name || 'بدون دسته';
        catCounts[catName] = (catCounts[catName] || 0) + 1;
    });

    const labels = Object.keys(catCounts);
    const data = Object.values(catCounts);

    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#0d9488', '#f59e0b', '#f43f5e', '#3b82f6', '#8b5cf6', '#64748b'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}