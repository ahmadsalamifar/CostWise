// js/core/api.js
// فقط وظیفه ارتباط خام با دیتابیس را دارد
import { db, functions, ID, Query, APPWRITE_CONFIG, state } from './config.js';

export const api = {
    create: (col, data) => db.createDocument(APPWRITE_CONFIG.DB_ID, col, ID.unique(), data),
    update: (col, id, data) => db.updateDocument(APPWRITE_CONFIG.DB_ID, col, id, data),
    delete: (col, id) => db.deleteDocument(APPWRITE_CONFIG.DB_ID, col, id),
    get: (col, id) => db.getDocument(APPWRITE_CONFIG.DB_ID, col, id),
    
    runScraper: async (payload) => {
        const execution = await functions.createExecution(
            APPWRITE_CONFIG.FUNCTIONS.SCRAPER, 
            JSON.stringify(payload)
        );
        return JSON.parse(execution.responseBody);
    }
};

export async function fetchAllData() {
    try {
        const [cRes, uRes, mRes, fRes] = await Promise.all([
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.CATS, [Query.limit(100)]),
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.UNITS, [Query.limit(100)]), 
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.MATS, [Query.limit(5000)]),
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, [Query.limit(500)])
        ]);
        
        state.categories = cRes.documents;
        state.units = uRes.documents;
        state.materials = mRes.documents;
        state.formulas = fRes.documents.sort((a, b) => new Date(b.$updatedAt) - new Date(a.$updatedAt));
        return true;
    } catch (error) {
        console.error("API Fetch Error:", error);
        throw error;
    }
}