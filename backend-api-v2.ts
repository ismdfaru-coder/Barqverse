import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import UseAiScraperV2 from './use-ai-scraper-v2';
import type { ScraperResponse } from './use-ai-scraper-v2';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * EXPRESS BACKEND API v2 - USE.AI SCRAPER WITH OPTIMIZED DOM EXTRACTION
 */

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Rate Limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Global scraper instance
let globalScraper: UseAiScraperV2 | null = null;

interface ScrapeRequest {
  prompt: string;
  model?: string;
  email?: string;
}

interface ScrapeResponse {
  success: boolean;
  data?: {
    response: string;
    duration: number;
    model: string;
    timestamp: string;
  };
  error?: string;
  timestamp: string;
}

/**
 * Request Validation Middleware
 */
const validateScrapeRequest = (req: Request, res: Response, next: NextFunction) => {
  const { prompt, model = 'Auto', email } = req.body as ScrapeRequest;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Missing or invalid "prompt" field',
      timestamp: new Date().toISOString(),
    });
  }

  if (prompt.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Prompt cannot be empty',
      timestamp: new Date().toISOString(),
    });
  }

  if (prompt.length > 5000) {
    return res.status(400).json({
      success: false,
      error: 'Prompt exceeds maximum length of 5000 characters',
      timestamp: new Date().toISOString(),
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Missing or invalid email address',
      timestamp: new Date().toISOString(),
    });
  }

  const validModels = ['Auto', 'Fable 5', 'Sonnet 5', 'Claude 3.5', 'GPT-5.6 Terra', 'GPT-5.6 Luna', 'Gemini 3.1 Pro'];
  if (!validModels.includes(model)) {
    return res.status(400).json({
      success: false,
      error: `Invalid model. Valid options: ${validModels.join(', ')}`,
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

/**
 * Initialize global scraper
 */
const initializeScraper = async (): Promise<UseAiScraperV2> => {
  if (!globalScraper) {
    globalScraper = new UseAiScraperV2({
      email: process.env.USE_AI_EMAIL || 'user@example.com',
      headless: process.env.HEADLESS !== 'false',
      timeout: parseInt(process.env.SCRAPER_TIMEOUT || '30000'),
      retries: parseInt(process.env.SCRAPER_RETRIES || '3'),
    });

    try {
      await globalScraper.initialize();
      console.log('[API] ✅ Scraper initialized');
    } catch (error) {
      console.error('[API] ❌ Failed to initialize scraper:', error);
      globalScraper = null;
      throw error;
    }
  }

  return globalScraper;
};

/**
 * POST /api/scrape - Main endpoint
 */
app.post('/api/scrape', validateScrapeRequest, async (req: Request, res: Response) => {
  const requestStartTime = Date.now();
  const { prompt, model = 'Auto', email } = req.body as ScrapeRequest;

  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[API] 📨 New scrape request`);
    console.log(`[API] Prompt: "${prompt.substring(0, 50)}..."`);
    console.log(`[API] Model: ${model}`);
    console.log(`[API] Email: ${email}`);
    console.log(`${'='.repeat(60)}`);

    // Initialize scraper
    const scraper = await initializeScraper();

    // Update email if provided
    if (email) {
      scraper.config.email = email;
    }

    // Perform scrape with retry
    const result = await scraper.scrapeWithRetry(prompt, model);

    if (!result.success) {
      console.error(`[API] ❌ Scrape failed: ${result.error}`);
      
      return res.status(500).json({
        success: false,
        error: result.error || 'Scraping failed',
        timestamp: new Date().toISOString(),
      } as any);
    }

    const totalDuration = Date.now() - requestStartTime;

    console.log(`[API] ✅ Scrape successful!`);
    console.log(`[API] Response length: ${result.response?.length} characters`);
    console.log(`[API] Total duration: ${totalDuration}ms`);
    console.log(`[API] Response preview: ${result.response?.substring(0, 80)}...`);

    const response: ScrapeResponse = {
      success: true,
      data: {
        response: result.response!,
        duration: result.duration,
        model,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] ❌ Unexpected error: ${errorMsg}`);

    res.status(500).json({
      success: false,
      error: errorMsg,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/health - Health check
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    scraper: globalScraper ? 'initialized' : 'not initialized',
  });
});

/**
 * GET /api/models - Available models
 */
app.get('/api/models', (req: Request, res: Response) => {
  res.json({
    success: true,
    models: [
      'Auto',
      'Fable 5',
      'Sonnet 5',
      'Claude 3.5',
      'GPT-5.6 Terra',
      'GPT-5.6 Luna',
      'Gemini 3.1 Pro',
      'GLM 5.2'
    ],
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/info - API info
 */
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    version: '2.0.0',
    name: 'use.ai Scraper API',
    features: [
      'Automated login to use.ai',
      'Multi-model support',
      'DOM-based response extraction',
      'Automatic retry with exponential backoff',
      'Rate limiting',
      'CORS support',
      'Full TypeScript support'
    ],
    endpoints: {
      scrape: 'POST /api/scrape',
      health: 'GET /api/health',
      models: 'GET /api/models',
      info: 'GET /api/info'
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * Error Handling Middleware
 */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[API] Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

/**
 * 404 Handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Graceful Shutdown
 */
process.on('SIGTERM', async () => {
  console.log('[API] 🛑 SIGTERM received, shutting down gracefully...');
  
  if (globalScraper) {
    await globalScraper.close();
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[API] 🛑 SIGINT received, shutting down gracefully...');
  
  if (globalScraper) {
    await globalScraper.close();
  }
  
  process.exit(0);
});

/**
 * Start Server
 */
const PORT = parseInt(process.env.PORT || '5000');
const HOST = process.env.HOST || 'localhost';

const server = app.listen(PORT, HOST, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ use.ai Scraper API v2.0 Running`);
  console.log(`${'='.repeat(60)}`);
  console.log(`🌐 Server: http://${HOST}:${PORT}`);
  console.log(`📍 Scrape:  POST   http://${HOST}:${PORT}/api/scrape`);
  console.log(`❤️  Health:  GET    http://${HOST}:${PORT}/api/health`);
  console.log(`🤖 Models:  GET    http://${HOST}:${PORT}/api/models`);
  console.log(`ℹ️  Info:    GET    http://${HOST}:${PORT}/api/info`);
  console.log(`${'='.repeat(60)}\n`);
});

export default app;
