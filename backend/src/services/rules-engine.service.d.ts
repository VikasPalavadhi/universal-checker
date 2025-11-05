interface Issue {
    rule_id: string;
    type: string;
    category: string;
    severity: string;
    message: string;
    original: string;
    suggestion?: string | undefined;
    position?: number | undefined;
    length?: number | undefined;
    context?: string | undefined;
    link_text?: string | undefined;
    found?: string | undefined;
}
interface Rule {
    id: string;
    category: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    pattern: string;
    replacement?: string | undefined;
    message: string;
    suggestion?: string | undefined;
    context_exceptions?: string[] | undefined;
    applies_to?: string[] | undefined;
}
declare class RulesEngineEnhanced {
    private rules;
    private rulesPath;
    private readonly ALLOWED_COLORS;
    private readonly ALLOWED_DOMAINS;
    private readonly SOCIAL_MEDIA_DOMAINS;
    constructor();
    loadRules(): void;
    /**
     * Standard rule checking from YAML
     */
    checkText(text: string, contentType?: string): Issue[];
    /**
     * Check numerical and currency formats
     */
    checkNumericalFormats(text: string): Issue[];
    /**
     * Check Call-to-Action effectiveness
     */
    checkCTA(text: string): Issue[];
    /**
     * Comprehensive link validation with HTML structure checks
     */
    validateLinks(html: string, language?: string): Issue[];
    /**
     * Validate URL format
     */
    private isValidUrl;
    /**
     * Check if URL is a social media link (exempt from language checks)
     */
    private isSocialMediaLink;
    /**
     * Validate images
     */
    validateImages(html: string): Issue[];
    /**
     * Detect language (English or Arabic)
     */
    detectLanguage(text: string): string;
    /**
     * Validate font families based on filename AND language context
     * â­ ENHANCED: Now checks for Arabic font (Tajawal) universally
     */
    validateFontFamily(html: string, fileName: string): Issue[];
    /**
     * Validate colors
     */
    validateColors(html: string): Issue[];
    /**
     * Validate custom variable format [Field: VariableName]
     * CASE-SENSITIVE and EXACT match required
     * Shows exact text and location for each error
     */
    validateCustomVariables(text: string): Issue[];
    /**
     * Validate production URLs
     */
    validateProductionUrls(html: string): Issue[];
    private isException;
    getRules(): Rule[];
    reload(): void;
}
export declare const rulesEngine: RulesEngineEnhanced;
export {};
//# sourceMappingURL=rules-engine.service.d.ts.map