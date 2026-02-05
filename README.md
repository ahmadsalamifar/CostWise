🏗️ Simorgh Cost Calculator (BOM System)

A professional, web-based Bill of Materials (BOM) & Cost Calculation System designed for manufacturing businesses. It helps you manage raw materials, define complex recursive product formulas, and automatically update costs using a real-time price scraper.

Built with Vanilla JavaScript (ES Modules), Tailwind CSS, and Appwrite as the Backend-as-a-Service.

✨ Key Features

📦 Inventory Management: comprehensive material system supporting multiple units (e.g., Buy in Box, Consume in Gram) with automatic unit conversion.

🧮 Recursive Formula Engine: Create nested product formulas (Formula inside Formula). The engine automatically calculates the cost tree, detecting and preventing circular dependencies.

🤖 Automated Price Scraper: Integrated Node.js function to scrape real-time prices from online vendors (Torob, Emalls, WooCommerce) and update your cost calculations instantly.

📊 Analytics Dashboard: Visual charts for stock value distribution, category breakdown, and historical price fluctuation analysis.

🖨️ Invoicing: Generate clean, printable production sheets and invoices.

🔔 Toast Notifications: Modern, non-blocking UI notifications for user actions.

🛠️ Tech Stack

Frontend: Vanilla JavaScript (ES6 Modules), HTML5

Styling: Tailwind CSS (CDN/Utility-first)

Backend: Appwrite (Database, Auth, Cloud Functions)

Charting: Chart.js

Icons: Native Emoji & CSS Shapes

🚀 Installation & Setup

1. Clone the Repository

git clone [https://github.com/your-username/simorgh-cost-calculator.git](https://github.com/your-username/simorgh-cost-calculator.git)
cd simorgh-cost-calculator


2. Appwrite Configuration

Create a project on Appwrite Cloud.

Create a Database and the following Collections:

categories (name)

units (name)

materials (name, price, unit_relations, ...)

formulas (name, components, labor, overhead, profit, is_public)

price_history (material_id, price, date)

Important: Update permissions (RLS) for these collections to allow Any (for demo) or Users to read/write.

3. Frontend Configuration

Navigate to js/core/.

Rename config.example.js to config.js.

Open config.js and fill in your Appwrite details:

const APPWRITE_CONFIG = {
    ENDPOINT: '[https://cloud.appwrite.io/v1](https://cloud.appwrite.io/v1)',
    PROJECT_ID: 'YOUR_PROJECT_ID',
    DB_ID: 'YOUR_DATABASE_ID',
    // ... ensure collection IDs match yours
};


4. Run the Project

Since this project uses ES Modules, you need a local server.

Using Python:

python3 -m http.server 8000


Using VS Code:
Install the "Live Server" extension and click "Go Live".

Open http://localhost:8000 in your browser.

📂 Folder Structure

.
├── css/                 # Stylesheets
├── js/
│   ├── core/            # Config, API wrapper, Utils, Toast
│   ├── features/        # Business logic (Materials, Formulas, etc.)
│   ├── layout/          # HTML Templates & View Components
│   └── main.js          # Entry point
├── my-scraper/          # Node.js Appwrite Function (Optional)
└── index.html           # Main HTML


🤖 Price Scraper (Optional)

To enable the "Update Prices" feature:

Go to the my-scraper folder.

Deploy this function to Appwrite Functions (Node.js runtime).

Add the Function ID to your js/core/config.js.

🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

📝 License

This project is open-source and available under the MIT License.