@echo off
title use.ai Scraper - Setup

echo.
echo ========================================
echo   use.ai Scraper - Complete Setup
echo ========================================
echo.

REM Create backend folder
echo [1/5] Creating folders...
if not exist "backend" mkdir backend
if not exist "frontend" mkdir frontend
cd backend

REM Initialize backend
echo [2/5] Installing backend dependencies...
call npm init -y > nul 2>&1
call npm install express cors dotenv playwright > nul 2>&1
call npm install -D typescript @types/express @types/node ts-node > nul 2>&1

REM Create backend file
echo [3/5] Creating backend files...
(
echo const express = require('express');
echo const cors = require('cors');
echo const { chromium } = require('playwright');
echo const app = express();
echo app.use(cors());
echo app.use(express.json());
echo const PORT = 5000;
echo let browser = null;
echo async function initBrowser() {
echo   browser = await chromium.launch({ headless: false });
echo }
echo initBrowser();
echo app.post('/api/scrape', async (req, res) => {
echo   const { prompt, model, email } = req.body;
echo   console.log('[API] Received:', { prompt, model, email });
echo   try {
echo     const context = await browser.newContext();
echo     const page = await context.newPage();
echo     console.log('[Scraper] Opening use.ai...');
echo     await page.goto('https://use.ai', { waitUntil: 'networkidle' });
echo     console.log('[Scraper] Clicking Sign In...');
echo     await page.click('button:has-text("Sign in")');
echo     console.log('[Scraper] Waiting for email input...');
echo     await page.waitForSelector('input[type="email"]', { timeout: 5000 });
echo     console.log('[Scraper] Filling email: ' + email);
echo     await page.fill('input[type="email"]', email);
echo     await page.click('button:has-text("Continue")');
echo     console.log('[Scraper] Waiting for chat interface...');
echo     await page.waitForSelector('[role="textbox"]', { timeout: 10000 });
echo     console.log('[Scraper] Selecting model: ' + model);
echo     await page.click('button:has-text("Auto")');
echo     await page.click(`text=${model}`);
echo     console.log('[Scraper] Typing prompt: ' + prompt);
echo     await page.fill('[role="textbox"]', prompt);
echo     await page.press('[role="textbox"]', 'Enter');
echo     console.log('[Scraper] Waiting for response...');
echo     await page.waitForSelector('[role="article"]', { timeout: 30000 });
echo     const response = await page.evaluate(() => {
echo       const msgs = document.querySelectorAll('[role="article"]');
echo       return msgs[msgs.length - 1]?.textContent || 'No response';
echo     });
echo     console.log('[Scraper] Got response:', response.substring(0, 100));
echo     await context.close();
echo     res.json({ success: true, data: { response, model } });
echo   } catch (error) {
echo     console.error('[ERROR]', error.message);
echo     res.status(500).json({ success: false, error: error.message });
echo   }
echo });
echo app.listen(PORT, () => console.log(`[SERVER] Running on http://localhost:${PORT}`));
) > server.js

REM Copy frontend
echo [4/5] Setting up frontend...
cd ..
copy index.html frontend\index.html > nul 2>&1

REM Start servers
echo [5/5] Starting servers...
echo.
echo ========================================
echo   BACKEND STARTING...
echo ========================================
echo Open another terminal and run: npm start --prefix frontend
echo Then open: http://localhost:3000
echo.

cd backend
node server.js
