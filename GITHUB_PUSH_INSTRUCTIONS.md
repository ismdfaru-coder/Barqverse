# Push to GitHub Instructions

Your project is ready to push to GitHub! Follow these steps:

## Step 1: Create Repository on GitHub

1. Go to https://github.com/new
2. Fill in:
   - **Repository name:** `use-ai-scraper` (or your choice)
   - **Description:** "Automated use.ai web scraper with Playwright"
   - **Public/Private:** Choose your preference
   - **Skip** "Add README" (already have one)
3. Click "Create repository"

## Step 2: Push to GitHub

Copy-paste these commands into PowerShell:

```powershell
cd C:\Users\Mohammed Farhathulla\use-ai-scraper

# Replace USERNAME with your GitHub username
git remote add origin https://github.com/USERNAME/use-ai-scraper.git
git branch -M main
git push -u origin main
```

**First time?** Git will prompt for authentication:
- Use your GitHub username
- For password: Use a Personal Access Token (PAT) from GitHub Settings → Developer Settings → Personal Access Tokens

## Step 3: Verify

Visit: `https://github.com/USERNAME/use-ai-scraper`

## Troubleshooting

### "fatal: remote origin already exists"
```powershell
git remote remove origin
git remote add origin https://github.com/USERNAME/use-ai-scraper.git
```

### "fatal: could not read Username"
Use a GitHub Personal Access Token instead of password:
1. Go to GitHub → Settings → Developer Settings → Personal Access Tokens
2. Click "Generate new token"
3. Give it `repo` scope
4. Use the token as your password

### HTTPS vs SSH?

**HTTPS (recommended for beginners):**
```
https://github.com/USERNAME/use-ai-scraper.git
```

**SSH (if you have SSH keys):**
```
git@github.com:USERNAME/use-ai-scraper.git
```

## Project Structure

```
use-ai-scraper/
├── app.html              # Grok-style dark theme UI
├── backend-server.js     # Playwright automation + Express API
├── frontend-server.js    # HTTP server for frontend
├── package.json          # Dependencies
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
├── README.md             # Project documentation
└── ARCHITECTURE.md       # Technical architecture
```

## What's Included

- ✅ Complete Playwright automation
- ✅ Grok-inspired dark theme frontend
- ✅ Sources panel with URL extraction
- ✅ REST API for response scraping
- ✅ Debug dashboard
- ✅ Quick start guide

## Quick Start After Cloning

```bash
git clone https://github.com/USERNAME/use-ai-scraper.git
cd use-ai-scraper
npm install

# Terminal 1
node backend-server.js

# Terminal 2
node frontend-server.js
```

Open: `http://localhost:3000`

---

**Need help?** Check README.md for detailed setup instructions.
