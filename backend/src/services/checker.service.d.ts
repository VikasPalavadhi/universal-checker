interface CheckResult {
    id: string;
    fileName: string;
    fileType: string;
    status: string;
    extractedText: string;
    language: string;
    languages: string[];
    isBilingual: boolean;
    ocrUsed: boolean;
    ocrConfidence?: number | undefined;
    issues: {
        grammar: any[];
        brand: any[];
        numerical: any[];
        links: any[];
        images: any[];
        cta: any[];
        tone: any[];
        legal: any[];
        accessibility: any[];
    };
    issuesByLanguage?: {
        english: any[];
        arabic: any[];
        both: any[];
    } | undefined;
    metrics: {
        totalIssues: number;
        criticalIssues: number;
        highIssues: number;
        mediumIssues: number;
        lowIssues: number;
        complianceScore: number;
        englishIssues?: number | undefined;
        arabicIssues?: number | undefined;
    };
    suggestions: string[];
    processingTime: number;
    timestamp: string;
    seoAnalysis?: any;
    url?: string;
    urlType?: string;
}
declare class CheckerService {
    /**
     * Main check method - processes any file type
     * ⭐ ENHANCED: Now detects multiple languages and tags issues by language
     */
    checkFile(filePath: string, fileName: string): Promise<CheckResult>;
    /**
     * ⭐ NEW: Detect ALL languages in content
     */
    private detectLanguages;
    /**
     * ⭐ NEW: Split HTML into language sections
     */
    private splitByLanguageSections;
    /**
     * ⭐ NEW: Tag each issue with the language it belongs to
     */
    private tagIssuesWithLanguage;
    /**
     * ⭐ NEW: Group issues by language
     */
    private groupIssuesByLanguage;
    /**
     * Extract text from HTML, removing tags and scripts
     */
    private extractTextFromHTML;
    /**
     * Categorize issues by type
     */
    private categorizeIssues;
    /**
     * Calculate metrics from categorized issues
     * ⭐ ENHANCED: Now includes language-specific metrics
     */
    private calculateMetrics;
    /**
     * Save check result to JSON file
     */
    private saveResult;
    /**
     * Get result by ID
     */
    getResult(id: string): Promise<CheckResult | null>;
    /**
     * Get recent check history
     */
    getHistory(limit?: number): Promise<CheckResult[]>;
    /**
     * Check text directly (without file upload)
     */
    checkText(text: string, contentType?: string): Promise<CheckResult>;
    /**
     * ⭐ NEW: Check URL with full content + SEO analysis
     */
    checkUrl(url: string, urlType?: string): Promise<CheckResult>;
}
export declare const checkerService: CheckerService;
export {};
//# sourceMappingURL=checker.service.d.ts.map