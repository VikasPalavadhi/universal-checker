import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { geminiScraperService } from './gemini-scraper.service';

export interface ScrapedContent {
  url: string;
  html: string;
  text: string;
  title: string;
  statusCode: number;
  contentType: string;
  redirectedTo?: string;
  method: 'cheerio' | 'gemini-url-context' | 'gemini-search' | 'manual';
  scrapingError?: string;
  seoMetadata?: {
    metaTitle: string;
    metaDescription: string;
    ogTitle: string;
    ogDescription: string;
  };
}

class UrlScraperService {
  /**
   * 3-TIER URL SCRAPING STRATEGY:
   *
   * Tier 1: Cheerio + node-fetch (fast, lightweight, works 90% of time)
   * Tier 2: Gemini AI (handles Cloudflare, JavaScript-heavy sites, FREE tier)
   * Tier 3: Manual paste fallback (when all else fails)
   */
  async scrapeUrl(url: string): Promise<ScrapedContent> {
    console.log(`\n🌐 Starting URL scrape: ${url}`);

    // TIER 1: Try cheerio first (fast, free, works most of the time)
    try {
      console.log('📊 [Tier 1] Trying cheerio + node-fetch...');
      const result = await this.scrapeWithCheerio(url);
      console.log('✅ [Tier 1] Success with cheerio!');
      return result;
    } catch (cheerioError: any) {
      console.log(`⚠️  [Tier 1] Cheerio failed: ${cheerioError.message}`);

      // Check if it's a Cloudflare or JavaScript-heavy site error
      if (this.isCloudflareOrJSError(cheerioError)) {
        // TIER 2: Try Gemini AI scraping (handles Cloudflare, FREE tier)
        try {
          console.log('🤖 [Tier 2] Trying Gemini AI scraping...');
          const geminiResult = await geminiScraperService.scrapeUrl(url);

          // Convert Gemini result to our standard format
          const html = geminiScraperService.parseToHTML(geminiResult);
          const text = geminiScraperService.extractText(geminiResult);

          console.log(`✅ [Tier 2] Success with Gemini (method: ${geminiResult.method})!`);

          return {
            url: geminiResult.url,
            html,
            text,
            title: geminiResult.title,
            statusCode: 200,
            contentType: 'text/html',
            method: geminiResult.method,
            seoMetadata: {
              metaTitle: geminiResult.title,
              metaDescription: geminiResult.metaDescription || '',
              ogTitle: geminiResult.ogTitle || '',
              ogDescription: geminiResult.ogDescription || '',
            },
          };
        } catch (geminiError: any) {
          console.log(`❌ [Tier 2] Gemini also failed: ${geminiError.message}`);

          // TIER 3: Manual paste required
          throw new Error(
            'MANUAL_PASTE_REQUIRED: Unable to scrape this URL automatically. ' +
            'This site may have strong anti-bot protection. ' +
            'Please copy the page HTML manually and paste it, or try again later.'
          );
        }
      } else {
        // Not a Cloudflare error - just rethrow
        throw cheerioError;
      }
    }
  }

  /**
   * TIER 1: Cheerio + node-fetch scraping (fast, lightweight)
   */
  private async scrapeWithCheerio(url: string): Promise<ScrapedContent> {
    try {
      // Validate URL format
      const urlObj = new URL(url);

      console.log(`  → Fetching URL: ${url}`);

      // Fetch the page with enhanced headers to avoid basic blocks
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0',
        },
        redirect: 'follow',
        timeout: 15000, // 15 seconds timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const contentType = response.headers.get('content-type') || '';

      // Check if it's HTML
      if (!contentType.includes('text/html')) {
        throw new Error(`URL did not return HTML content (received: ${contentType})`);
      }

      // Check for Cloudflare challenge page
      if (this.isCloudflareChallenge(html)) {
        throw new Error('CLOUDFLARE_DETECTED: Site is protected by Cloudflare');
      }

      // Parse HTML and extract text
      const $ = cheerio.load(html);

      // Extract SEO metadata BEFORE removing elements
      const seoMetadata = {
        metaTitle: $('title').text().trim() || '',
        metaDescription: $('meta[name="description"]').attr('content')?.trim() || '',
        ogTitle: $('meta[property="og:title"]').attr('content')?.trim() || '',
        ogDescription: $('meta[property="og:description"]').attr('content')?.trim() || '',
      };

      // Remove script, style, and non-content elements
      $('script, style, noscript').remove();

      // ⭐ SKIP header, nav, footer, sidebar, ads, cookie banners
      $('header, nav, footer, aside, [role="navigation"], [role="banner"], [role="contentinfo"]').remove();
      $('[class*="nav"], [class*="menu"], [class*="header"], [class*="footer"]').remove();
      $('[class*="sidebar"], [class*="cookie"], [class*="consent"], [class*="banner"]').remove();
      $('[id*="nav"], [id*="menu"], [id*="header"], [id*="footer"]').remove();

      // Get title
      const title = $('title').text().trim() || 'No title';

      // Extract text from main content area (prioritize main, article, or body)
      let text = '';
      const mainContent = $('main, article, [role="main"], .content, #content');

      if (mainContent.length > 0) {
        // Found main content area - extract only from there
        text = mainContent.text();
      } else {
        // Fallback to body if no main content found
        text = $('body').text();
      }

      // Clean up whitespace
      text = text
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, ' ')
        .trim();

      console.log(`  → Successfully scraped: ${title}`);

      return {
        url: response.url, // Final URL after redirects
        html,
        text,
        title,
        statusCode: response.status,
        contentType,
        redirectedTo: response.url !== url ? response.url : undefined,
        method: 'cheerio',
        seoMetadata,
      };
    } catch (error: any) {
      console.error(`  → Cheerio error: ${error.message}`);

      // Provide user-friendly error messages
      if (error.code === 'ENOTFOUND') {
        throw new Error('URL not found. Please check the URL and try again.');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Connection refused. The server may be down.');
      } else if (error.name === 'AbortError') {
        throw new Error('Request timeout. The page took too long to load.');
      } else if (error.message.includes('Invalid URL')) {
        throw new Error('Invalid URL format. Please provide a valid URL.');
      }

      throw error;
    }
  }

  /**
   * Detect Cloudflare challenge page
   */
  private isCloudflareChallenge(html: string): boolean {
    return (
      html.includes('cf-browser-verification') ||
      html.includes('Checking your browser') ||
      html.includes('cloudflare') && html.includes('challenge-platform') ||
      html.includes('Just a moment...')
    );
  }

  /**
   * Determine if error is Cloudflare or JavaScript-related
   */
  private isCloudflareOrJSError(error: any): boolean {
    const errorMessage = error.message.toLowerCase();

    return (
      errorMessage.includes('cloudflare') ||
      errorMessage.includes('403') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('challenge') ||
      errorMessage.includes('captcha') ||
      errorMessage.includes('blocked') ||
      errorMessage.includes('access denied')
    );
  }

  /**
   * Extract text from HTML (helper method)
   */
  extractTextFromHTML(html: string): string {
    const $ = cheerio.load(html);

    // Remove script, style, and other non-content elements
    $('script, style, noscript, iframe, object, embed').remove();

    // Get text
    let text = $('body').text();

    // Clean up entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    return text;
  }
}

export const urlScraperService = new UrlScraperService();
