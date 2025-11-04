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
   * Main check method - processes any file type
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

      // Detect language
      const isArabic = /[\u0600-\u06FF]/.test(text);
      const language = isArabic ? 'ara' : 'eng';

      // Run all checks in parallel for better performance
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
        
        // Rules engine brand compliance
        Promise.resolve(rulesEngine.checkText(text, 'edm')),
        
        // Numerical format check
        Promise.resolve(rulesEngine.checkNumericalFormats(text)),
        
        // CTA optimization check
        Promise.resolve(rulesEngine.checkCTA(text)),
        
        // Link validation (if HTML)
        html ? Promise.resolve(rulesEngine.validateLinks(html, language)) : Promise.resolve([]),
        
        // Image validation (if HTML)
        html ? Promise.resolve(rulesEngine.validateImages(html)) : Promise.resolve([])
      ]);

      // Categorize all issues
      const categorizedIssues = this.categorizeIssues([
        ...aiResult.grammarIssues,
        ...aiResult.brandIssues,
        ...brandIssues,
        ...numericalIssues,
        ...ctaIssues,
        ...linkIssues,
        ...imageIssues
      ]);

      // Calculate metrics
      const metrics = this.calculateMetrics(categorizedIssues);

      // Build result
      const result: CheckResult = {
        id: checkId,
        fileName,
        fileType: fileExt || 'unknown',
        status: 'completed',
        extractedText: text.substring(0, 500), // First 500 chars for preview
        language,
        ocrUsed,
        ocrConfidence,
        issues: categorizedIssues,
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
  private categorizeIssues(allIssues: any[]) {
    return {
      grammar: allIssues.filter(i => i.type === 'grammar' || i.category === 'grammar'),
      brand: allIssues.filter(i => i.category === 'brand_compliance' || i.category === 'brand_voice'),
      numerical: allIssues.filter(i => i.category === 'numerical_format'),
      links: allIssues.filter(i => i.type === 'link_validation'),
      images: allIssues.filter(i => i.type === 'image_validation'),
      cta: allIssues.filter(i => i.category === 'cta'),
      tone: allIssues.filter(i => i.category === 'tone'),
      legal: allIssues.filter(i => i.category === 'legal_compliance'),
      accessibility: allIssues.filter(i => i.category.includes('accessibility'))
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

  /**
   * Check text directly (without file upload)
   */
  async checkText(text: string, contentType: string = 'edm'): Promise<CheckResult> {
    const startTime = Date.now();
    const checkId = uuidv4();

    // Detect language
    const isArabic = /[\u0600-\u06FF]/.test(text);
    const language = isArabic ? 'ara' : 'eng';

    // Run checks
    const [aiResult, brandIssues, numericalIssues, ctaIssues] = await Promise.all([
      openaiService.checkContent(text, language),
      Promise.resolve(rulesEngine.checkText(text, contentType)),
      Promise.resolve(rulesEngine.checkNumericalFormats(text)),
      Promise.resolve(rulesEngine.checkCTA(text))
    ]);

    const categorizedIssues = this.categorizeIssues([
      ...aiResult.grammarIssues,
      ...aiResult.brandIssues,
      ...brandIssues,
      ...numericalIssues,
      ...ctaIssues
    ]);

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
}

export const checkerService = new CheckerService();