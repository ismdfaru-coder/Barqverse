import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import UseAiScraper from './use-ai-scraper';
import type { ScraperResponse } from './use-ai-scraper';

/**
 * EXPRESS BACKEND API FOR USE.AI SCRAPER
 * Handles requests, validation, and scraper orchestration
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
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Global scraper instance (reuse browser)
let globalScraper: UseAiScraper | null = null;

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
  };
  error?: string;
  timestamp: string;
}

/**
 * Request Validation Middleware
 */
const validateScrapeRequest = (req: Request, res: Response, next: NextFunction) => {
  const { prompt, model = 'Fable 5', email } = req.body as ScrapeRequest;

  // Validate required fields
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

  // Validate email (required)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Missing or invalid email address',
      timestamp: new Date().toISOString(),
    });
  }

  // Validate model
  const validModels = ['Auto', 'Fable 5', 'Sonnet 5', 'Claude 3.5'];
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
const initializeScraper = async (): Promise<UseAiScraper> => {
  if (!globalScraper) {
    globalScraper = new UseAiScraper({
      email: process.env.USE_AI_EMAIL || 'user@example.com',
      headless: process.env.HEADLESS !== 'false',
      timeout: parseInt(process.env.SCRAPER_TIMEOUT || '30000'),
      retries: parseInt(process.env.SCRAPER_RETRIES || '3'),
    });

    await globalScraper.initialize();
  }

  return globalScraper;
};

/**
 * POST /api/scrape
 * Main endpoint to scrape use.ai
 */
app.post('/api/scrape', validateScrapeRequest, async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { prompt, model = 'Fable 5', email } = req.body as ScrapeRequest;

  try {
    console.log(`[API] Scrape request: "${prompt.substring(0, 50)}..." | Model: ${model} | Email: ${email}`);

    // Initialize scraper
    const scraper = await initializeScraper();

    // Update email if provided
    if (email) {
      scraper.config.email = email;
    }

    // Perform scrape with retry
    const result = await scraper.scrapeWithRetry(prompt, model);

    if (!result.success) {
      console.error(`[API] Scrape failed: ${result.error}`);
      return res.status(500).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString(),
      } as ScrapeResponse);
    }

    const response: ScrapeResponse = {
      success: true,
      data: {
        response: result.response!,
        duration: result.duration,
        model,
      },
      timestamp: new Date().toISOString(),
    };

    console.log(`[API] Success! Response length: ${response.data!.response.length} chars`);
    res.json(response);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] Error: ${errorMsg}`);

    res.status(500).json({
      success: false,
      error: errorMsg,
      timestamp: new Date().toISOString(),
    } as ScrapeResponse);
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /api/models
 * Get available models
 */
app.get('/api/models', (req: Request, res: Response) => {
  res.json({
    success: true,
    models: ['Auto', 'Fable 5', 'Sonnet 5', 'Claude 3.5'],
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
  console.log('[API] SIGTERM received, shutting down gracefully...');
  
  if (globalScraper) {
    await globalScraper.close();
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[API] SIGINT received, shutting down gracefully...');
  
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

app.listen(PORT, () => {
  console.log(`✅ Server running at http://${HOST}:${PORT}`);
  console.log(`📍 Scrape endpoint: POST http://${HOST}:${PORT}/api/scrape`);
  console.log(`❤️ Health check: GET http://${HOST}:${PORT}/api/health`);
});

export default app;
