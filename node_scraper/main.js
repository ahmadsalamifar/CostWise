/*
  این کد مربوط به Appwrite Cloud Function است.
  باید در بخش Functions پنل Appwrite یک تابع Node.js بسازید و این کد را در آن قرار دهید.
  پیش‌نیاز: npm install axios cheerio appwrite
*/

const { Client, Databases } = require('node-appwrite');
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async function (context) {
    const client = new Client()
        .setEndpoint('https://cloud.appwrite.io/v1')
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY); // نیاز به کلید API با دسترسی دیتابیس

    const db = new Databases(client);
    const DB_ID = 'YOUR_DB_ID';
    const MATS_COL = 'materials';

    context.log("🤖 Scraper Started...");

    try {
        // 1. دریافت مواد اولیه‌ای که لینک اسکرپر دارند
        // نکته: در نسخه واقعی باید از صفحه‌بندی (Pagination) استفاده شود
        const response = await db.listDocuments(DB_ID, MATS_COL, [
            // فیلتر کردن مواردی که لینک خالی ندارند (نیاز به تنظیم ایندکس در دیتابیس دارد)
        ]);
        
        const materials = response.documents.filter(doc => doc.scraper_url && doc.scraper_url.startsWith('http'));
        context.log(`Found ${materials.length} items to update.`);

        let updatedCount = 0;

        // 2. حلقه روی مواد و دریافت قیمت
        for (const mat of materials) {
            try {
                context.log(`Checking: ${mat.name}`);
                
                // دانلود HTML صفحه
                const { data: html } = await axios.get(mat.scraper_url, { timeout: 5000 });
                const $ = cheerio.load(html);
                
                // سلکتور CSS فرضی (باید بر اساس سایت مقصد تنظیم شود)
                // مثال: div.product-price یا span.price
                // در اینجا یک سلکتور عمومی را فرض می‌گیریم یا نیاز به کانفیگ جداگانه برای هر سایت دارید
                let priceText = $('.product-price, .price, .amount').first().text();
                
                // تمیز کردن متن قیمت (حذف تومان، ویرگول و فاصله‌ها)
                let cleanPrice = priceText.replace(/[^0-9]/g, '');
                let newPrice = parseFloat(cleanPrice);

                if (newPrice && newPrice > 0 && newPrice !== mat.price) {
                    // 3. بروزرسانی در دیتابیس
                    await db.updateDocument(DB_ID, MATS_COL, mat.$id, {
                        price: newPrice
                    });
                    updatedCount++;
                    context.log(`✅ Updated ${mat.name}: ${mat.price} -> ${newPrice}`);
                }
            } catch (err) {
                context.error(`Failed to scrape ${mat.name}: ${err.message}`);
            }
        }

        return context.res.json({
            success: true,
            message: `Scraper finished. Updated ${updatedCount} items.`
        });

    } catch (e) {
        context.error(e.toString());
        return context.res.json({ success: false, error: e.toString() }, 500);
    }
};