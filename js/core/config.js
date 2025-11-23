// js/core/config.js
// تنظیمات و استیت کلی برنامه

export const APPWRITE_CONFIG = {
    ENDPOINT: 'https://cloud.appwrite.io/v1',
    PROJECT_ID: '691c9337000c1532f26a', 
    DB_ID: '691c956400150133e319',
    COLS: {
        CATS: 'categories',
        MATS: 'materials',
        FORMS: 'formulas',
        UNITS: 'units',
        TRANS: 'transactions'
    },
    FUNCTIONS: {
        SCRAPER: '691dc278002eafe2ac0c'
    }
};

const { Client, Account, Databases, ID, Query, Functions } = Appwrite;

export const client = new Client()
    .setEndpoint(APPWRITE_CONFIG.ENDPOINT)
    .setProject(APPWRITE_CONFIG.PROJECT_ID);

export const account = new Account(client);
export const db = new Databases(client);
export const functions = new Functions(client);
export { ID, Query };

export const state = { 
    categories: [], units: [], materials: [], formulas: [], 
    activeFormulaId: null, publicFormulas: [], transactions: [] 
};