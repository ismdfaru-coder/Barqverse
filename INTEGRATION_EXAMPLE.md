/**
 * INTEGRATION EXAMPLE - Complete Working Setup
 * Shows how to put all pieces together
 */

// ============================================
// 1. ENVIRONMENT SETUP (.env)
// ============================================
/*
PORT=5000
HOST=localhost
NODE_ENV=development
USE_AI_EMAIL=your-email@gmail.com
FRONTEND_URL=http://localhost:3000
SCRAPER_TIMEOUT=30000
SCRAPER_RETRIES=3
HEADLESS=true
*/

// ============================================
// 2. BACKEND - Create backend/app.ts
// ============================================
/*
import express from 'express';
import UseAiScraper from './use-ai-scraper';

const app = express();
const PORT = process.env.PORT || 5000;

// [Include backend-api.ts code here]
// Then: npm install && npm run dev
*/

// ============================================
// 3. FRONTEND - Create frontend/src/App.tsx
// ============================================
/*
import React from 'react';
import ChatApp from './ChatApp';
import './ChatApp.css';

function App() {
  return <ChatApp />;
}

export default App;

// Then: npm install && npm start
*/

// ============================================
// 4. TESTING - Manual Flow Test
// ============================================

const testIntegration = async () => {
  console.log('🧪 Integration Test\n');

  // Test 1: Check backend health
  console.log('1️⃣  Testing backend health...');
  try {
    const healthRes = await fetch('http://localhost:5000/api/health');
    const health = await healthRes.json();
    console.log('✅ Backend is running');
    console.log(`   Uptime: ${health.uptime.toFixed(2)}s\n`);
  } catch (error) {
    console.error('❌ Backend not running!');
    console.error('   Run: cd backend && npm run dev\n');
    return;
  }

  // Test 2: Check available models
  console.log('2️⃣  Fetching available models...');
  try {
    const modelsRes = await fetch('http://localhost:5000/api/models');
    const models = await modelsRes.json();
    console.log('✅ Models available:');
    models.models.forEach((m: string) => console.log(`   - ${m}`));
    console.log();
  } catch (error) {
    console.error('❌ Failed to fetch models\n');
    return;
  }

  // Test 3: Send test scrape request
  console.log('3️⃣  Sending test scrape request...');
  console.log('   Prompt: "What is artificial intelligence?"');
  console.log('   Model: Fable 5');
  console.log('   Email: test@example.com\n');

  try {
    const scrapeRes = await fetch('http://localhost:5000/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'What is artificial intelligence?',
        model: 'Fable 5',
        email: 'test@example.com',
      }),
    });

    if (!scrapeRes.ok) {
      const error = await scrapeRes.json();
      throw new Error(error.error);
    }

    const result = await scrapeRes.json();

    if (result.success) {
      console.log('✅ Scrape successful!');
      console.log(`   Duration: ${result.data.duration}ms`);
      console.log(`   Response length: ${result.data.response.length} chars`);
      console.log(`   First 100 chars: ${result.data.response.substring(0, 100)}...\n`);
    } else {
      console.error(`❌ Scrape failed: ${result.error}\n`);
    }
  } catch (error) {
    const err = error as Error;
    console.error(`❌ Error: ${err.message}`);
    console.error('   Make sure:');
    console.error('   1. Backend is running (npm run dev)');
    console.error('   2. Email in .env matches your use.ai account');
    console.error('   3. Browser can access use.ai website\n');
  }

  // Test 4: Check frontend
  console.log('4️⃣  Checking frontend...');
  try {
    const frontendRes = await fetch('http://localhost:3000', {
      method: 'HEAD',
    });
    if (frontendRes.ok) {
      console.log('✅ Frontend is running at http://localhost:3000\n');
    }
  } catch {
    console.log('⚠️  Frontend not running yet');
    console.log('   Run: cd frontend && npm start\n');
  }

  console.log('🎉 Integration test complete!');
  console.log('   Now:');
  console.log('   1. Open http://localhost:3000 in your browser');
  console.log('   2. Enter your email (from .env USE_AI_EMAIL)');
  console.log('   3. Type a prompt and send');
  console.log('   4. See response appear in chat!');
};

// Run test
testIntegration();

// ============================================
// 5. TROUBLESHOOTING CHECKLIST
// ============================================
/*
Before running integration test, verify:

☐ Node.js 18+ installed
   → node --version

☐ npm packages installed
   → cd backend && npm install
   → cd frontend && npm install

☐ Playwright browsers installed
   → npx playwright install

☐ Environment variables set
   → Create backend/.env
   → Add: USE_AI_EMAIL=your@email.com

☐ Backend can start
   → cd backend && npm run dev
   → Should see: ✅ Server running at http://localhost:5000

☐ Frontend can start
   → cd frontend && npm start
   → Should see: Compiled successfully!

☐ use.ai website accessible
   → Open https://use.ai in browser
   → Should load normally

☐ Login works on use.ai
   → Try logging in manually with your email
   → Complete email verification if needed

☐ Port 5000 is available
   → sudo lsof -i :5000 (on Mac/Linux)
   → netstat -ano | findstr :5000 (on Windows)

If any check fails, the integration won't work!
*/

// ============================================
// 6. DEPLOYMENT CHECKLIST
// ============================================
/*
Before deploying to production:

Backend:
☐ Set NODE_ENV=production
☐ Use strong JWT secret
☐ Enable HTTPS
☐ Add database
☐ Set up Redis cache
☐ Configure rate limiting
☐ Add error tracking (Sentry)
☐ Set up monitoring

Frontend:
☐ Build optimized bundle (npm run build)
☐ Set correct API_URL for production
☐ Enable compression
☐ Add CDN
☐ Set up analytics

Deployment options:
→ Docker + AWS/GCP/Azure
→ Railway.app (easiest)
→ Heroku
→ DigitalOcean
→ Self-hosted VPS

See ADVANCED_FEATURES.md for production setup!
*/

// ============================================
// 7. PERFORMANCE OPTIMIZATION
// ============================================
/*
To optimize for production:

1. Browser Pool
   → Reuse browser instances
   → Handle concurrent requests
   → Reduce memory usage

2. Response Caching
   → Cache identical prompts
   → 5-minute TTL
   → Use Redis

3. Queue System
   → Bull or RabbitMQ
   → Handle spike traffic
   → Async processing

4. Load Balancing
   → Multiple backend instances
   → NGINX reverse proxy
   → Health checks

5. Monitoring
   → Prometheus metrics
   → Sentry error tracking
   → Real-time alerts

6. Database
   → Log all requests
   → Track usage patterns
   → User analytics

See ADVANCED_FEATURES.md for code examples!
*/

// ============================================
// 8. COMMON ERRORS & FIXES
// ============================================
/*
ERROR: "Cannot find module 'playwright'"
FIX: npm install && npx playwright install

ERROR: "Port 5000 already in use"
FIX: Change PORT in .env or kill process on port 5000

ERROR: "CORS error from frontend"
FIX: Check FRONTEND_URL in backend .env matches frontend URL

ERROR: "Email check modal stuck"
FIX: Increase SCRAPER_TIMEOUT=60000 in .env

ERROR: "Response extraction fails"
FIX: DOM selectors may need updating - check use.ai page structure

ERROR: "Cannot connect to use.ai"
FIX: Check internet connection, try VPN, check if site is blocked

ERROR: "Browser launch fails"
FIX: npm install && npx playwright install-deps

ERROR: "Rate limit error after 10 requests"
FIX: This is expected - wait 1 minute or increase RATE_LIMIT_MAX in .env

For more help: Check SETUP_GUIDE.md troubleshooting section
*/

export { testIntegration };
