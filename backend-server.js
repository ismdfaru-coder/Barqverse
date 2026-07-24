const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], credentials: false }));
app.use(express.json());

const PORT = 5000;
let browser = null;
let lastScreenshot = null;
let debugLogs = [];

function addLog(msg) {
    const time = new Date().toLocaleTimeString();
    const entry = `[${time}] ${msg}`;
    console.log(entry);
    debugLogs.push(entry);
    if (debugLogs.length > 150) debugLogs.shift();
}

async function initBrowser() {
    browser = await chromium.launch({ headless: false });
    addLog('✅ Browser ready');
}

async function shot(page) {
    try { lastScreenshot = await page.screenshot({ type: 'png' }); } catch(e) {}
}

async function scrape(email, prompt, model, retryCount = 0) {
    addLog('');
    addLog('═'.repeat(70));
    if (retryCount > 0) addLog(`🔄 RETRY #${retryCount} | Email: ${email} | Prompt: ${prompt} | Model: ${model}`);
    else addLog(`🚀 START | Email: ${email} | Prompt: ${prompt} | Model: ${model}`);
    addLog('═'.repeat(70));

    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    try {
        addLog('\n📍 STEP 1: Navigate to use.ai');
        await page.goto('https://use.ai', { waitUntil: 'load', timeout: 20000 });
        await shot(page);
        addLog('✅ Loaded');

        addLog('\n🔐 STEP 2: Click Sign in');
        await page.waitForSelector('button:has-text("Sign in")', { timeout: 5000 });
        await page.click('button:has-text("Sign in")');
        addLog('✅ Sign In clicked');

        addLog('\n📧 STEP 3: Click Continue with email (immediately after)');
        await page.waitForSelector('button:has-text("Continue with email")', { timeout: 5000 });
        await page.click('button:has-text("Continue with email")');
        await page.waitForTimeout(300);
        await shot(page);
        addLog('✅ Continue with email clicked');

        addLog('\n✉️ STEP 4: Enter email');
        await page.waitForSelector('input[type="email"]', { timeout: 5000 });
        await page.fill('input[type="email"]', email);
        await page.waitForTimeout(300);
        await shot(page);
        addLog(`✅ Email: ${email}`);

        addLog('\n👆 STEP 5: Click ONLY "Continue" button (bottom)');
        // Wait for Continue button to be visible and clickable
        const continueBtn = page.locator('button:has-text("Continue")').last();
        await continueBtn.waitFor({ state: 'visible', timeout: 5000 });
        await continueBtn.click();
        addLog('✅ Continue button clicked');

        // Immediately try to bypass paywall by navigating with paywall flag
        try {
            addLog('\n🔁 Attempting paywall bypass via query param');
            await page.goto('https://use.ai/?paywall=false', { waitUntil: 'networkidle', timeout: 5000 }).catch(() => null);
            await page.waitForTimeout(500);
            await shot(page);
            const body = await page.evaluate(() => document.body.innerText);
            if (/Upgrade to PRO|Upgrade|Go Pro|pricing|payment/i.test(body)) {
                addLog('⚠️ Bypass param did not remove paywall');
            } else {
                addLog('✅ Navigated to paywall=false URL (paywall bypass may have worked)');
            }
        } catch (e) {
            addLog(`⚠️ Error during paywall bypass navigation: ${e.message}`);
        }

        addLog('\n⏳ STEP 6: Check for "Check your email" (immediate check)');
        await page.waitForTimeout(300);
        await shot(page);
        
        // Check if "Check your email" message appears - immediate check, no long wait
        const pageText = await page.evaluate(() => document.body.innerText);
        if (pageText.includes('Check your email')) {
            addLog('⚠️ "Check your email" detected! Retrying immediately...');
            await ctx.close();
            const maxRetries = 10;
            if (retryCount < maxRetries) {
                // Generate a slightly different email for retry: insert a random char before the @
                const makeRetryEmail = (origEmail) => {
                    try {
                        const parts = origEmail.split('@');
                        const local = parts[0];
                        const domain = parts[1] || '';
                        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
                        const rand = chars[Math.floor(Math.random() * chars.length)];
                        // Ensure variation by appending '.' + rand + retryCount
                        return `${local}.${rand}${retryCount}@${domain}`;
                    } catch (e) {
                        return origEmail;
                    }
                };
                const newEmail = makeRetryEmail(email);
                addLog(`🔁 Retrying with email: ${newEmail}`);
                return await scrape(newEmail, prompt, model, retryCount + 1);
            } else {
                addLog(`❌ Max retries (${maxRetries}) reached. Giving up.`);
                throw new Error('Max retries exceeded: Check your email keeps appearing');
            }
        }
        addLog('✅ No email verification check');

        addLog('\n🎯 STEP 7: Close popup if exists (enhanced)');
        try {
            // More aggressive popup detection and closing
            const allButtons = await page.locator('button').all();
            let popupClicked = false;
            
            for (const btn of allButtons) {
                try {
                    const txt = await btn.textContent().catch(() => '');
                    const ariaLabel = await btn.getAttribute('aria-label').catch(() => '');
                    const title = await btn.getAttribute('title').catch(() => '');
                    const isVisible = await btn.isVisible({ timeout: 300 }).catch(() => false);
                    
                    if (isVisible && (txt.includes('Close') || txt.includes('×') || txt.includes('✕') ||
                        ariaLabel?.includes('close') || title?.includes('Close'))) {
                        await btn.click();
                        await page.waitForTimeout(500);
                        popupClicked = true;
                        addLog(`✅ Popup closed via button`);
                        break;
                    }
                } catch(e) { }
            }
            
            if (!popupClicked) {
                // Try pressing Escape
                await page.keyboard.press('Escape');
                await page.waitForTimeout(300);
                popupClicked = true;
                addLog('✅ Sent Escape to close popup');
            }
            
            await shot(page);
        } catch(e) { addLog(`⚠️ Error closing popup: ${e.message}`); }

        addLog(`\n🤖 STEP 8: Select model (${model})`);
        if (model && model !== 'Auto') {
            try {
                const mbtn = await page.locator('button:has-text("Auto")').first();
                if (await mbtn.isVisible({ timeout: 1500 }).catch(() => false)) {
                    await mbtn.click();
                    await page.waitForTimeout(300);
                    const mopt = await page.locator(`text="${model}"`).first();
                    if (await mopt.isVisible({ timeout: 1500 }).catch(() => false)) {
                        await mopt.click();
                        await page.waitForTimeout(300);
                        await shot(page);
                        addLog(`✅ Selected: ${model}`);
                    } else addLog(`⚠️ Model not found`);
                } else addLog('⚠️ Selector not found');
            } catch(e) { addLog(`⚠️ Error: ${e.message}`); }
        } else addLog('✅ Using Auto');

        addLog('\n💬 STEP 9: Chat interface ready');
        addLog('✅ Ready');

        addLog('\n📝 STEP 10: Fill prompt input');
        const sels = ['textarea[placeholder*="message" i]', 'textarea[placeholder*="prompt" i]', 'input[placeholder*="message" i]', 'textarea', 'input[type="text"]'];
        let inp = null;
        for (const sel of sels) {
            try {
                const e = await page.locator(sel).first();
                if (await e.isVisible({ timeout: 1000 }).catch(() => false)) {
                    inp = e;
                    addLog(`✅ Found: ${sel}`);
                    break;
                }
            } catch(e) {}
        }
        if (!inp) { await shot(page); throw new Error('Input not found'); }
        await inp.click();
        await page.waitForTimeout(200);
        await inp.fill(prompt);
        await shot(page);
        addLog(`✅ Filled`);

        addLog('\n🚀 STEP 11: Send (Enter)');
        await inp.press('Enter');
        await shot(page);
        addLog('✅ Sent - monitoring for response completion');

        let resp = '';

        try {
            // First: Wait for response text to stabilize (answer streaming complete)
            addLog('⏳ Waiting for answer to complete streaming - monitoring text stability...');
            let lastLen = 0;
            let stableCount = 0;
            let checkCount = 0;
            const maxChecks = 240; // 2 minutes max
            
            while (stableCount < 4 && checkCount < maxChecks) { // 4 checks = ~2 seconds at 500ms intervals
                await page.waitForTimeout(500);
                const currentResp = await page.evaluate(() => document.body.innerText);
                if (currentResp.length === lastLen) {
                    stableCount++;
                } else {
                    stableCount = 0;
                }
                lastLen = currentResp.length;
                checkCount++;
            }
            addLog('✅ Answer streaming complete - text is stable!');
            
            // Second: Now check for like/dislike buttons at bottom of response (final confirmation)
            addLog('⏳ Waiting for like/dislike buttons to appear at bottom of answer...');
            try {
                await page.waitForSelector('button[aria-label*="like" i], button[aria-label*="dislike" i], button[title*="Like" i], button[title*="Dislike" i], [data-testid*="like"], [data-testid*="dislike"]', { 
                    timeout: 10000 // 10 second timeout to find like/dislike buttons
                });
                addLog('✅ Like/Dislike buttons found - answer is fully complete!');
            } catch (e) {
                addLog('⚠️ Like/Dislike buttons not found, but answer text is stable - proceeding with extraction');
            }
            
            await shot(page);
            
        } catch (e) {
            addLog(`⚠️ Error: ${e.message}`);
        }

        // STEP 12: Extract sources from right panel
        let sources = [];
        addLog('\n📚 STEP 12: Extracting sources from right panel');
        try {
            // Look for sources button/indicator in right panel (N Sources)
            const sourcesBtn = await page.locator('button:has-text("Source"), [aria-label*="source" i]').first();
            if (sourcesBtn) {
                addLog('📍 Found sources button - clicking...');
                await sourcesBtn.click();
                await page.waitForTimeout(1000);
                addLog('✅ Sources panel opened');

                // Scroll to bottom of sources panel to load all sources
                const totalSources = await page.evaluate(async () => {
                    const panel = document.querySelector('[class*="source"], [aria-label*="source" i]')?.parentElement;
                    if (!panel) return 0;
                    
                    let scrollTop = 0;
                    let previousHeight = 0;
                    let attempts = 0;
                    
                    while (attempts < 20) {
                        panel.scrollTop = panel.scrollHeight;
                        await new Promise(r => setTimeout(r, 300));
                        
                        if (panel.scrollHeight === previousHeight) break;
                        previousHeight = panel.scrollHeight;
                        attempts++;
                    }
                    
                    return document.querySelectorAll('a[href*="http"]').length;
                });
                
                addLog(`📍 Total source elements found: ${totalSources}`);
                await page.waitForTimeout(500);
                await shot(page);

                // Extract all URLs from sources panel
                const urls = await page.evaluate(() => {
                    const sources = [];
                    document.querySelectorAll('a[href]').forEach(link => {
                        const href = link.getAttribute('href');
                        if (href && (href.startsWith('http') || href.startsWith('www'))) {
                            const text = link.textContent.trim();
                            sources.push({ 
                                url: href, 
                                title: text || new URL(href).hostname 
                            });
                        }
                    });
                    // Remove duplicates
                    return sources.filter((s, i, arr) => arr.findIndex(x => x.url === s.url) === i);
                });

                sources = urls;
                addLog(`✅ Extracted ${sources.length} unique source URLs`);
                sources.slice(0, 5).forEach((s, i) => addLog(`   ${i + 1}. ${s.title.substring(0, 50)}`));
                if (sources.length > 5) addLog(`   ... and ${sources.length - 5} more`);
            } else {
                addLog('ℹ️ No sources panel found');
            }
        } catch (e) {
            addLog(`⚠️ Sources error: ${e.message}`);
        }

        // Extract response from page
        resp = await page.evaluate(() => document.body.innerText);
        
        // Clean up response - remove unwanted elements
        resp = resp.trim();
        
        // Remove cookie notice
        resp = resp.replace(/We use cookies.*?Accept/gis, '');
        resp = resp.replace(/Reject\s+Accept/gi, '');
        
        // Remove "Sign in" button area
        resp = resp.replace(/Sign in/gi, '');
        
        // Remove the user's prompt from the response (don't show duplicate)
        resp = resp.replace(new RegExp(prompt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '');
        
        // Remove model selector and duplicates
        resp = resp.replace(/Auto\s+Auto/gi, '');
        resp = resp.replace(/Auto\s+Sonnet 5\s+Fable 5/gi, '');
        resp = resp.replace(/Model:/gi, '');
        resp = resp.replace(/^(Auto|Sonnet 5|Fable 5|GPT-5\.6 Terra|Gemini 3\.1 Pro)\s*\n/gim, '');
        resp = resp.replace(/^(Auto|Sonnet 5|Fable 5|GPT-5\.6 Terra|Gemini 3\.1 Pro)$/gim, '');
        
        // Clean up excessive whitespace
        resp = resp.replace(/\n\s*\n\s*\n/g, '\n\n');
        resp = resp.replace(/^\s+/gm, '');
        
        if (resp.length > 5000) {
            resp = resp.substring(0, 5000) + '...';
        }
        
        addLog(`✅ Extracted ${resp.length} chars`);
        addLog('\n✅ COMPLETE');

        addLog('═'.repeat(70));
        await ctx.close();
        return { response: resp.trim(), sources };

    } catch(err) {
        addLog(`\n❌ ERROR: ${err.message}`);
        addLog('═'.repeat(70));
        await shot(page);
        await ctx.close();
        throw err;
    }
}

app.get('/debug', (req, res) => {
    const html = `<!DOCTYPE html>
<html><head><title>Debug</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:monospace;background:#0a0e27;color:#0f0;padding:20px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px}@media(max-width:768px){.grid{grid-template-columns:1fr}}.panel{background:#1a1f3a;border:2px solid #0f0;padding:15px;border-radius:5px}.screenshot{width:100%;border:1px solid #0f0;background:#000}.logs{height:600px;overflow-y:auto;background:#000;border:1px solid #0f0;padding:10px}.log-entry{margin:2px 0;font-size:12px;word-wrap:break-word}h1,h2{color:#0f0}h1{border-bottom:2px solid #0f0;padding-bottom:10px}</style></head><body><div style="max-width:1400px;margin:0 auto"><h1>🚀 Debug Dashboard</h1><div class="grid"><div class="panel"><h2>📸 Browser</h2><img id="screenshot" class="screenshot" src="/debug/screenshot"></div><div class="panel"><h2>📋 Logs</h2><div class="logs" id="logs"></div></div></div></div><script>setInterval(()=>{fetch('/debug/logs').then(r=>r.json()).then(d=>{document.getElementById('logs').innerHTML=d.logs.map(l=>'<div class="log-entry">'+l.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</div>').join('');document.getElementById('logs').scrollTop=document.getElementById('logs').scrollHeight});document.getElementById('screenshot').src='/debug/screenshot?t='+Date.now()},500)</script></body></html>`;
    res.setHeader('Content-Type','text/html');
    res.send(html);
});

app.get('/debug/logs', (req, res) => res.json({ logs: debugLogs }));

app.get('/debug/screenshot', (req, res) => {
    res.setHeader('Content-Type', 'image/png');
    res.send(lastScreenshot || Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/scrape', async (req, res) => {
    const { prompt, model, email } = req.body;
    if (!prompt || !email) return res.status(400).json({ success: false, error: 'Missing data' });
    try {
        const start = Date.now();
        const result = await scrape(email, prompt, model || 'Auto');
        const duration = Date.now() - start;
        res.json({ success: true, data: { response: result.response, sources: result.sources, model: model || 'Auto', duration, timestamp: new Date().toISOString() } });
    } catch(err) {
        addLog(`API Error: ${err.message}`);
        res.status(500).json({ success: false, error: err.message });
    }
});

async function start() {
    await initBrowser();
    app.listen(PORT, () => {
        addLog('═'.repeat(70));
        addLog('🌐 SERVER STARTED');
        addLog(`📍 http://localhost:${PORT}/debug`);
        addLog('═'.repeat(70));
    });
}

process.on('SIGINT', async () => { addLog('Shutdown'); if (browser) await browser.close(); process.exit(0); });
start().catch(console.error);
