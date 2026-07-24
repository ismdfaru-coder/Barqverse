# 🚀 use.ai Scraper - Quick Setup Guide

## What You'll Do

1. Open **Terminal 1** → Start the backend (Playwright automation)
2. Open **Terminal 2** → Open the web app in browser
3. Type prompts → Backend automatically:
   - Opens use.ai
   - Logs in with your email
   - Selects model
   - Sends prompt
   - Gets response
   - Returns to your chat!

---

## Prerequisites

✅ **Node.js installed** (you have this!)

---

## Setup Steps

### Terminal 1: Start Backend

```bash
# Go to your project folder
cd your-project-folder

# Install dependencies (first time only)
npm install express cors playwright

# Start the backend server
node backend-server.js
```

**Expected output:**
```
============================================================
🚀 API SERVER RUNNING
============================================================
📍 URL: http://localhost:5000
📤 Endpoint: POST http://localhost:5000/api/scrape
❤️  Health: GET  http://localhost:5000/api/health
============================================================

Waiting for requests...
```

✅ **Keep this terminal open!**

---

### Terminal 2: Open the App

```bash
# Open the chat app
start app.html

# Or use:
open app.html          # macOS
xdg-open app.html      # Linux
```

✅ **Browser opens automatically with the chat interface**

---

## Using the App

1. **Login**
   - Email: Use any email (example: `test@gmail.com`)
   - Click "Sign In"

2. **Chat**
   - Type your prompt: "What is AI?"
   - Select model (Auto, Fable 5, etc.)
   - Press **Enter** or click **➤**

3. **Watch the Magic**
   - Backend opens Playwright browser
   - Automates use.ai website
   - Returns response to your chat!

---

## What Happens Behind the Scenes

```
You type prompt in browser
        ↓
App sends to http://localhost:5000/api/scrape
        ↓
Backend Server (backend-server.js)
        ↓
Opens Chrome with Playwright
        ↓
Navigates to use.ai
        ↓
Signs in with your email
        ↓
Selects model
        ↓
Types your prompt
        ↓
Waits for AI response
        ↓
Extracts text from webpage
        ↓
Sends back to your chat
        ↓
Display to user ✅
```

---

## Troubleshooting

### "Cannot connect to localhost:5000"
**Solution:** Make sure `node backend-server.js` is running in Terminal 1

### "Browser doesn't open"
**Solution:** You might see a Chrome window opening. That's normal! It's the Playwright automation.

### "Email validation failed"
**Solution:** Use a valid email format like `test@gmail.com`

### Node modules error
**Solution:** Run this first:
```bash
npm install express cors playwright
```

---

## Files

- `backend-server.js` - Playwright automation + Express API
- `app.html` - ChatGPT-style UI
- `package.json` - Dependencies (auto-created)

---

## Logs You'll See

**Backend Console:**
```
============================================================
🚀 STARTING SCRAPE PROCESS
============================================================
📧 Email: user@gmail.com
💬 Prompt: what is AI?
🤖 Model: Auto
============================================================

📍 STEP 1: Navigating to use.ai
✅ Page loaded

🔐 STEP 2: Looking for Sign In button
✅ Clicked Sign In

📧 STEP 3: Click "Continue with email"
✅ Clicked Continue with email

✉️ STEP 4: Entering email
✅ Email entered: user@gmail.com
✅ Clicked Continue

⏳ STEP 5: Waiting for chat interface to load...
✅ Chat interface ready

🎯 STEP 6: Checking for upgrade popup
✅ No popup found

🤖 STEP 7: Selecting model: Auto
✅ Model dropdown opened
✅ Selected model: Auto

📝 STEP 8: Entering prompt
✅ Prompt entered: "what is AI?"

🚀 STEP 9: Sending message
✅ Message sent

⏳ STEP 10: Waiting for AI response (max 30 seconds)...
✅ Response detected after 4.5s

📋 EXTRACTED RESPONSE:
────────────────────────────────────────────────────────
AI (Artificial Intelligence) is a technology that enables 
computers to perform tasks that typically require human 
intelligence. This includes understanding language, 
recognizing images, making decisions, and solving problems...
────────────────────────────────────────────────────────

✅ SCRAPE COMPLETE!
```

---

## Tips

- 💡 First request might take 5-10 seconds (browser startup)
- 💡 Subsequent requests are faster
- 💡 Keep Terminal 1 open while using the app
- 💡 You can send multiple prompts in one session
- 💡 The browser stays open for efficiency

---

## Done! 🎉

You now have a **ChatGPT-style interface that automates use.ai**!

**Questions?** Check the backend console output - it logs every step.
