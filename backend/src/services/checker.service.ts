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
  languages: string[];  // ⭐ NEW: Array of detected languages
  isBilingual: boolean;  // ⭐ NEW: Flag for bilingual content
  ocrUsed: boolean;
  ocrConfidence?: number | undefined;
  
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
  
  // ⭐ NEW: Issues by language
  issuesByLanguage?: {
    english: any[];
    arabic: any[];
    both: any[];
  } | undefined;
  
  // Summary metrics
  metrics: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    complianceScore: number;
    englishIssues?: number | undefined;  // ⭐ NEW
    arabicIssues?: number | undefined;   // ⭐ NEW
  };
  
  suggestions: string[];
  processingTime: number;
  timestamp: string;
}

class CheckerService {
  /**
   * Main check method - processes any file type
   * ⭐ ENHANCED: Now detects multiple languages and tags issues by language
   */
  async checkFile(filePath: string, fileName: string): Promise<CheckResult> {
    const startTime = Date.now();
    const fileExt = fileName.split('.').pop()?.toLowerCase();
    const checkId = uuidv4();

    try {
      let text = '';
      let html = '';
      let ocrUsed = false;
      let ocrConfidence = 0;
      
      // Extract text based on file type
      if (fileExt === 'html' || fileExt === 'htm') {
        const htmlContent = fs.readFileSync(filePath, 'utf-8');
        text = this.extractTextFromHTML(htmlContent);
        html = htmlContent;
        ocrUsed = false;
      } 
      else if (['jpg', 'jpeg', 'png'].includes(fileExt || '')) {
        const ocrResult = await ocrService.extractText(filePath);
        text = ocrResult.text;
        ocrUsed = true;
        ocrConfidence = ocrResult.confidence || 0;
      }
      else {
        throw new Error('Unsupported file type');
      }

      if (!text || text.trim().length === 0) {
        throw new Error('No text could be extracted from file');
      }

      // ⭐ ENHANCED: Detect ALL languages present
      const languages = this.detectLanguages(html || text);
      const isBilingual = languages.length > 1;
      const primaryLanguage = languages[0] || 'eng';

      // ⭐ NEW: Split HTML into language sections if bilingual
      const sections = isBilingual && html ? this.splitByLanguageSections(html) : null;

      // Run all checks in parallel for better performance
      const [
        aiResult,
        brandIssues,
        numericalIssues,
        ctaIssues,
        linkIssues,
        imageIssues,
        customVariableIssues,
        fontIssues,
        colorIssues,
        stagingUrlIssues
      ] = await Promise.all([
        // OpenAI grammar and content check
        openaiService.checkContent(text, primaryLanguage),
        
        // Rules engine brand compliance
        Promise.resolve(rulesEngine.checkText(text, 'edm')),
        
        // Numerical format check
        Promise.resolve(rulesEngine.checkNumericalFormats(text)),
        
        // CTA optimization check
        Promise.resolve(rulesEngine.checkCTA(text)),
        
        // Link validation (if HTML)
        html ? Promise.resolve(rulesEngine.validateLinks(html, primaryLanguage)) : Promise.resolve([]),
        
        // Image validation (if HTML)
        html ? Promise.resolve(rulesEngine.validateImages(html)) : Promise.resolve([]),
        
        // ⭐ Custom variable validation (CASE-SENSITIVE)
        Promise.resolve(rulesEngine.validateCustomVariables(text)),
        
        // ⭐ Font family validation (if HTML)
        html ? Promise.resolve(rulesEngine.validateFontFamily(html, fileName)) : Promise.resolve([]),
        
        // ⭐ Color validation (if HTML)
        html ? Promise.resolve(rulesEngine.validateColors(html)) : Promise.resolve([]),
        
        // ⭐ Staging URL detection (CRITICAL)
        html ? Promise.resolve(rulesEngine.validateProductionUrls(html)) : Promise.resolve([])
      ]);

      // Combine all issues
      let allIssues = [
        ...aiResult.grammarIssues,
        ...aiResult.brandIssues,
        ...brandIssues,
        ...numericalIssues,
        ...ctaIssues,
        ...linkIssues,
        ...imageIssues,
        ...customVariableIssues,
        ...fontIssues,
        ...colorIssues,
        ...stagingUrlIssues
      ];

      // ⭐ NEW: Tag each issue with language if bilingual
      if (isBilingual && sections) {
        allIssues = this.tagIssuesWithLanguage(allIssues, sections, html || text);
      }

      // Categorize all issues
      const categorizedIssues = this.categorizeIssues(allIssues);

      // ⭐ NEW: Group issues by language
      const issuesByLanguage = isBilingual ? this.groupIssuesByLanguage(allIssues) : undefined;

      // Calculate metrics
      const metrics = this.calculateMetrics(categorizedIssues, issuesByLanguage);

      // Build result
      const result: CheckResult = {
        id: checkId,
        fileName,
        fileType: fileExt || 'unknown',
        status: 'completed',
        extractedText: text.substring(0, 500),
        language: primaryLanguage,
        languages,           // ⭐ NEW
        isBilingual,         // ⭐ NEW
        ocrUsed,
        ocrConfidence,
        issues: categorizedIssues,
        issuesByLanguage,    // ⭐ NEW
        metrics,
        suggestions: aiResult.suggestions || [],
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      // Save result to file
      await this.saveResult(result);

      return result;
    } catch (error: any) {
      throw new Error(`Check failed: ${error.message}`);
    }
  }

  /**
   * ⭐ NEW: Detect ALL languages in content
   * ⭐ FIXED: Now detects languages in order of appearance AND considers HTML lang attribute
   */
  private detectLanguages(text: string): string[] {
    const languages: string[] = [];

    // First, check HTML lang attribute if present (highest priority)
    const langAttrMatch = text.match(/<html[^>]*\slang=["']([^"']+)["']/i);
    if (langAttrMatch && langAttrMatch[1]) {
      const langAttr = langAttrMatch[1].toLowerCase();
      if (langAttr.startsWith('en')) {
        // English is declared as primary language
        languages.push('eng');
        // Check if Arabic also exists
        if (/[\u0600-\u06FF]/.test(text)) {
          languages.push('ara');
        }
        return languages;
      } else if (langAttr.startsWith('ar')) {
        // Arabic is declared as primary language
        languages.push('ara');
        // Check if English also exists
        if (/[a-zA-Z]/.test(text)) {
          languages.push('eng');
        }
        return languages;
      }
    }

    // If no lang attribute, detect by order of appearance
    const firstArabicPos = text.search(/[\u0600-\u06FF]/);
    const firstEnglishPos = text.search(/[a-zA-Z]/);

    const hasArabic = firstArabicPos !== -1;
    const hasEnglish = firstEnglishPos !== -1;

    if (hasEnglish && hasArabic) {
      // Both exist - order by appearance
      if (firstEnglishPos < firstArabicPos) {
        languages.push('eng');
        languages.push('ara');
      } else {
        languages.push('ara');
        languages.push('eng');
      }
    } else if (hasArabic) {
      languages.push('ara');
    } else if (hasEnglish) {
      languages.push('eng');
    }

    // Default to English if nothing detected
    return languages.length > 0 ? languages : ['eng'];
  }

  /**
   * ⭐ NEW: Split HTML into language sections
   */
  private splitByLanguageSections(html: string): { english: string; arabic: string } {
    // Look for common bilingual EDM patterns
    const arabicAnchorMatch = html.match(/<a[^>]*name=["']m_arabic["'][^>]*>/i);
    
    if (arabicAnchorMatch) {
      const arabicStart = arabicAnchorMatch.index || 0;
      return {
        english: html.substring(0, arabicStart),
        arabic: html.substring(arabicStart)
      };
    }
    
    // Alternative: Split by dir="rtl" attribute
    const rtlMatch = html.match(/dir=["']rtl["']/i);
    if (rtlMatch && rtlMatch.index) {
      // Find the start of the table/div containing this attribute
      const searchStart = Math.max(0, rtlMatch.index - 200);
      const sectionStart = html.lastIndexOf('<table', rtlMatch.index) || 
                          html.lastIndexOf('<div', rtlMatch.index) ||
                          rtlMatch.index;
      
      return {
        english: html.substring(0, sectionStart),
        arabic: html.substring(sectionStart)
      };
    }
    
    // If no clear split, detect by content
    const lines = html.split('\n');
    let englishSection = '';
    let arabicSection = '';
    let inArabicSection = false;
    
    for (const line of lines) {
      if (/[\u0600-\u06FF]/.test(line) && !inArabicSection) {
        inArabicSection = true;
      }
      
      if (inArabicSection) {
        arabicSection += line + '\n';
      } else {
        englishSection += line + '\n';
      }
    }
    
    return { english: englishSection, arabic: arabicSection };
  }

  /**
   * ⭐ NEW: Tag each issue with the language it belongs to
   */
  private tagIssuesWithLanguage(issues: any[], sections: any, fullText: string): any[] {
    return issues.map(issue => {
      // Determine language based on issue position or context
      let language = 'both'; // Default to both if unclear
      
      if (issue.position !== undefined && issue.position !== null) {
        // Check if position falls in English or Arabic section
        if (sections.english && fullText.indexOf(sections.english) === 0) {
          const englishEndPos = sections.english.length;
          language = issue.position < englishEndPos ? 'english' : 'arabic';
        }
      } else if (issue.context) {
        // Check context for Arabic characters
        if (/[\u0600-\u06FF]/.test(issue.context)) {
          language = 'arabic';
        } else if (/[a-zA-Z]/.test(issue.context)) {
          language = 'english';
        }
      } else if (issue.found) {
        // Check found text for language
        if (/[\u0600-\u06FF]/.test(issue.found)) {
          language = 'arabic';
        } else if (/[a-zA-Z]/.test(issue.found)) {
          language = 'english';
        }
      }
      
      return {
        ...issue,
        language  // ⭐ Add language tag
      };
    });
  }

  /**
   * ⭐ NEW: Group issues by language
   */
  private groupIssuesByLanguage(issues: any[]): { english: any[]; arabic: any[]; both: any[] } {
    const english: any[] = [];
    const arabic: any[] = [];
    const both: any[] = [];
    
    for (const issue of issues) {
      if (issue.language === 'english') {
        english.push(issue);
      } else if (issue.language === 'arabic') {
        arabic.push(issue);
      } else {
        both.push(issue);
      }
    }
    
    return { english, arabic, both };
  }

  /**
   * Extract text from HTML, removing tags and scripts
   * ⭐ FIXED: Now excludes preheader to avoid duplicate text in grammar checks
   */
  private extractTextFromHTML(html: string): string {
    let text = html;

    // Remove preheader div (hidden text that appears before HTML rendering)
    // Pattern: <div class="preheader" style="display:none;...">...</div>
    text = text.replace(/<div[^>]*class=["']preheader["'][^>]*>[\s\S]*?<\/div>/gi, '');

    // Remove script tags
    text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    // Remove style tags
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remove all HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    text = text.replace(/&#8202;/g, ''); // Zero-width space

    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  /**
   * Categorize issues by type
   */
  private categorizeIssues(issues: any[]): any {
    const categorized = {
      grammar: [],
      brand: [],
      numerical: [],
      links: [],
      images: [],
      cta: [],
      tone: [],
      legal: [],
      accessibility: []
    };

    for (const issue of issues) {
      const category = issue.category || issue.type || 'brand';
      
      if (category.includes('grammar') || category.includes('spelling')) {
        categorized.grammar.push(issue);
      } else if (category.includes('link') || category.includes('url') || category.includes('utm')) {
        categorized.links.push(issue);
      } else if (category.includes('image')) {
        categorized.images.push(issue);
      } else if (category.includes('cta')) {
        categorized.cta.push(issue);
      } else if (category.includes('tone')) {
        categorized.tone.push(issue);
      } else if (category.includes('legal')) {
        categorized.legal.push(issue);
      } else if (category.includes('accessibility')) {
        categorized.accessibility.push(issue);
      } else if (category.includes('numerical') || category.includes('number')) {
        categorized.numerical.push(issue);
      } else {
        categorized.brand.push(issue);
      }
    }

    return categorized;
  }

  /**
   * Calculate metrics from categorized issues
   * ⭐ ENHANCED: Now includes language-specific metrics
   */
  private calculateMetrics(categorizedIssues: any, issuesByLanguage?: any): any {
    const allIssues = [
      ...categorizedIssues.grammar,
      ...categorizedIssues.brand,
      ...categorizedIssues.numerical,
      ...categorizedIssues.links,
      ...categorizedIssues.images,
      ...categorizedIssues.cta,
      ...categorizedIssues.tone,
      ...categorizedIssues.legal,
      ...categorizedIssues.accessibility
    ];

    const criticalIssues = allIssues.filter(i => i.severity === 'critical').length;
    const highIssues = allIssues.filter(i => i.severity === 'high').length;
    const mediumIssues = allIssues.filter(i => i.severity === 'medium').length;
    const lowIssues = allIssues.filter(i => i.severity === 'low').length;

    const weights = { critical: 20, high: 10, medium: 5, low: 2 };
    const totalPenalty = 
      (criticalIssues * weights.critical) +
      (highIssues * weights.high) +
      (mediumIssues * weights.medium) +
      (lowIssues * weights.low);

    const score = Math.max(0, 100 - totalPenalty);

    const metrics: any = {
      totalIssues: allIssues.length,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      complianceScore: score
    };

    // ⭐ Add language-specific metrics if bilingual
    if (issuesByLanguage) {
      metrics.englishIssues = issuesByLanguage.english.length;
      metrics.arabicIssues = issuesByLanguage.arabic.length;
    }

    return metrics;
  }

  /**
   * Save check result to JSON file
   */
  private async saveResult(result: CheckResult): Promise<void> {
    const resultsDir = process.env.RESULTS_DIR || './storage/results';
    
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

  /**
   * Check text directly (without file upload)
   */
  async checkText(text: string, contentType: string = 'edm'): Promise<CheckResult> {
    const startTime = Date.now();
    const checkId = uuidv4();

    const languages = this.detectLanguages(text);
    const isBilingual = languages.length > 1;
    const primaryLanguage = languages[0] || 'eng';

    const [
      aiResult, 
      brandIssues, 
      numericalIssues, 
      ctaIssues,
      customVariableIssues
    ] = await Promise.all([
      openaiService.checkContent(text, primaryLanguage),
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
    const issuesByLanguage = isBilingual ? this.groupIssuesByLanguage(allIssues) : undefined;
    const metrics = this.calculateMetrics(categorizedIssues, issuesByLanguage);

    const result: CheckResult = {
      id: checkId,
      fileName: 'text-check',
      fileType: 'text',
      status: 'completed',
      extractedText: text.substring(0, 500),
      language: primaryLanguage,
      languages,
      isBilingual,
      ocrUsed: false,
      issues: categorizedIssues,
      issuesByLanguage,
      metrics,
      suggestions: aiResult.suggestions || [],
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    await this.saveResult(result);
    return result;
  }
}

export const checkerService = new CheckerService();