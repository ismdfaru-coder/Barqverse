# Advanced Features & Production Setup

## 🚀 Features to Add

### 1. User Authentication

```typescript
// auth.ts
import jwt from 'jsonwebtoken';

export const generateToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: '7d'
  });
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return null;
  }
};

// Middleware
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid token' });
  
  (req as any).userId = payload.userId;
  next();
};
```

### 2. Database Logging

```typescript
// Use PostgreSQL, MongoDB, or SQLite
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const logScrapeRequest = async (
  userId: string,
  prompt: string,
  model: string,
  success: boolean,
  duration: number,
  error?: string
) => {
  await pool.query(
    `INSERT INTO scrape_logs 
     (user_id, prompt, model, success, duration, error) 
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, prompt, model, success, duration, error]
  );
};

// Create table
const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS scrape_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    model VARCHAR(50),
    success BOOLEAN,
    duration INT,
    error TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX idx_user_id ON scrape_logs(user_id);
  CREATE INDEX idx_created_at ON scrape_logs(created_at);
`;
```

### 3. Response Caching

```typescript
// cache.ts
import Redis from 'redis';

const redis = Redis.createClient({
  url: process.env.REDIS_URL,
});

export const getCachedResponse = async (key: string) => {
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
};

export const setCachedResponse = async (key: string, value: any, ttl = 300) => {
  await redis.setex(key, ttl, JSON.stringify(value));
};

// In API endpoint
const cacheKey = `scrape:${prompt}:${model}`;
const cached = await getCachedResponse(cacheKey);
if (cached) return res.json({ ...cached, cached: true });

const result = await scraper.scrapeWithRetry(prompt, model);
await setCachedResponse(cacheKey, result);
```

### 4. Browser Pool Management

```typescript
// browser-pool.ts
import { Browser, chromium } from 'playwright';

class BrowserPool {
  private browsers: Browser[] = [];
  private available: boolean[] = [];
  private maxSize: number;

  constructor(maxSize = 5) {
    this.maxSize = maxSize;
  }

  async initialize() {
    for (let i = 0; i < this.maxSize; i++) {
      const browser = await chromium.launch({ headless: true });
      this.browsers.push(browser);
      this.available.push(true);
    }
  }

  async acquire(): Promise<Browser> {
    const index = this.available.indexOf(true);
    if (index !== -1) {
      this.available[index] = false;
      return this.browsers[index];
    }
    
    // Wait for available browser
    while (this.available.indexOf(true) === -1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const availableIndex = this.available.indexOf(true);
    this.available[availableIndex] = false;
    return this.browsers[availableIndex];
  }

  release(browser: Browser) {
    const index = this.browsers.indexOf(browser);
    if (index !== -1) {
      this.available[index] = true;
    }
  }

  async closeAll() {
    await Promise.all(this.browsers.map(b => b.close()));
  }
}

export const browserPool = new BrowserPool(5);
```

### 5. Queue System for Large Volume

```typescript
// queue.ts
import Bull from 'bull';

const scrapeQueue = new Bull('scrape', {
  redis: process.env.REDIS_URL,
});

scrapeQueue.process(async (job) => {
  const { prompt, model, email } = job.data;
  
  job.progress(25);
  const scraper = await initializeScraper();
  
  job.progress(50);
  const result = await scraper.scrapeWithRetry(prompt, model);
  
  job.progress(75);
  await logScrapeRequest(email, prompt, model, result.success);
  
  job.progress(100);
  return result;
});

// API endpoint
app.post('/api/scrape-async', async (req, res) => {
  const job = await scrapeQueue.add(req.body, {
    attempts: 3,
    backoff: 'exponential',
    removeOnComplete: true
  });

  res.json({ jobId: job.id, status: 'queued' });
});

// Check job status
app.get('/api/scrape-status/:jobId', async (req, res) => {
  const job = await scrapeQueue.getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  res.json({
    id: job.id,
    status: job.getState(),
    progress: job.progress(),
    data: job.data
  });
});
```

### 6. Webhook Notifications

```typescript
// webhooks.ts
app.post('/api/webhooks/register', (req, res) => {
  const { url, events } = req.body;
  
  // Store webhook
  db.webhooks.create({
    url,
    events,
    userId: req.user.id,
    isActive: true
  });

  res.json({ success: true });
});

// Trigger webhook
const triggerWebhook = async (event: string, data: any) => {
  const webhooks = await db.webhooks.find({
    events: { $in: [event] },
    isActive: true
  });

  for (const webhook of webhooks) {
    try {
      await axios.post(webhook.url, { event, data }, {
        timeout: 5000,
        retry: 3
      });
    } catch (error) {
      console.error(`Webhook ${webhook.url} failed:`, error);
    }
  }
};
```

### 7. Monitoring & Analytics

```typescript
// monitoring.ts
import Prometheus from 'prom-client';

const scrapeCounter = new Prometheus.Counter({
  name: 'scrape_requests_total',
  help: 'Total scrape requests',
  labelNames: ['status', 'model']
});

const scrapeDuration = new Prometheus.Histogram({
  name: 'scrape_duration_seconds',
  help: 'Scrape duration in seconds',
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

// Track metrics
app.post('/api/scrape', async (req, res) => {
  const timer = scrapeDuration.startTimer();
  
  try {
    const result = await scraper.scrapeWithRetry(...);
    scrapeCounter.inc({ status: 'success', model });
    timer();
  } catch (error) {
    scrapeCounter.inc({ status: 'error', model });
    timer();
  }
});

// Expose metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', Prometheus.register.contentType);
  res.end(await Prometheus.register.metrics());
});
```

### 8. Error Tracking with Sentry

```typescript
// error-tracking.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

app.use(Sentry.Handlers.requestHandler());

// Capture errors
app.post('/api/scrape', async (req, res) => {
  try {
    // ...
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use(Sentry.Handlers.errorHandler());
```

### 9. Load Balancing

```typescript
// Use NGINX or HAProxy
# nginx.conf
upstream api {
  server backend1:5000;
  server backend2:5000;
  server backend3:5000;
}

server {
  listen 80;
  server_name api.example.com;

  location /api {
    proxy_pass http://api;
    proxy_set_header X-Forwarded-For $remote_addr;
  }
}
```

### 10. Rate Limiting Advanced

```typescript
// Advanced rate limiting
import RedisStore from 'rate-limit-redis';

const store = new RedisStore({
  client: redis,
  prefix: 'rate-limit:',
});

const limiter = rateLimit({
  store,
  windowMs: 60 * 1000,
  max: async (req) => {
    // Different limits for different users
    if (req.user?.isPremium) return 100;
    if (req.user?.isAdmin) return 1000;
    return 10;
  },
  keyGenerator: (req) => req.user?.id || req.ip,
});
```

## 🔧 Production Deployment

### Environment Variables

```env
# Server
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379

# Security
JWT_SECRET=your-super-secret-key-change-this
ENCRYPTION_KEY=another-secret-key

# Scraper
USE_AI_EMAIL=your@email.com
SCRAPER_TIMEOUT=30000
SCRAPER_RETRIES=3

# Frontend
FRONTEND_URL=https://app.example.com

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
LOG_LEVEL=info

# CORS
CORS_ORIGINS=https://app.example.com,https://admin.example.com
```

### Docker Compose

```yaml
version: '3.8'

services:
  api:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/scraper
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://api:5000

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=scraper
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: use-ai-scraper-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: use-ai-scraper-api
  template:
    metadata:
      labels:
        app: use-ai-scraper-api
    spec:
      containers:
      - name: api
        image: your-registry/use-ai-scraper:latest
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 10
```

## 📊 Performance Benchmarks

Target metrics for production:
- **Scrape Time**: 2-5 seconds (per request)
- **API Latency**: <100ms (excluding scrape time)
- **Uptime**: >99.9%
- **Throughput**: 100+ requests/min
- **Error Rate**: <1%

Monitor with:
```bash
wrk -t12 -c400 -d30s http://api:5000/api/health
```

Good luck! 🚀
