# use.ai Web Scraper ??

Automated AI chat scraper using Playwright. Get responses from use.ai and display them in your own app.

## Features

? Playwright automation for use.ai  
? Grok-style dark theme UI  
? Response + sources extraction  
? REST API backend (Express)  
? Real-time response detection  

## Quick Start

```bash
npm install
node backend-server.js  # Terminal 1
node frontend-server.js # Terminal 2
```

Open: `http://localhost:3000`

## API

```
POST /api/scrape
{
  "prompt": "What is AI?",
  "model": "Auto",
  "email": "your@email.com"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "response": "...",
    "sources": [...],
    "duration": 5234
  }
}
```

## Tech Stack

- **Backend:** Node.js + Express + Playwright
- **Frontend:** Vanilla HTML/CSS/JS
- **Theme:** Grok-inspired dark design
- **Deployment:** Run locally (no Docker needed)

## Files

- `backend-server.js` - Playwright automation + API
- `app.html` - Frontend UI
- `frontend-server.js` - HTTP server for frontend
- `package.json` - Dependencies

## Debug

Visit `http://localhost:5000/debug` for live screenshots & logs.

## License

MIT
