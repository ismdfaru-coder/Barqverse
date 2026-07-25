const path = require('path');
const fs = require('fs');

// Prefer project-local Chromium so Cursor sandbox env overrides do not break launches.
const LOCAL_BROWSERS_PATH = path.join(__dirname, '.playwright-browsers');
const BROWSERS_PATH = fs.existsSync(path.join(LOCAL_BROWSERS_PATH, 'chromium-1228', 'chrome-win64', 'chrome.exe'))
    ? LOCAL_BROWSERS_PATH
    : (process.env.PLAYWRIGHT_BROWSERS_PATH || LOCAL_BROWSERS_PATH);
process.env.PLAYWRIGHT_BROWSERS_PATH = BROWSERS_PATH;

function findChromeIn(browsersPath) {
    const direct = path.join(browsersPath, 'chromium-1228', 'chrome-win64', 'chrome.exe');
    if (fs.existsSync(direct)) return direct;

    try {
        const entries = fs.readdirSync(browsersPath, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory() || !entry.name.startsWith('chromium-')) continue;
            const candidate = path.join(browsersPath, entry.name, 'chrome-win64', 'chrome.exe');
            if (fs.existsSync(candidate)) return candidate;
        }
    } catch (e) {}

    return null;
}

function getChromiumExecutable() {
    return findChromeIn(LOCAL_BROWSERS_PATH)
        || findChromeIn(BROWSERS_PATH)
        || findChromeIn(process.env.PLAYWRIGHT_BROWSERS_PATH || '');
}

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
    let executablePath = getChromiumExecutable();
    if (!executablePath) {
        try {
            const fromPlaywright = chromium.executablePath();
            if (fromPlaywright && fs.existsSync(fromPlaywright)) {
                executablePath = fromPlaywright;
            }
        } catch (e) {}
    }
    if (!executablePath) {
        throw new Error(
            'Chromium not found. From project folder run: npm run playwright:install'
        );
    }

    browser = await chromium.launch({
        headless: false,
        executablePath,
        args: ['--disable-background-networking', '--disable-extensions', '--disable-sync']
    });
    addLog('✅ Browser ready');
}

async function clickEmailContinue(page) {
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.click();

    const candidates = [
        page.locator('form:has(input[type="email"]) button').filter({ hasText: /^Continue$/i }).last(),
        page.locator('[role="dialog"] button').filter({ hasText: /^Continue$/i }).last(),
        page.locator('button').filter({ hasText: /^Continue$/i }).last()
    ];

    for (const btn of candidates) {
        if (await btn.count() === 0) continue;
        try {
            await btn.waitFor({ state: 'visible', timeout: 3000 });
            await btn.scrollIntoViewIfNeeded();
            await btn.click({ timeout: 5000, force: true, noWaitAfter: true });
            return 'button';
        } catch (e) {
            continue;
        }
    }

    await emailInput.focus();
    await emailInput.press('Enter', { noWaitAfter: true });
    return 'enter';
}

async function waitForAccountCreated(page, timeoutMs = 20000) {
    await page.waitForFunction(
        () => /Account created successfully/i.test(document.body.innerText),
        { timeout: timeoutMs }
    );
}

const MODEL_NAMES = ['Auto', 'Fable 5', 'Sonnet 5', 'Claude 3.5', 'GPT-5.6 Terra', 'Gemini 3.1 Pro'];

async function findModelDropdown(page) {
    await page.waitForSelector('textarea, [role="textbox"]', { timeout: 15000 });

    const chatInput = page.locator('textarea, [role="textbox"]').first();
    const chatArea = chatInput.locator('xpath=ancestor::*[self::form or self::div][position()<=6]').last();

    for (const name of MODEL_NAMES) {
        const inChat = chatArea.locator('button').filter({ hasText: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).first();
        if (await inChat.count() > 0 && await inChat.isVisible({ timeout: 500 }).catch(() => false)) {
            return inChat;
        }
    }

    for (const name of MODEL_NAMES) {
        const btn = page.locator('button').filter({ hasText: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).first();
        if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
            return btn;
        }
    }

    const ariaDropdown = page.locator('button[aria-haspopup="listbox"], button[aria-haspopup="menu"], [role="combobox"]').first();
    if (await ariaDropdown.isVisible({ timeout: 1000 }).catch(() => false)) {
        return ariaDropdown;
    }

    return page.locator('button:has-text("Auto")').first();
}

async function selectChatModel(page, model) {
    const targetModel = (model || 'Auto').trim();
    addLog(`\n🤖 STEP 10: Open chat model dropdown and select "${targetModel}"`);

    const dropdownBtn = await findModelDropdown(page);
    await dropdownBtn.waitFor({ state: 'visible', timeout: 8000 });
    await dropdownBtn.scrollIntoViewIfNeeded();

    const currentLabel = (await dropdownBtn.textContent().catch(() => '')).trim();
    addLog(`📍 Current model button: "${currentLabel || 'unknown'}"`);

    if (currentLabel.toLowerCase() === targetModel.toLowerCase()) {
        addLog(`✅ Already on ${targetModel}`);
        await shot(page);
        return targetModel;
    }

    await dropdownBtn.click({ timeout: 5000, noWaitAfter: true });
    await shot(page);
    addLog('✅ Opened model dropdown');

    const escaped = targetModel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const optionLocators = [
        page.locator('[role="menuitem"]').filter({ hasText: new RegExp(`^${escaped}$`, 'i') }),
        page.locator('[role="option"]').filter({ hasText: new RegExp(`^${escaped}$`, 'i') }),
        page.locator('[role="listbox"] button, [role="menu"] button, [role="listbox"] [role="option"], [role="menu"] [role="menuitem"]')
            .filter({ hasText: new RegExp(`^${escaped}$`, 'i') }),
        page.locator('li, div, span, button').filter({ hasText: new RegExp(`^${escaped}$`, 'i') })
    ];

    let selected = false;
    for (const options of optionLocators) {
        const count = await options.count();
        for (let i = 0; i < count; i++) {
            const opt = options.nth(i);
            try {
                await opt.waitFor({ state: 'visible', timeout: 2000 });
                await opt.scrollIntoViewIfNeeded();
                await opt.click({ timeout: 3000, noWaitAfter: true });
                selected = true;
                addLog(`✅ Clicked option: ${targetModel}`);
                break;
            } catch (e) {
                continue;
            }
        }
        if (selected) break;
    }

    if (!selected) {
        throw new Error(`Could not find model option "${targetModel}" in dropdown`);
    }

    await shot(page);

    const verified = await page.evaluate((wanted) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
            const text = btn.textContent?.trim() || '';
            if (text.toLowerCase() === wanted.toLowerCase()) {
                const rect = btn.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) return text;
            }
        }
        return null;
    }, targetModel);

    if (verified) {
        addLog(`✅ Verified model selected: ${verified}`);
        return verified;
    }

    addLog(`⚠️ Could not verify "${targetModel}" on button, continuing anyway`);
    return targetModel;
}

async function shot(page) {
    try { lastScreenshot = await page.screenshot({ type: 'png' }); } catch (e) {}
}

async function scrape(email, prompt, model, retryCount = 0) {
    addLog('');
    addLog('═'.repeat(70));
    if (retryCount > 0) addLog(`🔄 RETRY #${retryCount} | Email: ${email} | Prompt: ${prompt} | Model: ${model}`);
    else addLog(`🚀 START | Email: ${email} | Prompt: ${prompt} | Model: ${model}`);
    addLog('═'.repeat(70));

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    page.setDefaultTimeout(8000);
    page.setDefaultNavigationTimeout(15000);

    try {
        addLog('\n📍 STEP 1: Navigate to use.ai');
        await page.goto('https://use.ai', { waitUntil: 'domcontentloaded', timeout: 15000 });
        await shot(page);
        addLog('✅ Loaded');

        addLog('\n🔐 STEP 2: Click Sign in');
        // Desktop + mobile both have Sign in — use desktop header button only
        const signIn = page.getByTestId('header-sign-in-button')
            .or(page.locator('button:has-text("Sign in")').first());
        await signIn.waitFor({ state: 'visible', timeout: 10000 });
        await signIn.click({ timeout: 10000, noWaitAfter: true });
        addLog('✅ Sign In clicked');
        await shot(page);

        addLog('\n📧 STEP 3: Wait for Continue with email, then click');
        const continueWithEmail = page.getByRole('button', { name: /continue with email/i })
            .or(page.locator('button').filter({ hasText: /continue with email/i }));
        try {
            await continueWithEmail.first().waitFor({ state: 'visible', timeout: 15000 });
        } catch (e) {
            // Sign-in click may not have opened modal — retry once
            addLog('⚠️ Auth modal not visible yet — clicking Sign in again');
            await signIn.click({ timeout: 5000, noWaitAfter: true });
            await continueWithEmail.first().waitFor({ state: 'visible', timeout: 15000 });
        }
        await continueWithEmail.first().click({ timeout: 10000, noWaitAfter: true });
        await page.waitForSelector('input[type="email"]', { timeout: 10000 });
        await shot(page);
        addLog('✅ Continue with email clicked');

        addLog('\n✉️ STEP 4: Enter email');
        await page.fill('input[type="email"]', email, { timeout: 5000 });
        await shot(page);
        addLog(`✅ Email: ${email}`);

        addLog('\n👆 STEP 5: Click Continue button below email');
        const clickMethod = await clickEmailContinue(page);
        await shot(page);
        addLog(`✅ Continue clicked (${clickMethod})`);

        addLog('\n⏳ STEP 6: Wait for "Account created successfully"');
        try {
            await waitForAccountCreated(page, 20000);
            await shot(page);
            addLog('✅ Account created successfully');
        } catch (e) {
            const pageText = await page.evaluate(() => document.body.innerText);
            if (/Account created successfully/i.test(pageText)) {
                addLog('✅ Account created successfully (already visible)');
            } else if (pageText.includes('Check your email')) {
                addLog('⚠️ "Check your email" detected before account creation! Retrying...');
                await ctx.close();
                const maxRetries = 10;
                if (retryCount < maxRetries) {
                    const makeRetryEmail = (origEmail) => {
                        try {
                            const parts = origEmail.split('@');
                            const local = parts[0];
                            const domain = parts[1] || '';
                            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
                            const rand = chars[Math.floor(Math.random() * chars.length)];
                            return `${local}.${rand}${retryCount}@${domain}`;
                        } catch (err) {
                            return origEmail;
                        }
                    };
                    const newEmail = makeRetryEmail(email);
                    addLog(`🔁 Retrying with email: ${newEmail}`);
                    return await scrape(newEmail, prompt, model, retryCount + 1);
                }
                throw new Error('Max retries exceeded: Check your email keeps appearing');
            } else {
                addLog(`⚠️ Success message not detected yet: ${e.message}`);
                await shot(page);
            }
        }

        addLog('\n🔁 STEP 7: Attempting paywall bypass via query param');
        try {
            await page.goto('https://use.ai/?paywall=false', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => null);
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

        addLog('\n⏳ STEP 8: Check for "Check your email" after bypass');
        await shot(page);

        const pageTextAfterBypass = await page.evaluate(() => document.body.innerText);
        if (pageTextAfterBypass.includes('Check your email')) {
            addLog('⚠️ "Check your email" detected after bypass! Retrying...');
            await ctx.close();
            const maxRetries = 10;
            if (retryCount < maxRetries) {
                const makeRetryEmail = (origEmail) => {
                    try {
                        const parts = origEmail.split('@');
                        const local = parts[0];
                        const domain = parts[1] || '';
                        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
                        const rand = chars[Math.floor(Math.random() * chars.length)];
                        return `${local}.${rand}${retryCount}@${domain}`;
                    } catch (err) {
                        return origEmail;
                    }
                };
                const newEmail = makeRetryEmail(email);
                addLog(`🔁 Retrying with email: ${newEmail}`);
                return await scrape(newEmail, prompt, model, retryCount + 1);
            }
            throw new Error('Max retries exceeded: Check your email keeps appearing');
        }
        addLog('✅ No email verification check');

        addLog('\n🎯 STEP 9: Close popup if exists (enhanced)');
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
                        await btn.click({ noWaitAfter: true });
                        popupClicked = true;
                        addLog(`✅ Popup closed via button`);
                        break;
                    }
                } catch(e) { }
            }
            
            if (!popupClicked) {
                await page.keyboard.press('Escape', { noWaitAfter: true });
                popupClicked = true;
                addLog('✅ Sent Escape to close popup');
            }
            
            await shot(page);
        } catch(e) { addLog(`⚠️ Error closing popup: ${e.message}`); }

        addLog(`\n🤖 STEP 10: Select model (${model})`);
        try {
            await selectChatModel(page, model || 'Auto');
        } catch (e) {
            addLog(`⚠️ Model selection error: ${e.message}`);
            await shot(page);
            throw new Error(`Failed to select model "${model}": ${e.message}`);
        }

        addLog('\n💬 STEP 11: Chat interface ready');
        addLog('✅ Ready');

        addLog('\n📝 STEP 12: Fill prompt input');
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
        await inp.click({ noWaitAfter: true });
        await inp.fill(prompt);
        await shot(page);
        addLog(`✅ Filled`);

        addLog('\n🚀 STEP 13: Send (Enter)');
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

        // STEP 14: Extract sources from right panel
        let sources = [];
        addLog('\n📚 STEP 14: Extracting sources from right panel');
        try {
            // Look for sources button/indicator in right panel (N Sources)
            const sourcesBtn = await page.locator('button:has-text("Source"), [aria-label*="source" i]').first();
            if (sourcesBtn) {
                addLog('📍 Found sources button - clicking...');
                await sourcesBtn.click({ noWaitAfter: true });
                await page.waitForSelector('a[href*="http"]', { timeout: 5000 }).catch(() => null);
                addLog('✅ Sources panel opened');

                // Scroll to bottom of sources panel to load all sources
                const totalSources = await page.evaluate(async () => {
                    const panel = document.querySelector('[class*="source"], [aria-label*="source" i]')?.parentElement;
                    if (!panel) return 0;
                    
                    let previousHeight = 0;
                    let attempts = 0;
                    
                    while (attempts < 20) {
                        panel.scrollTop = panel.scrollHeight;
                        await new Promise(r => setTimeout(r, 150));
                        
                        if (panel.scrollHeight === previousHeight) break;
                        previousHeight = panel.scrollHeight;
                        attempts++;
                    }
                    
                    return document.querySelectorAll('a[href*="http"]').length;
                });
                
                addLog(`📍 Total source elements found: ${totalSources}`);
                await page.waitForTimeout(300);
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

app.get('/api/models', (req, res) => {
    res.json({
        success: true,
        models: ['Auto', 'Fable 5', 'Sonnet 5', 'Claude 3.5'],
        timestamp: new Date().toISOString()
    });
});

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
