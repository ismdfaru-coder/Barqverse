import { chromium, Browser, Page } from 'playwright';

/**
 * USE.AI PLAYWRIGHT SCRAPER
 * Automates use.ai interaction: login → send prompt → scrape response
 */

interface UseAiScraperConfig {
  email: string;
  headless?: boolean;
  timeout?: number;
  retries?: number;
}

interface ScraperResponse {
  success: boolean;
  response?: string;
  error?: string;
  duration: number;
}

class UseAiScraper {
  private browser: Browser | null = null;
  private config: UseAiScraperConfig;

  // DOM Selectors
  private selectors = {
    // Homepage
    signInButton: "button:has-text('Sign in')",
    
    // Login Modal
    emailInput: "input[type='email']",
    continueButton: "button:has-text('Continue')",
    closeModal: "button[aria-label='Close']",
    
    // Upgrade Popup
    upgradePopup: "div.upgrade-modal, div[role='dialog']:has-text('Upgrade')",
    closePopup: "button[aria-label='Close']:visible",
    
    // Chat Interface
    modelDropdown: "button:has-text('Auto')",
    fable5Model: "text='Fable 5'",
    chatInput: "textarea[placeholder*='Type'], input[placeholder*='message']",
    sendButton: "button[aria-label='Send'], button.send-btn, button svg[viewBox]",
    responseContainer: ".message-container, .response-text, [role='article']",
    responseText: ".message-content p, .response-content, [role='article'] p",
  };

  constructor(config: UseAiScraperConfig) {
    this.config = {
      headless: true,
      timeout: 30000,
      retries: 3,
      ...config,
    };
  }

  /**
   * Initialize browser
   */
  async initialize(): Promise<void> {
    if (this.browser) return;
    
    try {
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: ['--disable-blink-features=AutomationControlled'],
      });
      console.log('[Scraper] Browser launched');
    } catch (error) {
      throw new Error(`Failed to launch browser: ${error}`);
    }
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('[Scraper] Browser closed');
    }
  }

  /**
   * Main scraping function
   */
  async scrapePrompt(prompt: string, model: string = 'Fable 5'): Promise<ScraperResponse> {
    const startTime = Date.now();

    try {
      await this.initialize();
      if (!this.browser) throw new Error('Browser not initialized');

      const page = await this.browser.newPage();
      page.setDefaultTimeout(this.config.timeout!);

      try {
        // Step 1: Navigate to use.ai
        console.log('[Scraper] Navigating to use.ai...');
        await page.goto('https://use.ai', { waitUntil: 'networkidle' });
        await page.waitForLoadState('domcontentloaded');

        // Step 2: Click Sign In
        console.log('[Scraper] Clicking Sign In...');
        await page.click(this.selectors.signInButton);
        await page.waitForSelector(this.selectors.emailInput);

        // Step 3: Enter Email
        console.log(`[Scraper] Entering email: ${this.config.email}`);
        await page.fill(this.selectors.emailInput, this.config.email);
        await page.click(this.selectors.continueButton);

        // Step 4: Handle "Check your email" modal
        console.log('[Scraper] Waiting for email verification...');
        let emailCheckAppeared = false;
        try {
          await page.waitForSelector("text='Check your email'", { timeout: 3000 });
          emailCheckAppeared = true;
          console.log('[Scraper] "Check your email" modal appeared, closing...');
          await page.click(this.selectors.closeModal);
          await page.waitForTimeout(1000);

          // Retry clicking continue
          await page.fill(this.selectors.emailInput, this.config.email);
          await page.click(this.selectors.continueButton);
        } catch {
          // Modal didn't appear, likely logged in
          console.log('[Scraper] Email verified or skipped');
        }

        // Step 5: Wait for chat interface
        console.log('[Scraper] Waiting for chat interface...');
        await page.waitForSelector(this.selectors.chatInput, { timeout: 10000 });

        // Step 6: Close upgrade popup if it appears
        console.log('[Scraper] Checking for upgrade popup...');
        try {
          const popup = await page.$(this.selectors.upgradePopup);
          if (popup) {
            console.log('[Scraper] Upgrade popup found, closing...');
            const closeBtn = await page.$(this.selectors.closePopup);
            if (closeBtn) {
              await closeBtn.click();
              await page.waitForTimeout(500);
            }
          }
        } catch (error) {
          console.log('[Scraper] No upgrade popup detected');
        }

        // Step 7: Select Model
        console.log(`[Scraper] Selecting model: ${model}...`);
        try {
          await page.click(this.selectors.modelDropdown);
          await page.waitForSelector(this.selectors.fable5Model, { timeout: 3000 });
          await page.click(this.selectors.fable5Model);
          await page.waitForTimeout(500);
        } catch {
          console.log('[Scraper] Model selection skipped (already selected)');
        }

        // Step 8: Type Prompt
        console.log(`[Scraper] Typing prompt: "${prompt.substring(0, 50)}..."`);
        await page.fill(this.selectors.chatInput, prompt);
        await page.waitForTimeout(300);

        // Step 9: Send Message
        console.log('[Scraper] Sending message...');
        await page.press(this.selectors.chatInput, 'Enter');
        // Alternative: await page.click(this.selectors.sendButton);

        // Step 10: Wait for Response
        console.log('[Scraper] Waiting for response...');
        await page.waitForFunction(
          () => {
            const containers = document.querySelectorAll('.message-container, [role="article"]');
            return containers.length >= 2; // At least user + assistant message
          },
          { timeout: this.config.timeout }
        );

        // Step 11: Extract Response
        console.log('[Scraper] Extracting response...');
        const response = await page.evaluate(() => {
          // Try multiple selectors
          const selectors = [
            '.message-container:last-child .message-content',
            '[role="article"]:last-child',
            '.response-text',
            '.response-content',
          ];

          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              const lastElement = elements[elements.length - 1];
              let text = lastElement.textContent?.trim();
              
              if (text && text.length > 0) {
                // Clean up
                text = text
                  .replace(/\s+/g, ' ') // Normalize whitespace
                  .replace(/\n+/g, '\n') // Normalize newlines
                  .trim();
                return text;
              }
            }
          }

          return null;
        });

        if (!response) {
          throw new Error('Could not extract response text from page');
        }

        const duration = Date.now() - startTime;
        console.log(`[Scraper] Success! (${duration}ms)`);

        return {
          success: true,
          response,
          duration,
        };
      } finally {
        await page.close();
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Scraper] Error: ${errorMsg}`);

      return {
        success: false,
        error: errorMsg,
        duration,
      };
    }
  }

  /**
   * Retry wrapper with exponential backoff
   */
  async scrapeWithRetry(
    prompt: string,
    model?: string,
    retries: number = this.config.retries!
  ): Promise<ScraperResponse> {
    let lastError: ScraperResponse | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      console.log(`[Scraper] Attempt ${attempt}/${retries}`);
      const result = await this.scrapePrompt(prompt, model);

      if (result.success) {
        return result;
      }

      lastError = result;

      if (attempt < retries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
        console.log(`[Scraper] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return lastError || { success: false, error: 'Max retries exceeded', duration: 0 };
  }
}

export default UseAiScraper;
export type { UseAiScraperConfig, ScraperResponse };
