interface CheckResult {
    id: string;
    fileName: string;
    fileType: string;
    status: string;
    extractedText: string;
    language: string;
    ocrUsed: boolean;
    ocrConfidence?: number;
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
    metrics: {
        totalIssues: number;
        criticalIssues: number;
        highIssues: number;
        mediumIssues: number;
        lowIssues: number;
        complianceScore: number;
    };
    suggestions: string[];
    processingTime: number;
    timestamp: string;
}
declare class CheckerService {
    /**
     * Main check method - processes any file type
     */
    checkFile(filePath: string, fileName: string): Promise<CheckResult>;
    /**
     * Extract text from HTML, removing tags and scripts
     */
    private extractTextFromHTML;
    /**
     * Categorize issues by type
     */
    private categorizeIssues;
    /**
     * Calculate metrics and compliance score
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
}
export declare const checkerService: CheckerService;
export {};
//# sourceMappingURL=Untitle.d.ts.map