import { db, ID, Query, APPWRITE_CONFIG, state } from './config.js';

export async function fetchAllData() {
    console.log("🔄 Start Fetching Data...");
    try {
        const [cRes, mRes, fRes] = await Promise.all([
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.CATS, [Query.limit(100)]),
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.MATS, [Query.limit(5000)]),
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, [Query.limit(500)])
        ]);
        
        state.categories = cRes.documents;
        state.materials = mRes.documents;
        state.formulas = fRes.documents.sort((a, b) => new Date(b.$updatedAt) - new Date(a.$updatedAt));
        
        console.log(`✅ Data Loaded: ${state.categories.length} Cats, ${state.materials.length} Mats, ${state.formulas.length} Forms`);

        // دریافت استور (بدون توقف برنامه در صورت خطا)
        try {
            const sRes = await db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, [
                Query.equal('is_public', true), Query.limit(50)
            ]);
            state.publicFormulas = sRes.documents;
        } catch(e) { console.warn("Store fetch skipped"); }
        
        return true;
    } catch (error) {
        console.error("🔥 API Error:", error);
        throw error;
    }
}

export async function fetchSingleFormula(id) {
    try {
        const doc = await db.getDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, id);
        const idx = state.formulas.findIndex(f => f.$id === id);
        if (idx !== -1) state.formulas[idx] = doc; // آپدیت لوکال
        return doc;
    } catch (e) { console.error(e); return null; }
}

export const api = {
    create: (col, data) => db.createDocument(APPWRITE_CONFIG.DB_ID, col, ID.unique(), data),
    update: (col, id, data) => db.updateDocument(APPWRITE_CONFIG.DB_ID, col, id, data),
    delete: (col, id) => db.deleteDocument(APPWRITE_CONFIG.DB_ID, col, id)
};