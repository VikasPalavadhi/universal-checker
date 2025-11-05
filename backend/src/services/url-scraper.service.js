"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.urlScraperService = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const cheerio = __importStar(require("cheerio"));
class UrlScraperService {
    /**
     * Fetch and parse a URL
     */
    async scrapeUrl(url) {
        try {
            // Validate URL format
            const urlObj = new URL(url);
            console.log(`🌐 Fetching URL: ${url}`);
            // Fetch the page
            const response = await (0, node_fetch_1.default)(url, {
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
        }
        catch (error) {
            console.error(`❌ Scraping error for ${url}:`, error.message);
            if (error.code === 'ENOTFOUND') {
                throw new Error('URL not found. Please check the URL and try again.');
            }
            else if (error.code === 'ECONNREFUSED') {
                throw new Error('Connection refused. The server may be down.');
            }
            else if (error.name === 'AbortError') {
                throw new Error('Request timeout. The page took too long to load.');
            }
            else if (error.message.includes('Invalid URL')) {
                throw new Error('Invalid URL format. Please provide a valid URL.');
            }
            throw error;
        }
    }
    /**
     * Extract text from HTML (similar to checker service)
     */
    extractTextFromHTML(html) {
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
exports.urlScraperService = new UrlScraperService();
//# sourceMappingURL=url-scraper.service.js.map