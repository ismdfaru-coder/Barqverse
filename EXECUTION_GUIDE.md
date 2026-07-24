# 🚀 EXECUTION GUIDE - use.ai Scraper v2 Implementation

## ✅ Files Ready to Use

```
✅ use-ai-scraper-v2.ts    - Optimized scraper with DOM extraction
✅ backend-api-v2.ts       - Express API v2
✅ ChatApp.tsx              - React frontend (unchanged)
✅ ChatApp.css              - Styling (unchanged)
✅ package.json             - Dependencies (unchanged)
```

---

## 📋 STEP-BY-STEP EXECUTION

### **Step 1: Create Project Structure**

```bash
# Create folders
mkdir -p my-scraper/{backend,frontend}
cd my-scraper
```

### **Step 2: Copy Backend Files**

```bash
cd backend

# Copy the scraper and API files
cp use-ai-scraper-v2.ts ./
cp backend-api-v2.ts ./app.ts
cp package.json ./
cp tsconfig.json ./
cp .env.example ./.env

# Edit .env with your email
cat > .env << EOF
PORT=5000
HOST=localhost
NODE_ENV=development
USE_AI_EMAIL=your-email@gmail.com
FRONTEND_URL=http://localhost:3000
SCRAPER_TIMEOUT=30000
SCRAPER_RETRIES=3
HEADLESS=true
EOF
```

### **Step 3: Install Backend Dependencies**

```bash
npm install
npx playwright install
npm install express express-rate-limit dotenv
npm install -D typescript ts-node @types/express @types/node
```

### **Step 4: Test Backend**

```bash
# Run health check
npm run dev

# In another terminal, test:
curl http://localhost:5000/api/health

# Should return:
# {
#   "status": "ok",
#   "uptime": 45.123,
#   "scraper": "initialized"
# }
```

### **Step 5: Create React Frontend**

```bash
cd ../frontend

# Create React app
npx create-react-app . --template typescript

# Copy chat component
cp ../ChatApp.tsx src/
cp ../ChatApp.css src/

# Update App.tsx
cat > src/App.tsx << 'EOF'
import React from 'react';
import ChatApp from './ChatApp';
import './ChatApp.css';

function App() {
  return <ChatApp />;
}

export default App;
EOF

# Create .env.local
cat > .env.local << EOF
REACT_APP_API_URL=http://localhost:5000
EOF

# Start frontend
npm start
```

### **Step 6: Test Integration**

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm start

# Terminal 3: Test API
curl -X POST http://localhost:5000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "what is AI?",
    "model": "Auto",
    "email": "your-email@gmail.com"
  }'
```

---

## 🔄 Complete Flow - What Happens

### **Flow Diagram**

```
┌────────────────────────────────────┐
│ User Opens Chat App (localhost:3000)
└────────────────┬───────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ Enter email & login│
        └────────┬───────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ Type: "what is AI?"│
        │ Model: "Auto"      │
        │ Click Send         │
        └────────┬───────────┘
                 │
                 ▼ POST /api/scrape
        ┌────────────────────────────┐
        │ Backend Express API        │
        │ 1. Validate request        │
        │ 2. Check rate limit        │
        │ 3. Initialize scraper      │
        └────────┬───────────────────┘
                 │
                 ▼ Playwright Browser
        ┌────────────────────────────┐
        │ Scraper Steps:             │
        │ 1️⃣  Navigate to use.ai      │
        │ 2️⃣  Click Sign In          │
        │ 3️⃣  Click "Continue w/Email"
        │ 4️⃣  Enter email            │
        │ 5️⃣  Click Continue         │
        │ 6️⃣  Close upgrade popup    │
        │ 7️⃣  Select model           │
        │ 8️⃣  Enter prompt           │
        │ 9️⃣  Press Enter            │
        │ 🔟 Wait for response       │
        │ 1️⃣1️⃣ Extract from DOM       │
        └────────┬───────────────────┘
                 │
                 ▼ Extract Response
        ┌────────────────────────────┐
        │ DOM Extraction             │
        │ 1. Find messages           │
        │ 2. Get last message        │
        │ 3. Extract textContent     │
        │ 4. Clean whitespace        │
        │ 5. Return text             │
        └────────┬───────────────────┘
                 │
                 ▼ JSON Response
        ┌────────────────────────────┐
        │ {                          │
        │  "success": true,          │
        │  "data": {                 │
        │   "response": "AI is...",  │
        │   "duration": 4523,        │
        │   "model": "Auto"          │
        │  }                         │
        │ }                          │
        └────────┬───────────────────┘
                 │
                 ▼ Frontend
        ┌────────────────────────────┐
        │ Display in Chat            │
        │ 👤 User: "what is AI?"     │
        │ 🤖 AI: "AI is..."          │
        │ ⏱️ Duration: 4523ms         │
        └────────────────────────────┘
```

---

## 🧪 Testing Scenarios

### **Test 1: Basic Scrape**

```bash
curl -X POST http://localhost:5000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello, what is your name?",
    "model": "Auto",
    "email": "test@gmail.com"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "response": "I'm an AI assistant...",
    "duration": 4523,
    "model": "Auto",
    "timestamp": "2024-01-23T10:30:45.123Z"
  },
  "timestamp": "2024-01-23T10:30:45.123Z"
}
```

### **Test 2: Invalid Email**

```bash
curl -X POST http://localhost:5000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "test",
    "model": "Auto",
    "email": "invalid-email"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Missing or invalid email address",
  "timestamp": "2024-01-23T10:30:45.123Z"
}
```

### **Test 3: Empty Prompt**

```bash
curl -X POST http://localhost:5000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "",
    "model": "Auto",
    "email": "test@gmail.com"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Prompt cannot be empty",
  "timestamp": "2024-01-23T10:30:45.123Z"
}
```

### **Test 4: Rate Limit (>10 requests/min)**

After 10 requests within 60 seconds:
```json
{
  "success": false,
  "error": "Too many requests, please try again later.",
  "timestamp": "2024-01-23T10:30:45.123Z"
}
```

---

## 📊 Console Logs - What You'll See

### **Backend Logs:**

```
============================================================
[API] 📨 New scrape request
[API] Prompt: "what is AI?..."
[API] Model: Auto
[API] Email: your@email.com
============================================================

[Scraper V2] 🔄 Attempt 1/3

[Scraper V2] 📍 Step 1: Navigate to use.ai
[Scraper V2] ✅ Browser launched

[Scraper V2] 🔐 Step 2: Click "Sign in" button
[Scraper V2] 📧 Step 3: Click "Continue with email"
[Scraper V2] ✉️ Step 4: Enter email: your@email.com
[Scraper V2] ✅ Email filled
[Scraper V2] ✅ Clicked Continue

[Scraper V2] 🎯 Step 5: Check for upgrade popup
[Scraper V2] ❌ Upgrade popup found, closing...
[Scraper V2] ✅ Popup closed via X button

[Scraper V2] 💬 Step 6: Wait for chat interface
[Scraper V2] ✅ Chat interface loaded

[Scraper V2] 🤖 Step 7: Select model: Auto
[Scraper V2] ✅ Model dropdown opened
[Scraper V2] ✅ Selected model: Auto

[Scraper V2] 📝 Step 8: Send prompt: "what is AI..."
[Scraper V2] ✅ Prompt typed

[Scraper V2] 🚀 Sending message...

[Scraper V2] ⏳ Step 9: Waiting for AI response (max 30s)...
[Scraper V2] ✅ Response detected in DOM

[Scraper V2] 🔍 Step 10: Extracting response from DOM...
[Scraper V2] Running DOM extraction...
Found 2 message containers
✅ Extraction successful (523 chars)

[Scraper V2] ✅ SUCCESS!
[Scraper V2] Duration: 4523ms
[Scraper V2] Response length: 523 chars
[Scraper V2] Preview: AI (Artificial Intelligence) is a technology...

[API] ✅ Scrape successful!
[API] Response length: 523 characters
[API] Total duration: 4523ms
[API] Response preview: AI is a technology that enables computers...
```

---

## 🐛 Troubleshooting

### **Issue: Browser won't launch**

```bash
# Solution: Install Playwright browsers
npx playwright install
npx playwright install-deps
```

### **Issue: Email input not found**

```bash
# The login modal structure may have changed
# Edit use-ai-scraper-v2.ts and update selector:
continueWithEmailButton: 'button:has-text("Continue with email")'
emailInput: 'input[type="email"]'

# Test by running with HEADLESS=false to see browser:
HEADLESS=false npm run dev
```

### **Issue: Response not extracting**

```bash
# Open browser DevTools and inspect the message DOM:
document.querySelectorAll('[role="article"]')
# Check the structure and update selectors if needed
```

### **Issue: Port 5000 already in use**

```bash
# Change PORT in .env
PORT=5001

# Or kill process on port 5000:
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -i :5000
kill -9 <PID>
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Backend server starts: `npm run dev`
- [ ] Frontend loads at `http://localhost:3000`
- [ ] Health check works: `curl http://localhost:5000/api/health`
- [ ] Models endpoint works: `curl http://localhost:5000/api/models`
- [ ] Can log in with email
- [ ] Can type and send prompt
- [ ] Response appears in chat UI
- [ ] Duration time displays
- [ ] No console errors
- [ ] Rate limiting works (test with 11+ requests)

---

## 🎯 Key Features (v2)

✅ **Optimized DOM extraction** - Uses 3 strategies
✅ **Better error handling** - Detailed logging
✅ **Retry logic** - Up to 3 attempts with backoff
✅ **Model selection** - Works with all use.ai models
✅ **Popup closing** - Handles upgrade modal
✅ **Email login** - Full automation
✅ **Rate limiting** - 10 requests/minute
✅ **CORS** - Frontend-backend communication
✅ **Comprehensive logging** - Debug-friendly output
✅ **Production ready** - Error handling at every step

---

## 📞 Support Commands

### **Check health:**
```bash
curl http://localhost:5000/api/health
```

### **List models:**
```bash
curl http://localhost:5000/api/models
```

### **Get API info:**
```bash
curl http://localhost:5000/api/info
```

### **View logs:**
```bash
# Backend
DEBUG=* npm run dev

# Frontend (F12 in browser)
```

---

## 🎉 Next Steps

1. ✅ Copy all files from `files/` folder
2. ✅ Run `npm install` in backend & frontend
3. ✅ Set email in `.env`
4. ✅ Start backend: `npm run dev`
5. ✅ Start frontend: `npm start`
6. ✅ Open http://localhost:3000
7. ✅ Enter email and test!

**You're ready to go!** 🚀
