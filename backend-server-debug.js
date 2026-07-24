const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const app = express();

// CORS middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: false
}));

app.use(express.json());

const PORT = 5000;
let browser = null;
let lastScreenshot = null;
let debugLogs = [];
const MAX_LOGS = 100;

function addLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    debugLogs.push(logEntry);
    if (debugLogs.length > MAX_LOGS) {
        debugLogs.shift();
    }
}

async function initBrowser() {
    try {
        browser = await chromium.launch({ 
            headless: false
        });
        addLog('✅ Browser initialized');
    } catch (error) {
        addLog('❌ Browser init failed: ' + error.message);
    }
}

async function takeScreenshot(page) {
    try {
        lastScreenshot = await page.screenshot({ type: 'png' });
    } catch (e) {}
}

async function scrapeFromUseAi(email, prompt, model) {
    addLog('');
    addLog('='.repeat(60));
    addLog('🚀 STARTING SCRAPE PROCESS');
    addLog(`📧 Email: ${email} | 💬 Prompt: ${prompt} | 🤖 Model: ${model}`);
    addLog('='.repeat(60));

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        addLog('📍 STEP 1: Navigating to use.ai');
        await page.goto('https://use.ai', { waitUntil: 'networkidle', timeout: 15000 });
        await takeScreenshot(page);
        addLog('✅ Page loaded');

        addLog('🔐 STEP 2: Looking for Sign In button');
        await page.waitForSelector('button:has-text("Sign in")', { timeout: 5000 });
        await page.click('button:has-text("Sign in")');
        await takeScreenshot(page);
        addLog('✅ Clicked Sign In');

        addLog('📧 STEP 3: Click "Continue with email"');
        await page.waitForSelector('button:has-text("Continue with email")', { timeout: 5000 });
        await page.click('button:has-text("Continue with email")');
        await takeScreenshot(page);
        addLog('✅ Clicked Continue with email');

        addLog('✉️ STEP 4: Entering email');
        await page.waitForSelector('input[type="email"]', { timeout: 5000 });
        await page.fill('input[type="email"]', email);
        await takeScreenshot(page);
        addLog(`✅ Email entered: ${email}`);
        await page.click('button:has-text("Next")');
        await takeScreenshot(page);
        addLog('✅ Clicked Next');

        addLog('⏳ STEP 5: Waiting for chat interface...');
        await page.waitForTimeout(2000);
        await takeScreenshot(page);
        addLog('✅ Chat interface ready');

        addLog('🎯 STEP 6: Checking for upgrade popup');
        const popupExists = await page.locator('button:has-text("✕")').first().isVisible().catch(() => false);
        if (popupExists) {
            addLog('❌ Popup found, closing...');
            await page.click('button:has-text("✕")');
            await takeScreenshot(page);
            addLog('✅ Popup closed');
        } else {
            addLog('✅ No popup found');
        }

        addLog(`🤖 STEP 7: Selecting model: ${model}`);
        const modelBtn = await page.locator('button:has-text("Auto")').first();
        if (await modelBtn.isVisible()) {
            await modelBtn.click();
            await takeScreenshot(page);
            addLog('✅ Model dropdown opened');
            await page.waitForTimeout(500);
            const modelOption = await page.locator(`text="${model}"`).first();
            if (await modelOption.isVisible()) {
                await modelOption.click();
                await takeScreenshot(page);
                addLog(`✅ Selected model: ${model}`);
            } else {
                addLog(`⚠️ Model not found`);
            }
        }

        addLog('📝 STEP 8: Entering prompt');
        await page.waitForTimeout(2000);
        let inputSelector = null;
        const selectors = ['textarea', 'input[type="text"]', '[contenteditable="true"]', '[role="textbox"]'];
        for (const selector of selectors) {
            try {
                if (await page.locator(selector).first().isVisible().catch(() => false)) {
                    inputSelector = selector;
                    break;
                }
            } catch (e) {}
        }
        if (!inputSelector) throw new Error('Input field not found');
        
        const textbox = await page.locator(inputSelector).first();
        await textbox.click();
        await page.waitForTimeout(500);
        await textbox.fill(prompt);
        await takeScreenshot(page);
        addLog(`✅ Prompt entered`);

        addLog('🚀 STEP 9: Sending message');
        await textbox.press('Enter');
        await takeScreenshot(page);
        addLog('✅ Message sent');

        addLog('⏳ STEP 10: Waiting for response...');
        let response = '';
        for (let i = 0; i < 60; i++) {
            await page.waitForTimeout(500);
            try {
                const articles = await page.locator('[role="article"]').all();
                if (articles.length > 1) {
                    response = await articles[articles.length - 1].textContent();
                    if (response && response.trim().length > 50) {
                        await takeScreenshot(page);
                        addLog(`✅ Response detected`);
                        break;
                    }
                }
            } catch (e) {}
            if (i % 6 === 0) addLog(`  ⏳ Waiting... (${(i + 1) * 0.5}s)`);
        }

        if (!response) throw new Error('Response timeout');

        addLog('✅ SCRAPE COMPLETE!');
        await context.close();
        return response;

    } catch (error) {
        addLog('❌ ERROR: ' + error.message);
        await takeScreenshot(page);
        await context.close();
        throw error;
    }
}

// Debug Dashboard
app.get('/debug', (req, res) => {
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>use.ai Scraper - Debug</title>
    <style>
        body { font-family: monospace; background: #1e1e1e; color: #0f0; margin: 0; padding: 20px; }
        .container { max-width: 1400px; margin: 0 auto; }
        h1 { border-bottom: 2px solid #0f0; padding-bottom: 10px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
        .panel { background: #2d2d2d; border: 1px solid #0f0; padding: 15px; border-radius: 5px; }
        .screenshot { width: 100%; border: 1px solid #0f0; background: #000; }
        .logs { height: 500px; overflow-y: auto; background: #000; border: 1px solid #0f0; padding: 10px; border-radius: 3px; }
        .log-entry { margin: 2px 0; font-size: 11px; word-wrap: break-word; }
        h2 { margin-top: 0; color: #0f0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Debug Dashboard - use.ai Scraper</h1>
        <div class="grid">
            <div class="panel">
                <h2>📸 Browser Screenshot</h2>
                <img id="screenshot" class="screenshot" src="/debug/screenshot?t=0" alt="Waiting...">
            </div>
            <div class="panel">
                <h2>📋 Live Logs</h2>
                <div class="logs" id="logs">Waiting...</div>
            </div>
        </div>
    </div>
    <script>
        setInterval(() => {
            fetch('/debug/logs').then(r => r.json()).then(data => {
                document.getElementById('logs').innerHTML = data.logs
                    .map(log => \`<div class="log-entry">\${log.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>\`)
                    .join('');
                document.getElementById('logs').scrollTop = document.getElementById('logs').scrollHeight;
            });
            document.getElementById('screenshot').src = '/debug/screenshot?t=' + Date.now();
        }, 1000);
    </script>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

app.get('/debug/logs', (req, res) => {
    res.json({ logs: debugLogs });
});

app.get('/debug/screenshot', (req, res) => {
    res.setHeader('Content-Type', 'image/png');
    if (lastScreenshot) {
        res.send(lastScreenshot);
    } else {
        res.send(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));
    }
});

// API Endpoints
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/api/scrape', async (req, res) => {
    const { prompt, model, email } = req.body;

    if (!prompt || !email) {
        return res.status(400).json({ success: false, error: 'Missing prompt or email' });
    }

    try {
        if (!browser) {
            throw new Error('Browser not initialized');
        }

        const startTime = Date.now();
        const response = await scrapeFromUseAi(email, prompt, model || 'Auto');
        const duration = Date.now() - startTime;

        res.json({
            success: true,
            data: {
                response: response.trim(),
                model: model || 'Auto',
                duration,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        addLog('API Error: ' + error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

async function start() {
    await initBrowser();
    app.listen(PORT, () => {
        addLog('');
        addLog('='.repeat(60));
        addLog('🚀 API SERVER RUNNING');
        addLog(`📍 URL: http://localhost:${PORT}`);
        addLog(`🔍 Debug: http://localhost:${PORT}/debug`);
        addLog(`📤 API: POST http://localhost:${PORT}/api/scrape`);
        addLog('='.repeat(60));
        addLog('');
    });
}

process.on('SIGINT', async () => {
    addLog('\nShutting down...');
    if (browser) await browser.close();
    process.exit(0);
});

start().catch(console.error);
