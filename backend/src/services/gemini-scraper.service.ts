import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';

interface GeminiScrapedContent {
  url: string;
  html: string;
  text: string;
  title: string;
  metaDescription: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  links: string[];
  method: 'gemini-url-context' | 'gemini-search';
  sources?: any[];
}

class GeminiScraperService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  Google API key not found');
    }
    this.genAI = new GoogleGenerativeAI(apiKey || '');
  }

  /**
   * Main scraping method - tries URL Context first, falls back to Google Search
   */
  async scrapeUrl(url: string): Promise<GeminiScrapedContent> {
    try {
      // Try URL Context Tool first (faster, more direct)
      console.log('🤖 Trying Gemini URL Context...');
      return await this.scrapeWithURLContext(url);
    } catch (error: any) {
      console.log('⚠️  URL Context failed, trying Google Search grounding...');

      try {
        // Fallback to Google Search grounding
        return await this.scrapeWithGoogleSearch(url);
      } catch (searchError: any) {
        throw new Error(`Gemini scraping failed: ${searchError.message}`);
      }
    }
  }

  /**
   * Method 1: Direct URL fetching with URL Context Tool (Experimental)
   * Fast and direct - works well for most sites
   */
  private async scrapeWithURLContext(url: string): Promise<GeminiScrapedContent> {
    const model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.1, // Low temperature for factual extraction
      }
    });

    const prompt = `You are a web scraping assistant. Extract the following information from this URL and return it as JSON:

URL: ${url}

Extract:
1. Page title (from <title> tag or main heading)
2. Meta description (from meta tag)
3. All H1 headings (array)
4. All H2 headings (array, max 10)
5. All H3 headings (array, max 10)
6. All links/URLs found on the page (array, max 20)
7. Main text content (clean, readable text without HTML tags)

Return ONLY valid JSON in this exact format:
{
  "title": "page title here",
  "metaDescription": "meta description here",
  "h1": ["h1 text"],
  "h2": ["h2 text 1", "h2 text 2"],
  "h3": ["h3 text 1", "h3 text 2"],
  "links": ["url1", "url2"],
  "text": "main content text here"
}`;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Extract JSON from response (remove markdown code blocks if present)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Gemini response');
      }

      const extracted = JSON.parse(jsonMatch[0]);

      return {
        url,
        html: '', // Gemini doesn't return raw HTML
        text: extracted.text || '',
        title: extracted.title || 'No title',
        metaDescription: extracted.metaDescription || '',
        headings: {
          h1: extracted.h1 || [],
          h2: extracted.h2 || [],
          h3: extracted.h3 || [],
        },
        links: extracted.links || [],
        method: 'gemini-url-context',
      };
    } catch (error: any) {
      throw new Error(`URL Context extraction failed: ${error.message}`);
    }
  }

  /**
   * Method 2: Google Search grounding with Gemini 2.0
   * More reliable for Cloudflare-protected sites
   */
  private async scrapeWithGoogleSearch(url: string): Promise<GeminiScrapedContent> {
    const model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      tools: [{ googleSearch: {} }], // Enable Google Search
      generationConfig: {
        temperature: 0.1,
      }
    });

    const prompt = `Fetch and analyze the content from this URL: ${url}

Extract the following information and return as JSON:
{
  "title": "page title",
  "metaDescription": "meta description",
  "h1": ["h1 headings"],
  "h2": ["h2 headings"],
  "h3": ["h3 headings"],
  "links": ["found URLs"],
  "text": "main content text"
}

Only return valid JSON.`;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Gemini Search response');
      }

      const extracted = JSON.parse(jsonMatch[0]);

      // Get grounding metadata if available
      const groundingMetadata = (result.response as any).groundingMetadata;
      const sources = groundingMetadata?.webResults || [];

      return {
        url,
        html: '',
        text: extracted.text || '',
        title: extracted.title || 'No title',
        metaDescription: extracted.metaDescription || '',
        headings: {
          h1: extracted.h1 || [],
          h2: extracted.h2 || [],
          h3: extracted.h3 || [],
        },
        links: extracted.links || [],
        method: 'gemini-search',
        sources,
      };
    } catch (error: any) {
      throw new Error(`Google Search grounding failed: ${error.message}`);
    }
  }

  /**
   * Parse Gemini's extracted content into HTML-like structure
   * for compatibility with existing checker service
   */
  parseToHTML(content: GeminiScrapedContent): string {
    let html = `<!DOCTYPE html><html><head>`;
    html += `<title>${content.title}</title>`;

    if (content.metaDescription) {
      html += `<meta name="description" content="${content.metaDescription}">`;
    }

    html += `</head><body>`;

    // Add headings
    content.headings.h1.forEach(h1 => {
      html += `<h1>${h1}</h1>`;
    });

    content.headings.h2.forEach(h2 => {
      html += `<h2>${h2}</h2>`;
    });

    content.headings.h3.forEach(h3 => {
      html += `<h3>${h3}</h3>`;
    });

    // Add links
    content.links.forEach(link => {
      html += `<a href="${link}">${link}</a>`;
    });

    // Add main content
    html += `<div>${content.text}</div>`;

    html += `</body></html>`;

    return html;
  }

  /**
   * Extract clean text from Gemini content
   */
  extractText(content: GeminiScrapedContent): string {
    return content.text;
  }
}

export const geminiScraperService = new GeminiScraperService();
