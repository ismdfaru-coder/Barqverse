# 🚀 use.ai Scraper - Complete Setup Guide

## Overview

A production-ready web scraper using Playwright to automate use.ai interaction and integrate with a React chat app. The system includes:

- ✅ Playwright browser automation
- ✅ Express backend API
- ✅ React frontend chat UI
- ✅ Error handling & retries
- ✅ Rate limiting
- ✅ Responsive design

---

## 📋 Prerequisites

- **Node.js** 18+ (download from https://nodejs.org)
- **npm** or **yarn** package manager
- **use.ai** account (free or paid)
- **Modern browser** (Chrome, Edge, Firefox)

**Verify installation:**
```bash
node --version    # Should be 18+
npm --version     # Should be 9+
```

---

## 🛠️ Installation

### 1. Clone/Create Project Structure

```
use-ai-scraper/
├── backend/
│   ├── use-ai-scraper.ts
│   ├── backend-api.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── ChatApp.tsx
│   │   ├── ChatApp.css
│   │   └── ...
│   ├── package.json
│   └── .env.local
└── README.md
```

### 2. Backend Setup

```bash
cd backend
npm install

# Install Playwright browsers
npx playwright install

# Copy .env file
cp .env.example .env
```

**Edit `.env`:**
```env
USE_AI_EMAIL=your-real-email@gmail.com
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install

# Create .env.local
echo "REACT_APP_API_URL=http://localhost:5000" > .env.local
```

---

## ▶️ Running the Application

### Terminal 1 - Start Backend

```bash
cd backend
npm run dev
```

Expected output:
```
✅ Server running at http://localhost:5000
📍 Scrape endpoint: POST http://localhost:5000/api/scrape
❤️ Health check: GET http://localhost:5000/api/health
```

### Terminal 2 - Start Frontend

```bash
cd frontend
npm start
```

Expected output:
```
Compiled successfully!
You can now view use-ai-scraper in the browser.
Local:            http://localhost:3000
```

### Terminal 3 - Optional: Test Scraper Directly

```bash
cd backend
npx ts-node -e "
  import UseAiScraper from './use-ai-scraper';
  
  const scraper = new UseAiScraper({
    email: 'your-email@gmail.com',
    headless: false // See browser automation
  });
  
  (async () => {
    try {
      const result = await scraper.scrapeWithRetry('what is AI?');
      console.log('Response:', result);
    } finally {
      await scraper.close();
    }
  })();
"
```

---

## 🔌 API Endpoints

### POST /api/scrape

Send a prompt to use.ai and get the response.

**Request:**
```bash
curl -X POST http://localhost:5000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "what is AI?",
    "model": "Fable 5",
    "email": "your@email.com"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "AI (Artificial Intelligence) is...",
    "duration": 5432,
    "model": "Fable 5"
  },
  "timestamp": "2024-01-23T10:30:45.123Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to extract response text from page",
  "timestamp": "2024-01-23T10:30:45.123Z"
}
```

### GET /api/health

Check server health.

```bash
curl http://localhost:5000/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-23T10:30:45.123Z",
  "uptime": 123.456
}
```

### GET /api/models

Get available models.

```bash
curl http://localhost:5000/api/models
```

Response:
```json
{
  "success": true,
  "models": ["Auto", "Fable 5", "Sonnet 5", "Claude 3.5"],
  "timestamp": "2024-01-23T10:30:45.123Z"
}
```

---

## 🎯 Usage

1. **Open** http://localhost:3000
2. **Enter your email** (must be same as `USE_AI_EMAIL` in backend .env)
3. **Click Sign In**
4. **Type your prompt** (e.g., "what is AI?")
5. **Select a model** from dropdown
6. **Press Enter** or click Send button
7. **Wait for response** (30 seconds max)
8. **See result** in chat interface

---

## 🔧 Configuration

### Scraper Options

In `use-ai-scraper.ts`:

```typescript
const scraper = new UseAiScraper({
  email: 'user@gmail.com',        // use.ai login email
  headless: true,                 // Hide browser window
  timeout: 30000,                 // 30 second timeout
  retries: 3                      // Retry 3 times on failure
});
```

### Environment Variables

**Backend (.env):**
```env
PORT=5000                           # API port
NODE_ENV=development                # development | production
USE_AI_EMAIL=email@gmail.com        # use.ai login
HEADLESS=true                       # Show/hide browser
SCRAPER_TIMEOUT=30000               # Timeout in ms
SCRAPER_RETRIES=3                   # Retry attempts
FRONTEND_URL=http://localhost:3000  # CORS origin
RATE_LIMIT_MAX=10                   # 10 requests/min
```

**Frontend (.env.local):**
```env
REACT_APP_API_URL=http://localhost:5000  # API base URL
```

---

## 🐛 Troubleshooting

### "Browser launch failed"

**Solution:** Reinstall Playwright browsers
```bash
npx playwright install
npx playwright install-deps  # Install system dependencies
```

### "Email check modal stuck"

**Solution:** The modal handling is automatic. If it fails:
1. Check `.env` email matches your use.ai account
2. Increase timeout: `SCRAPER_TIMEOUT=60000`
3. Increase retries: `SCRAPER_RETRIES=5`

### "No response extracted"

**Possible causes:**
- use.ai page structure changed
- DOM selectors outdated
- Response took too long

**Debug:**
```bash
HEADLESS=false npm run dev  # Run with visible browser
# Watch what happens on the page
```

### "CORS errors"

**Solution:** Update `FRONTEND_URL` in .env:
```env
FRONTEND_URL=http://localhost:3000  # Match your frontend URL
```

### "Rate limit error"

**Solution:** Wait 1 minute or increase rate limit in .env:
```env
RATE_LIMIT_MAX=20  # Increase from 10
```

---

## 📊 Performance Optimization

### Browser Pool (Production)

For handling multiple concurrent requests:

```typescript
class BrowserPool {
  private browsers: Browser[] = [];
  private maxSize = 5;

  async getBrowser(): Promise<Browser> {
    if (this.browsers.length < this.maxSize) {
      const browser = await chromium.launch();
      this.browsers.push(browser);
      return browser;
    }
    return this.browsers[0]; // Reuse
  }
}
```

### Response Caching

Add Redis caching for identical prompts:

```typescript
const redis = require('redis').createClient();

// Cache identical prompts for 5 minutes
const cacheKey = `scrape:${prompt}:${model}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// ... scrape ...

await redis.setex(cacheKey, 300, JSON.stringify(result));
```

---

## 🔒 Security Considerations

⚠️ **IMPORTANT - Do NOT ignore:**

1. **Never commit .env file**
   ```bash
   echo ".env" >> .gitignore
   ```

2. **Use environment variables for secrets**
   ```env
   USE_AI_EMAIL=xxxx@gmail.com  # Use real email, not hardcoded
   ```

3. **Add authentication to API** (production)
   ```typescript
   app.use((req, res, next) => {
     const token = req.headers.authorization;
     if (!token) return res.status(401).json({ error: 'Unauthorized' });
     next();
   });
   ```

4. **Enable HTTPS** (production)
   ```typescript
   import https from 'https';
   import fs from 'fs';
   
   const cert = fs.readFileSync('cert.pem');
   const key = fs.readFileSync('key.pem');
   https.createServer({ cert, key }, app).listen(443);
   ```

5. **Rate limiting** already enabled
   - 10 requests/min per IP
   - Prevent scraper abuse

6. **Input validation** on all endpoints
   - Prompt length limited to 5000 chars
   - Email format validated
   - Model whitelist

---

## 📝 Logging

View detailed logs:

**Backend:**
```bash
DEBUG=* npm run dev
```

**Frontend:**
- Open Developer Tools (F12)
- Check Console tab for errors
- Network tab shows API calls

---

## 🚀 Deployment

### Docker (Backend)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json .
RUN npm ci --only=production
RUN npx playwright install
COPY . .
CMD ["npm", "start"]
```

### Railway/Vercel (Frontend)

1. Push to GitHub
2. Connect repository
3. Set env vars
4. Deploy

### Heroku (Backend)

```bash
heroku create your-app-name
heroku config:set USE_AI_EMAIL=your@email.com
git push heroku main
```

---

## 📚 File Structure

```
use-ai-scraper/
│
├── backend/
│   ├── use-ai-scraper.ts       # Playwright automation
│   ├── backend-api.ts          # Express server
│   ├── tsconfig.json           # TypeScript config
│   ├── package.json            # Dependencies
│   ├── .env.example            # Example config
│   └── .env                    # Your config (DO NOT COMMIT)
│
├── frontend/
│   ├── src/
│   │   ├── ChatApp.tsx         # React component
│   │   ├── ChatApp.css         # Styles
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── ...
│   ├── package.json
│   ├── .env.local              # Frontend config
│   └── tsconfig.json
│
└── README.md                   # This file
```

---

## ❓ FAQ

**Q: Can I use this with other websites?**
A: Yes! Modify the `selectors` object in `use-ai-scraper.ts` for different sites.

**Q: Is this production-ready?**
A: With additions (auth, HTTPS, monitoring), yes. Start with dev setup first.

**Q: What if use.ai changes their website?**
A: Update DOM selectors in `use-ai-scraper.ts` to match new structure.

**Q: Can I run multiple scrapers?**
A: Yes, implement a browser pool (see Performance section).

**Q: Is web scraping legal?**
A: Check use.ai's Terms of Service. Generally OK for personal use, not commercial scraping of user content.

---

## 📞 Support

- Check logs: `DEBUG=* npm run dev`
- Browser dev tools: F12 → Network/Console
- Test API directly: `curl` commands above
- Compare with screenshots provided

---

## 📄 License

MIT - Free to use, modify, distribute

---

## 🎉 Next Steps

1. ✅ Complete setup from this guide
2. ✅ Test scraper with sample prompts
3. ✅ Customize UI in ChatApp.tsx
4. ✅ Add authentication if needed
5. ✅ Deploy to production
6. ✅ Monitor and maintain

Good luck! 🚀
