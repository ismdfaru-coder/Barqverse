import { chromium, Browser, Page } from 'playwright';

/**
 * USE.AI PLAYWRIGHT SCRAPER v2 - OPTIMIZED WITH DOM EXTRACTION
 * Based on actual use.ai UI flow from screenshots
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

class UseAiScraperV2 {
  private browser: Browser | null = null;
  private config: UseAiScraperConfig;

  // DOM Selectors based on actual screenshots
  private selectors = {
    // Homepage
    signInButton: 'button:has-text("Sign in")',
    
    // Login Modal - Phase 1
    continueWithEmailButton: 'button:has-text("Continue with email")',
    
    // Login Modal - Phase 2 (Email Input)
    emailInput: 'input[type="email"]',
    continueButton: 'button:has-text("Continue")',
    
    // Close modal/popup
    closeButton: 'button[aria-label="Close"]',
    xButton: 'button:has-text("✕")',
    
    // Upgrade popup (screenshot 3)
    upgradePopup: '[class*="upgrade"], [class*="modal"], [role="dialog"]',
    
    // Chat Interface (screenshot 4-5)
    modelDropdown: 'button:has-text("Auto")',
    modelSelector: 'select, [role="combobox"]',
    
    // Model options (screenshot 4-5)
    fable5Option: 'text="Fable 5"',
    sonnet5Option: 'text="Sonnet 5"',
    autoOption: 'text="Auto"',
    
    // Chat input (screenshot 6)
    chatInput: 'textarea[placeholder*="Type"], input[placeholder*="message"], [contenteditable="true"]',
    sendButton: 'button[aria-label="Send"], button:has-text("➤"), button svg[viewBox]',
    
    // Response extraction (screenshot 8-9)
    messageContainer: '[role="article"]',
    responseText: '.message-content, [class*="response"], [class*="message"]',
  };

  constructor(config: UseAiScraperConfig) {
    this.config = {
      headless: true,
      timeout: 30000,
      retries: 3,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    if (this.browser) return;
    
    try {
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: ['--disable-blink-features=AutomationControlled'],
      });
      console.log('[Scraper V2] ✅ Browser launched');
    } catch (error) {
      throw new Error(`Failed to launch browser: ${error}`);
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('[Scraper V2] ✅ Browser closed');
    }
  }

  async scrapePrompt(prompt: string, model: string = 'Auto'): Promise<ScraperResponse> {
    const startTime = Date.now();

    try {
      await this.initialize();
      if (!this.browser) throw new Error('Browser not initialized');

      const page = await this.browser.newPage();
      page.setDefaultTimeout(this.config.timeout!);

      try {
        // ============================================================
        // PHASE 1: NAVIGATE & LOGIN
        // ============================================================
        
        console.log('[Scraper V2] 📍 Step 1: Navigate to use.ai');
        await page.goto('https://use.ai', { waitUntil: 'networkidle' });
        await page.waitForLoadState('domcontentloaded');

        // ============================================================
        // PHASE 2: CLICK SIGN IN
        // ============================================================
        
        console.log('[Scraper V2] 🔐 Step 2: Click "Sign in" button');
        try {
          await page.click(this.selectors.signInButton, { timeout: 5000 });
          await page.waitForTimeout(1000);
        } catch (error) {
          console.log('[Scraper V2] ⚠️ Sign in button not found, might already be logged in');
        }

        // ============================================================
        // PHASE 3: HANDLE LOGIN MODAL - Part 1 (Social buttons)
        // ============================================================
        
        console.log('[Scraper V2] 📧 Step 3: Click "Continue with email"');
        try {
          // Wait for modal to appear
          await page.waitForSelector('text="Continue with email"', { timeout: 5000 });
          await page.click(this.selectors.continueWithEmailButton);
          await page.waitForTimeout(500);
        } catch (error) {
          console.log('[Scraper V2] ⚠️ Already logged in or modal structure different');
        }

        // ============================================================
        // PHASE 4: HANDLE LOGIN MODAL - Part 2 (Email input)
        // ============================================================
        
        console.log(`[Scraper V2] ✉️ Step 4: Enter email: ${this.config.email}`);
        try {
          // Wait for email input to appear
          await page.waitForSelector(this.selectors.emailInput, { timeout: 10000 });
          
          // Fill email
          await page.fill(this.selectors.emailInput, this.config.email);
          console.log('[Scraper V2] ✅ Email filled');
          
          // Click Continue
          await page.click(this.selectors.continueButton);
          console.log('[Scraper V2] ✅ Clicked Continue');
          
          // Wait for login to complete
          await page.waitForTimeout(2000);
        } catch (error) {
          console.log('[Scraper V2] ⚠️ Email input phase failed:', error);
        }

        // ============================================================
        // PHASE 5: CLOSE UPGRADE POPUP (if appears)
        // ============================================================
        
        console.log('[Scraper V2] 🎯 Step 5: Check for upgrade popup');
        try {
          // Wait briefly for popup
          const popup = await page.$(this.selectors.upgradePopup);
          if (popup) {
            console.log('[Scraper V2] ❌ Upgrade popup found, closing...');
            
            // Try clicking X button
            try {
              await page.click('button[aria-label="Close"]');
              console.log('[Scraper V2] ✅ Popup closed via X button');
            } catch {
              // Try clicking outside popup
              await page.click('body', { position: { x: 100, y: 100 } });
              console.log('[Scraper V2] ✅ Popup closed via click outside');
            }
            
            await page.waitForTimeout(500);
          }
        } catch (error) {
          console.log('[Scraper V2] ℹ️ No popup detected');
        }

        // ============================================================
        // PHASE 6: WAIT FOR CHAT INTERFACE
        // ============================================================
        
        console.log('[Scraper V2] 💬 Step 6: Wait for chat interface');
        try {
          await page.waitForSelector(this.selectors.chatInput, { timeout: 15000 });
          console.log('[Scraper V2] ✅ Chat interface loaded');
        } catch (error) {
          throw new Error('Chat interface failed to load');
        }

        // ============================================================
        // PHASE 7: SELECT MODEL
        // ============================================================
        
        console.log(`[Scraper V2] 🤖 Step 7: Select model: ${model}`);
        try {
          // Click dropdown
          await page.click(this.selectors.modelDropdown, { timeout: 3000 });
          console.log('[Scraper V2] ✅ Model dropdown opened');
          
          await page.waitForTimeout(500);

          // Select the model
          const modelSelector = `text="${model}"`;
          try {
            await page.click(modelSelector);
            console.log(`[Scraper V2] ✅ Selected model: ${model}`);
          } catch {
            console.log('[Scraper V2] ⚠️ Model not found, using default');
          }

          await page.waitForTimeout(500);
        } catch (error) {
          console.log('[Scraper V2] ⚠️ Model selection skipped');
        }

        // ============================================================
        // PHASE 8: SEND PROMPT
        // ============================================================
        
        console.log(`[Scraper V2] 📝 Step 8: Send prompt: "${prompt.substring(0, 50)}..."`);
        
        // Fill prompt in input
        await page.fill(this.selectors.chatInput, prompt);
        console.log('[Scraper V2] ✅ Prompt typed');
        
        await page.waitForTimeout(300);

        // Send (press Enter)
        console.log('[Scraper V2] 🚀 Sending message...');
        await page.press(this.selectors.chatInput, 'Enter');

        // ============================================================
        // PHASE 9: WAIT FOR RESPONSE
        // ============================================================
        
        console.log('[Scraper V2] ⏳ Step 9: Waiting for AI response (max 30s)...');
        
        // Strategy: Wait for at least 2 messages (user + assistant)
        try {
          await page.waitForFunction(
            () => {
              const messages = document.querySelectorAll('[role="article"]');
              console.log(`Messages found: ${messages.length}`);
              return messages.length >= 2;
            },
            { timeout: this.config.timeout }
          );
          console.log('[Scraper V2] ✅ Response detected in DOM');
        } catch (error) {
          // Fallback: wait by checking for specific text patterns
          console.log('[Scraper V2] ⚠️ First strategy failed, trying alternative wait...');
          await page.waitForTimeout(5000);
        }

        // ============================================================
        // PHASE 10: EXTRACT RESPONSE FROM DOM
        // ============================================================
        
        console.log('[Scraper V2] 🔍 Step 10: Extracting response from DOM...');
        
        const responseText = await page.evaluate(() => {
          console.log('[Scraper V2] Running DOM extraction...');

          // STRATEGY 1: Look for [role="article"] elements (messages)
          const messages = document.querySelectorAll('[role="article"]');
          console.log(`Found ${messages.length} message containers`);

          if (messages.length >= 2) {
            // Get the last message (most recent = AI response)
            const lastMessage = messages[messages.length - 1];
            
            // Extract text
            let text = lastMessage.textContent || '';
            
            // Clean up the text
            text = text
              .trim()
              .replace(/\s+/g, ' ')        // Multiple spaces → single space
              .replace(/\n+/g, '\n')       // Multiple newlines → single newline
              .slice(0, 5000);              // Limit to 5000 chars
            
            if (text.length > 50) {
              console.log(`✅ Extraction successful (${text.length} chars)`);
              return text;
            }
          }

          // STRATEGY 2: Look for elements with class containing "message"
          const messageContent = document.querySelector(
            '[class*="message"][class*="content"], .message-content, .response-content'
          );
          
          if (messageContent?.textContent) {
            let text = messageContent.textContent.trim().replace(/\s+/g, ' ');
            if (text.length > 50) {
              console.log(`✅ Strategy 2 successful (${text.length} chars)`);
              return text;
            }
          }

          // STRATEGY 3: Get all divs, find the one with longest text (likely response)
          const allDivs = document.querySelectorAll('div');
          const longestDiv = Array.from(allDivs).reduce((max, current) => {
            return (current.textContent?.length || 0) > (max.textContent?.length || 0)
              ? current
              : max;
          });

          if (longestDiv?.textContent) {
            let text = longestDiv.textContent.trim().replace(/\s+/g, ' ').slice(0, 5000);
            if (text.length > 100) {
              console.log(`✅ Strategy 3 successful (${text.length} chars)`);
              return text;
            }
          }

          console.log('❌ All strategies failed - no text found');
          return null;
        });

        if (!responseText || responseText.length === 0) {
          throw new Error('Failed to extract response text - DOM extraction returned empty');
        }

        const duration = Date.now() - startTime;
        
        console.log('[Scraper V2] ✅ SUCCESS!');
        console.log(`[Scraper V2] Duration: ${duration}ms`);
        console.log(`[Scraper V2] Response length: ${responseText.length} chars`);
        console.log(`[Scraper V2] Preview: ${responseText.substring(0, 100)}...`);

        return {
          success: true,
          response: responseText,
          duration,
        };

      } finally {
        await page.close();
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      console.error(`[Scraper V2] ❌ ERROR after ${duration}ms: ${errorMsg}`);

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
      console.log(`\n[Scraper V2] 🔄 Attempt ${attempt}/${retries}`);
      const result = await this.scrapePrompt(prompt, model);

      if (result.success) {
        console.log(`[Scraper V2] ✅ SUCCESS on attempt ${attempt}`);
        return result;
      }

      lastError = result;

      if (attempt < retries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`[Scraper V2] ⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.log(`[Scraper V2] ❌ Failed after ${retries} attempts`);
    return lastError || {
      success: false,
      error: 'Max retries exceeded',
      duration: 0,
    };
  }
}

export default UseAiScraperV2;
export type { UseAiScraperConfig, ScraperResponse };
