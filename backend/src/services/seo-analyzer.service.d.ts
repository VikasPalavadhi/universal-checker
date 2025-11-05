export interface MetaTag {
    name?: string;
    property?: string;
    content: string;
    httpEquiv?: string;
}
export interface SchemaData {
    type: string;
    data: any;
    isValid: boolean;
}
export interface SEOAnalysis {
    title: {
        content: string;
        length: number;
        score: number;
        issues: string[];
    };
    metaDescription: {
        content: string;
        length: number;
        score: number;
        issues: string[];
    };
    metaTags: MetaTag[];
    openGraph: {
        present: boolean;
        tags: MetaTag[];
        issues: string[];
    };
    twitterCard: {
        present: boolean;
        tags: MetaTag[];
        issues: string[];
    };
    technical: {
        canonical: string | null;
        robots: string | null;
        language: string | null;
        viewport: string | null;
        favicon: boolean;
        issues: Array<{
            severity: string;
            message: string;
            category: string;
        }>;
    };
    headings: {
        h1: string[];
        h2Count: number;
        h3Count: number;
        h4Count: number;
        h5Count: number;
        h6Count: number;
        issues: Array<{
            severity: string;
            message: string;
            category: string;
        }>;
    };
    schemas: {
        found: boolean;
        count: number;
        types: string[];
        data: SchemaData[];
        issues: string[];
    };
    images: {
        total: number;
        withoutAlt: number;
        issues: Array<{
            severity: string;
            message: string;
            src?: string;
        }>;
    };
    links: {
        internal: number;
        external: number;
        broken: number;
        nofollow: number;
    };
    overallScore: number;
}
declare class SeoAnalyzerService {
    /**
     * Analyze SEO aspects of HTML content
     */
    analyzeSEO(html: string, url: string, urlType?: string): SEOAnalysis;
    /**
     * Analyze title tag
     */
    private analyzeTitle;
    /**
     * Analyze meta description
     */
    private analyzeMetaDescription;
    /**
     * Extract all meta tags
     */
    private extractMetaTags;
    /**
     * Analyze Open Graph tags
     */
    private analyzeOpenGraph;
    /**
     * Analyze Twitter Card tags
     */
    private analyzeTwitterCard;
    /**
     * Analyze technical SEO elements
     */
    private analyzeTechnicalSEO;
    /**
     * Analyze heading structure
     */
    private analyzeHeadings;
    /**
     * Analyze schema markup
     */
    private analyzeSchemas;
    /**
     * Analyze images
     */
    private analyzeImages;
    /**
     * Analyze links
     */
    private analyzeLinks;
    /**
     * Calculate overall SEO score
     */
    private calculateOverallScore;
}
export declare const seoAnalyzerService: SeoAnalyzerService;
export {};
//# sourceMappingURL=seo-analyzer.service.d.ts.map