# 🕷️ Amazon Product Scraper

## What It Does:
Scrapes product information from Amazon.in and stores it in MongoDB:
- Product title, ASIN
- Current price, original price, discount
- Rating, review count
- Price history tracking

## 🚀 How to Run:

### Option 1: Simple Command
```bash
cd amazon_scraper
python amazon_price_scraper.py
```

### Option 2: With Python Path (if Option 1 fails)
```bash
cd "c:\Users\kvpra\OneDrive\Desktop\Infosys\Real-Time-Competitor-Strategy-Tracker-for-E-commerce\amazon_scraper"
python amazon_price_scraper.py
```

## 📦 What Gets Scraped:

By default, it scrapes these 5 products:
1. https://amzn.in/d/am4Rr4C
2. https://amzn.in/d/9cVbj8s
3. https://amzn.in/d/fGpfno4
4. https://amzn.in/d/6eFNUhg
5. https://amzn.in/d/5kfILVS

## 📊 Where Data Is Stored:

MongoDB Database: `ecom_tracker`
- Collection: `products` - Product details
- Collection: `price_history` - Price tracking over time

## ⚙️ Requirements:

Already installed if you set up the project:
- requests
- beautifulsoup4
- pymongo
- python-dotenv
- pandas

## 🔧 Customize Product Links:

Edit `amazon_price_scraper.py` line 252-257 to add more products:
```python
product_links = [
    "your-amazon-product-url-1",
    "your-amazon-product-url-2",
    # Add more...
]
```

## ⚠️ Important Notes:

1. **Amazon May Block**: Amazon has anti-scraping measures. The script includes:
   - Random user agents
   - Retry logic
   - Rate limiting
   
2. **CAPTCHA Detection**: If blocked, you'll see:
   ```
   ❌ Blocked by CAPTCHA
   ```
   
3. **Legal**: For educational/research purposes only

## 📈 View Scraped Data:

The script will display a summary table after scraping:
```
--- Scraped Product Data ---
ASIN    Title    Price    Discount    Rating
...
```

## 🔄 Run Periodically:

To track prices over time, run the scraper daily or hourly:
```bash
# Run once
python amazon_price_scraper.py

# Schedule with Task Scheduler (Windows) or cron (Linux)
```

## ✅ Success Output:

```
🚀 Starting concurrent scraper for 5 products...
✅ Scraped: Product Name (ASIN: B07XYZ...)
✅ Scraped: Another Product (ASIN: B08ABC...)
...
✅ Price history: 5 records inserted
--- Scraped Product Data ---
[Table showing products]
```

## 🐛 Troubleshooting:

### Error: "MONGO_URI not found"
**Solution**: Make sure `.env` file exists in `amazon_scraper` folder

### Error: "Module not found"
**Solution**: Install requirements:
```bash
pip install requests beautifulsoup4 pymongo python-dotenv pandas
```

### Error: "Connection failed"
**Solution**: Check your internet connection and MongoDB URI

---

**Note**: This scraper is separate from the main application servers. You can run it anytime to update product data in MongoDB.
