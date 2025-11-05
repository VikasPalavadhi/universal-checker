import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export interface ScrapedContent {
  url: string;
  html: string;
  text: string;
  title: string;
  statusCode: number;
  contentType: string;
  redirectedTo?: string;
}

class UrlScraperService {
  /**
   * Fetch and parse a URL
   */
  async scrapeUrl(url: string): Promise<ScrapedContent> {
    try {
      // Validate URL format
      const urlObj = new URL(url);

      console.log(`🌐 Fetching URL: ${url}`);

      // Fetch the page
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
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

      // Parse HTML and extract text
      const $ = cheerio.load(html);

      // Remove script and style tags
      $('script, style, noscript').remove();

      // Get title
      const title = $('title').text().trim() || 'No title';

      // Extract text content
      const text = $('body').text()
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, ' ')
        .trim();

      console.log(`✅ Successfully scraped: ${title}`);

      return {
        url: response.url, // Final URL after redirects
        html,
        text,
        title,
        statusCode: response.status,
        contentType,
        redirectedTo: response.url !== url ? response.url : undefined,
      };
    } catch (error: any) {
      console.error(`❌ Scraping error for ${url}:`, error.message);

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
   * Extract text from HTML (similar to checker service)
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
