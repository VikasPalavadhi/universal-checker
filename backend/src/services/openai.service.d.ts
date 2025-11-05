interface CheckResult {
    grammarIssues: any[];
    brandIssues: any[];
    toneAnalysis: any;
    suggestions: string[];
}
declare class OpenAIService {
    private client;
    constructor();
    checkContent(text: string, language?: string): Promise<CheckResult>;
    private getEnglishPrompt;
    private getArabicPrompt;
    /**
     * Analyze SEO aspects with AI suggestions
     */
    analyzeSEO(seoData: any, urlType: string): Promise<{
        titleSuggestion: string;
        descriptionSuggestion: string;
        keywordOpportunities: string[];
        contentSuggestions: string[];
        schemaSuggestions: string[];
    }>;
    private getSEOPrompt;
}
export declare const openaiService: OpenAIService;
export {};
//# sourceMappingURL=openai.service.d.ts.map