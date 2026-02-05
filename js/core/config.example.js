// Configuration Template
// Rename this file to 'config.js' and fill in your Appwrite details.

const APPWRITE_CONFIG = {
    ENDPOINT: 'https://cloud.appwrite.io/v1',
    PROJECT_ID: '', // Your Appwrite Project ID
    DB_ID: '', // Your Database ID
    COLS: {
        CATS: 'categories',
        MATS: 'materials',
        FORMS: 'formulas',
        UNITS: 'units',
        HISTORY: 'price_history'
    },
    FUNCTIONS: {
        SCRAPER: '' // Your Function ID (Optional)
    }
};

// Check if Appwrite SDK is loaded via CDN
if (typeof Appwrite === 'undefined') {
    console.error("Error: Appwrite SDK is not loaded.");
}

const { Client, Account, Databases, ID, Query, Functions } = Appwrite;

const client = new Client()
    .setEndpoint(APPWRITE_CONFIG.ENDPOINT)
    .setProject(APPWRITE_CONFIG.PROJECT_ID);

export const account = new Account(client);
export const db = new Databases(client);
export const functions = new Functions(client);
export { ID, Query, APPWRITE_CONFIG };

export const state = { 
    categories: [], 
    units: [], 
    materials: [], 
    formulas: [], 
    activeFormulaId: null, 
    publicFormulas: [] 
};