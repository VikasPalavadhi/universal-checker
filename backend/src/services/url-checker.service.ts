import { ocrService } from './ocr.service';
import { openaiService } from './openai.service';
import { rulesEngine } from './rules-engine.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface CheckResult {
  id: string;
  fileName: string;
  fileType: string;
  status: string;
  extractedText: string;
  language: string;
  ocrUsed: boolean;
  ocrConfidence?: number;

  // Issues categorized by type
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

  // Summary metrics
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

class CheckerService {
  /**
   * ⭐ NEW: Check URL with only applicable rules
   * Excludes EDM-specific checks like:
   * - Custom variables ([Field: Name])
   * - Font family validation (PB_Font specific)
   * - Color validation (brand colors for uploaded files)
   * - Staging URL detection (internal only)
   */
  async checkUrl(html: string, text: string, contentType: string = 'web'): Promise<CheckResult> {
    const startTime = Date.now();
    const checkId = uuidv4();

    try {
      // Detect language
      const isArabic = /[\u0600-\u06FF]/.test(text);
      const language = isArabic ? 'ara' : 'eng';

      // Run ONLY URL-applicable checks in parallel
      const [
        aiResult,
        brandIssues,
        numericalIssues,
        ctaIssues,
        linkIssues,
        imageIssues
      ] = await Promise.all([
        // OpenAI grammar and content check
        openaiService.checkContent(text, language),

        // Basic brand compliance (text-based only, no template-specific rules)
        Promise.resolve(rulesEngine.checkText(text, contentType)),

        // Numerical format check
        Promise.resolve(rulesEngine.checkNumericalFormats(text)),

        // CTA optimization check
        Promise.resolve(rulesEngine.checkCTA(text)),

        // Link validation (IMPORTANT for URLs)
        html ? Promise.resolve(rulesEngine.validateLinks(html, language)) : Promise.resolve([]),

        // Image validation
        html ? Promise.resolve(rulesEngine.validateImages(html)) : Promise.resolve([])
      ]);

      // ⭐ SKIP these URL-inappropriate checks:
      // - validateCustomVariables (EDM templates only)
      // - validateFontFamily (uploaded HTML files only)
      // - validateColors (brand-specific uploaded files only)
      // - validateProductionUrls (internal staging detection only)

      // Combine all issues
      const allIssues = [
        ...aiResult.grammarIssues,
        ...aiResult.brandIssues,
        ...brandIssues,
        ...numericalIssues,
        ...ctaIssues,
        ...linkIssues,
        ...imageIssues
      ];

      // Filter out EDM-specific issues
      const filteredIssues = this.filterUrlApplicableIssues(allIssues);

      // Categorize issues
      const categorizedIssues = this.categorizeIssues(filteredIssues);

      // Calculate metrics
      const metrics = this.calculateMetrics(categorizedIssues);

      // Build result
      const result: CheckResult = {
        id: checkId,
        fileName: 'url-check',
        fileType: 'url',
        status: 'completed',
        extractedText: text.substring(0, 500),  // Preview for display
        fullText: text,  // ⭐ Full text for verification
        language,
        ocrUsed: false,
        issues: categorizedIssues,
        metrics,
        suggestions: aiResult.suggestions || [],
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      } as any;

      // Save result to file
      await this.saveResult(result);

      return result;
    } catch (error: any) {
      throw new Error(`URL check failed: ${error.message}`);
    }
  }

  /**
   * Filter issues to keep only those applicable to external URLs
   * ⭐ ENHANCED: More aggressive filtering to reduce false positives
   */
  private filterUrlApplicableIssues(issues: any[]): any[] {
    return issues.filter(issue => {
      // Exclude EDM-specific rule categories
      const excludedRuleIds = [
        'variable_format',      // [Field: Name] checks
        'font_family',          // Font validation
        'color_validation',     // Brand color checks
        'staging_url',          // Internal staging detection
        'template_',            // Template-specific rules
        'edm_',                 // EDM-specific rules
      ];

      // Exclude low-severity non-critical issues for URLs
      const excludedCategoriesForUrls = [
        'cta',                  // CTA optimization (websites have their own CTA strategy)
        'tone',                 // Tone checks (less relevant for public websites)
      ];

      // Check if rule_id starts with excluded patterns
      const isExcluded = excludedRuleIds.some(pattern =>
        issue.rule_id?.startsWith(pattern)
      );

      // Check if category should be excluded for URLs
      const isCategoryExcluded = excludedCategoriesForUrls.includes(issue.category) &&
                                  (issue.severity === 'low' || issue.severity === 'medium');

      return !isExcluded && !isCategoryExcluded;
    });
  }

  /**
   * Original checkText method (for EDM/uploaded files)
   */
  async checkText(text: string, contentType: string = 'edm'): Promise<CheckResult> {
    const startTime = Date.now();
    const checkId = uuidv4();

    // Detect language
    const isArabic = /[\u0600-\u06FF]/.test(text);
    const language = isArabic ? 'ara' : 'eng';

    // Run all checks including EDM-specific ones
    const [
      aiResult,
      brandIssues,
      numericalIssues,
      ctaIssues,
      customVariableIssues  // EDM-specific
    ] = await Promise.all([
      openaiService.checkContent(text, language),
      Promise.resolve(rulesEngine.checkText(text, contentType)),
      Promise.resolve(rulesEngine.checkNumericalFormats(text)),
      Promise.resolve(rulesEngine.checkCTA(text)),
      Promise.resolve(rulesEngine.validateCustomVariables(text))
    ]);

    const allIssues = [
      ...aiResult.grammarIssues,
      ...aiResult.brandIssues,
      ...brandIssues,
      ...numericalIssues,
      ...ctaIssues,
      ...customVariableIssues
    ];

    const categorizedIssues = this.categorizeIssues(allIssues);
    const metrics = this.calculateMetrics(categorizedIssues);

    const result: CheckResult = {
      id: checkId,
      fileName: 'text-check',
      fileType: 'text',
      status: 'completed',
      extractedText: text.substring(0, 500),
      language,
      ocrUsed: false,
      issues: categorizedIssues,
      metrics,
      suggestions: aiResult.suggestions || [],
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    await this.saveResult(result);
    return result;
  }

  /**
   * Extract text from HTML, removing tags and scripts
   */
  private extractTextFromHTML(html: string): string {
    // Remove script and style tags
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  /**
   * Categorize issues by type
   */
  private categorizeIssues(issues: any[]) {
    return {
      grammar: issues.filter(i => i.type === 'grammar' || i.category === 'grammar'),
      brand: issues.filter(i => i.category === 'brand_compliance' || i.category === 'brand_voice'),
      numerical: issues.filter(i => i.category === 'numerical_format'),
      links: issues.filter(i => i.type === 'link_validation' || i.category === 'broken_links'),
      images: issues.filter(i => i.type === 'image_validation'),
      cta: issues.filter(i => i.category === 'cta'),
      tone: issues.filter(i => i.category === 'tone'),
      legal: issues.filter(i => i.category === 'legal_compliance'),
      accessibility: issues.filter(i => i.category?.includes('accessibility'))
    };
  }

  /**
   * Calculate metrics and compliance score
   */
  private calculateMetrics(issues: any) {
    const allIssues = Object.values(issues).flat() as any[];

    const criticalCount = allIssues.filter(i => i.severity === 'critical').length;
    const highCount = allIssues.filter(i => i.severity === 'high').length;
    const mediumCount = allIssues.filter(i => i.severity === 'medium').length;
    const lowCount = allIssues.filter(i => i.severity === 'low').length;

    // Calculate compliance score (start at 100, subtract points)
    const score = Math.max(0, 100 - (
      (criticalCount * 20) +
      (highCount * 10) +
      (mediumCount * 5) +
      (lowCount * 2)
    ));

    return {
      totalIssues: allIssues.length,
      criticalIssues: criticalCount,
      highIssues: highCount,
      mediumIssues: mediumCount,
      lowIssues: lowCount,
      complianceScore: score
    };
  }

  /**
   * Save check result to JSON file
   */
  private async saveResult(result: CheckResult): Promise<void> {
    const resultsDir = process.env.RESULTS_DIR || './storage/results';

    // Create results directory if it doesn't exist
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const filePath = path.join(resultsDir, `${result.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
  }

  /**
   * Get result by ID
   */
  async getResult(id: string): Promise<CheckResult | null> {
    const resultsDir = process.env.RESULTS_DIR || './storage/results';
    const filePath = path.join(resultsDir, `${id}.json`);

    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }

    return null;
  }

  /**
   * Get recent check history
   */
  async getHistory(limit: number = 10): Promise<CheckResult[]> {
    const resultsDir = process.env.RESULTS_DIR || './storage/results';

    if (!fs.existsSync(resultsDir)) {
      return [];
    }

    const files = fs.readdirSync(resultsDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(resultsDir, f),
        time: fs.statSync(path.join(resultsDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time)
      .slice(0, limit);

    const results = files.map(f => {
      const data = fs.readFileSync(f.path, 'utf-8');
      return JSON.parse(data);
    });

    return results;
  }
}

export const checkerService = new CheckerService();
