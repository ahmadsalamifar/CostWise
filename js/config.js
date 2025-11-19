// تنظیمات اتصال به Appwrite
// در محیط پروداکشن واقعی، این مقادیر باید در متغیرهای محیطی باشند
export const APPWRITE_CONFIG = {
    ENDPOINT: 'https://cloud.appwrite.io/v1',
    PROJECT_ID: '691c9337000c1532f26a', // آی‌دی پروژه شما
    DB_ID: '691c956400150133e319', // آی‌دی دیتابیس
    COLS: {
        CATS: 'categories',
        MATS: 'materials', // ساختار جدید (V2)
        FORMS: 'formulas'
    },
    FUNCTIONS: {
        SCRAPER: '65a1234567890abcdef' // آی‌دی فانکشن اسکرپر (مثال)
    }
};

// چک کردن SDK
if (typeof Appwrite === 'undefined') console.error("❌ Appwrite SDK Error: Script not loaded");

const { Client, Account, Databases, ID, Query, Functions } = Appwrite;

// راه‌اندازی کلاینت
const client = new Client()
    .setEndpoint(APPWRITE_CONFIG.ENDPOINT)
    .setProject(APPWRITE_CONFIG.PROJECT_ID);

const account = new Account(client);
const db = new Databases(client);
const functions = new Functions(client);

// وضعیت سراسری برنامه (State Management)
// این آبجکت داده‌ها را در حافظه نگه می‌دارد تا نیاز به درخواست‌های مکرر نباشد
const state = { 
    categories: [], 
    materials: [], // شامل فیلدهای جدید V2
    formulas: [], 
    activeFormulaId: null, 
    publicFormulas: [] 
};

export { client, account, db, functions, ID, Query, state };
