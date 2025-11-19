import { db, functions, ID, Query, APPWRITE_CONFIG, state } from './config.js';

// دریافت تمام داده‌ها (Data Fetching)
export async function fetchAllData() {
    console.log("📡 API: دریافت داده‌های اولیه...");
    try {
        const [cRes, mRes, fRes] = await Promise.all([
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.CATS, [Query.limit(100)]),
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.MATS, [Query.limit(5000)]),
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, [Query.limit(500)])
        ]);
        
        state.categories = cRes.documents;
        state.materials = mRes.documents;
        state.formulas = fRes.documents.sort((a, b) => new Date(b.$updatedAt) - new Date(a.$updatedAt));
        
        // دریافت فرمول‌های عمومی (فروشگاه)
        try {
            const sRes = await db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, [Query.equal('is_public', true), Query.limit(50)]);
            state.publicFormulas = sRes.documents;
        } catch(e) { console.warn("Store fetch failed", e); }
        
        return true;
    } catch (error) {
        console.error("🔥 API Error:", error);
        throw error;
    }
}

// آبجکت API برای عملیات CRUD
export const api = {
    create: (col, data) => db.createDocument(APPWRITE_CONFIG.DB_ID, col, ID.unique(), data),
    update: (col, id, data) => db.updateDocument(APPWRITE_CONFIG.DB_ID, col, id, data),
    delete: (col, id) => db.deleteDocument(APPWRITE_CONFIG.DB_ID, col, id),
    get: (col, id) => db.getDocument(APPWRITE_CONFIG.DB_ID, col, id),
    
    // اجرای فانکشن (برای اسکرپر)
    runScraper: async () => {
        // در نسخه واقعی باید آی‌دی فانکشن را در کانفیگ بگذارید
        // return functions.createExecution(APPWRITE_CONFIG.FUNCTIONS.SCRAPER);
        console.log("Simulation: Scraper Function Triggered");
        return new Promise(r => setTimeout(r, 1000)); // شبیه‌سازی
    }
};