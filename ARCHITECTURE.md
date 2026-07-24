# use.ai Web Scraper Architecture

## System Overview
```
┌──────────────────────────────────┐
│  React Chat Frontend             │
│  - User types prompt             │
│  - Selects model (Fable 5)       │
│  - Clicks Send                   │
└──────────────┬───────────────────┘
               │ POST /api/scrape
               ▼
┌──────────────────────────────────┐
│  Express Backend API             │
│  - Validate request              │
│  - Call Playwright scraper       │
│  - Validate response             │
│  - Send back result              │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  Playwright Automation           │
│  1. Navigate to use.ai           │
│  2. Login (email)                │
│  3. Close upgrade popup          │
│  4. Select model (Fable 5)       │
│  5. Type prompt                  │
│  6. Send message                 │
│  7. Wait for response            │
│  8. Scrape DOM                   │
│  9. Extract clean text           │
│  10. Return to backend           │
└──────────────┬───────────────────┘
               │
               ▼
        use.ai Platform
```

## Component Details

### 1. Frontend (React)
- Chat interface with input box
- Model selector dropdown
- Message display with streaming-like effect
- Error handling UI
- Loading spinner

### 2. Backend (Express)
- POST /api/scrape endpoint
- Input validation
- Playwright pool management
- Response parsing & cleanup
- Error handling & retry logic

### 3. Playwright Scraper
- Headless browser automation
- Email-based authentication
- DOM selectors for UI elements
- Popup handling
- Response extraction

## Flow Diagram

```
User Flow:
1. User types: "what is AI"
2. Selects model: "Fable 5"
3. Clicks "Send"
   ↓
4. Frontend POST /api/scrape
   {
     "prompt": "what is AI",
     "model": "Fable 5",
     "email": "user@gmail.com"
   }
   ↓
5. Backend validates input
   ↓
6. Playwright launches browser
   ↓
7. Navigate to use.ai
   ↓
8. Login with email
   ↓
9. Select model
   ↓
10. Send prompt
    ↓
11. Wait for response (max 30s)
    ↓
12. Scrape response text
    ↓
13. Extract clean text
    ↓
14. Return to frontend
    ↓
15. Display in chat (with typing effect)
```

## Key Selectors from use.ai

```javascript
// Login
SIGN_IN_BUTTON: "button:has-text('Sign in')"
INPUT_EMAIL: "input[type='email']"
CONTINUE_BUTTON: "button:has-text('Continue')"

// Popups
CLOSE_UPGRADE_POPUP: ".modal button[aria-label='Close']"
PRO_POPUP: ".upgrade-modal"

// Chat
MODEL_DROPDOWN: "button:has-text('Auto')"
MODEL_OPTION: "text=Fable 5"
CHAT_INPUT: "textarea[placeholder*='Type'], input[placeholder*='message']"
SEND_BUTTON: "button[aria-label='Send'], button.send-btn"
RESPONSE_CONTAINER: ".message-container, .response-text"
RESPONSE_TEXT: ".message-content p, .response-content"
```

## Error Handling Strategy

1. **Email Check Retry**: If "Check your email" appears, close modal and retry
2. **Popup Handling**: Close PRO upgrade popup if it appears
3. **Timeout**: Max 30s wait for response, then timeout error
4. **Network Errors**: Retry up to 3 times with exponential backoff
5. **Authentication**: Re-login if session expires

## Security Considerations

⚠️ **IMPORTANT**: 
- Never store email/password in code
- Use environment variables for credentials
- Implement rate limiting on API
- Add CORS restrictions
- Use HTTPS in production
- Add request signing/authentication

## Database Schema (Optional)

```sql
CREATE TABLE scrape_requests (
  id UUID PRIMARY KEY,
  prompt TEXT NOT NULL,
  model VARCHAR(50),
  status VARCHAR(20), -- pending, processing, completed, failed
  response TEXT,
  error_message TEXT,
  created_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INT
);

CREATE TABLE api_usage (
  id UUID PRIMARY KEY,
  email VARCHAR(255),
  request_count INT,
  created_at TIMESTAMP,
  reset_at TIMESTAMP
);
```

## Performance Optimizations

1. **Browser Pool**: Reuse Playwright browser instances
2. **Caching**: Cache responses for identical prompts (5min TTL)
3. **Rate Limiting**: 10 requests/min per IP
4. **Timeout**: Aggressive timeouts to fail fast
5. **Concurrent Requests**: Handle 5 parallel scrapes max
