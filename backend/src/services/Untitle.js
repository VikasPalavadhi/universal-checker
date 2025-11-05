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
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkerService = void 0;
const ocr_service_1 = require("./ocr.service");
const openai_service_1 = require("./openai.service");
const rules_engine_service_1 = require("./rules-engine.service");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
class CheckerService {
    /**
     * Main check method - processes any file type
     */
    async checkFile(filePath, fileName) {
        const startTime = Date.now();
        const fileExt = fileName.split('.').pop()?.toLowerCase();
        const checkId = (0, uuid_1.v4)();
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
                const ocrResult = await ocr_service_1.ocrService.extractText(filePath);
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
            const [aiResult, brandIssues, numericalIssues, ctaIssues, linkIssues, imageIssues] = await Promise.all([
                // OpenAI grammar and content check
                openai_service_1.openaiService.checkContent(text, language),
                // Rules engine brand compliance
                Promise.resolve(rules_engine_service_1.rulesEngine.checkText(text, 'edm')),
                // Numerical format check
                Promise.resolve(rules_engine_service_1.rulesEngine.checkNumericalFormats(text)),
                // CTA optimization check
                Promise.resolve(rules_engine_service_1.rulesEngine.checkCTA(text)),
                // Link validation (if HTML)
                html ? Promise.resolve(rules_engine_service_1.rulesEngine.validateLinks(html, language)) : Promise.resolve([]),
                // Image validation (if HTML)
                html ? Promise.resolve(rules_engine_service_1.rulesEngine.validateImages(html)) : Promise.resolve([])
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
            const result = {
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
        }
        catch (error) {
            throw new Error(`Check failed: ${error.message}`);
        }
    }
    /**
     * Extract text from HTML, removing tags and scripts
     */
    extractTextFromHTML(html) {
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
    categorizeIssues(allIssues) {
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
    calculateMetrics(issues) {
        const allIssues = Object.values(issues).flat();
        const criticalCount = allIssues.filter(i => i.severity === 'critical').length;
        const highCount = allIssues.filter(i => i.severity === 'high').length;
        const mediumCount = allIssues.filter(i => i.severity === 'medium').length;
        const lowCount = allIssues.filter(i => i.severity === 'low').length;
        // Calculate compliance score (start at 100, subtract points)
        const score = Math.max(0, 100 - ((criticalCount * 20) +
            (highCount * 10) +
            (mediumCount * 5) +
            (lowCount * 2)));
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
    async saveResult(result) {
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
    async getResult(id) {
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
    async getHistory(limit = 10) {
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
    async checkText(text, contentType = 'edm') {
        const startTime = Date.now();
        const checkId = (0, uuid_1.v4)();
        // Detect language
        const isArabic = /[\u0600-\u06FF]/.test(text);
        const language = isArabic ? 'ara' : 'eng';
        // Run checks
        const [aiResult, brandIssues, numericalIssues, ctaIssues] = await Promise.all([
            openai_service_1.openaiService.checkContent(text, language),
            Promise.resolve(rules_engine_service_1.rulesEngine.checkText(text, contentType)),
            Promise.resolve(rules_engine_service_1.rulesEngine.checkNumericalFormats(text)),
            Promise.resolve(rules_engine_service_1.rulesEngine.checkCTA(text))
        ]);
        const categorizedIssues = this.categorizeIssues([
            ...aiResult.grammarIssues,
            ...aiResult.brandIssues,
            ...brandIssues,
            ...numericalIssues,
            ...ctaIssues
        ]);
        const metrics = this.calculateMetrics(categorizedIssues);
        const result = {
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
exports.checkerService = new CheckerService();
//# sourceMappingURL=Untitle.js.map