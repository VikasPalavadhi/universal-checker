export interface ScrapedContent {
    url: string;
    html: string;
    text: string;
    title: string;
    statusCode: number;
    contentType: string;
    redirectedTo?: string;
}
declare class UrlScraperService {
    /**
     * Fetch and parse a URL
     */
    scrapeUrl(url: string): Promise<ScrapedContent>;
    /**
     * Extract text from HTML (similar to checker service)
     */
    extractTextFromHTML(html: string): string;
}
export declare const urlScraperService: UrlScraperService;
export {};
//# sourceMappingURL=url-scraper.service.d.ts.map