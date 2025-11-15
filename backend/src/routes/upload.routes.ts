import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { checkerService } from '../services/checker.service';
import { urlScraperService } from '../services/url-scraper.service';
import { checkerService as urlCheckerService } from '../services/url-checker.service';

const router = Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: './storage/uploads',
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.html', '.htm', '.pdf', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`));
    }
  }
});

/**
 * POST /api/upload
 * Upload and check file
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file uploaded',
        message: 'Please upload a file'
      });
    }

    console.log(`📤 Checking file: ${req.file.originalname}`);

    const result = await checkerService.checkFile(
      req.file.path,
      req.file.originalname
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      message: 'Failed to process file'
    });
  }
});

/**
 * POST /api/check-text
 * Check text directly without file upload
 */
router.post('/check-text', async (req: Request, res: Response) => {
  try {
    const { text, content_type } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No text provided',
        message: 'Please provide text to check'
      });
    }

    console.log(`📝 Checking text (${text.length} chars)`);

    const result = await checkerService.checkText(text, content_type || 'edm');

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('❌ Text check error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to check text'
    });
  }
});

/**
 * POST /api/check-url
 * Check URL by scraping and analyzing content
 * Uses 3-tier approach: cheerio → Gemini AI → manual paste
 */
router.post('/check-url', async (req: Request, res: Response) => {
  try {
    const { url, content_type } = req.body;

    if (!url || url.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No URL provided',
        message: 'Please provide a URL to check'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format',
        message: 'Please provide a valid URL (e.g., https://example.com)'
      });
    }

    console.log(`🌐 Checking URL: ${url}`);

    // Step 1: Scrape the URL (3-tier: cheerio → Gemini → manual)
    const scrapedContent = await urlScraperService.scrapeUrl(url);

    console.log(`✅ Scraped successfully using: ${scrapedContent.method}`);
    console.log(`  → Title: ${scrapedContent.title}`);
    console.log(`  → Text length: ${scrapedContent.text.length} chars`);

    // Step 2: Analyze with URL-specific checks only (excludes EDM-specific rules)
    const result = await urlCheckerService.checkUrl(
      scrapedContent.html || '',
      scrapedContent.text,
      content_type || 'web',
      scrapedContent.seoMetadata  // ⭐ Pass SEO metadata for validation
    );

    // Add scraping metadata to result
    const enhancedResult = {
      ...result,
      url: scrapedContent.url,
      scrapingMethod: scrapedContent.method,
      pageTitle: scrapedContent.title,
      redirectedTo: scrapedContent.redirectedTo,
      seoMetadata: scrapedContent.seoMetadata,
    };

    res.json({
      success: true,
      data: enhancedResult,
      meta: {
        scrapingMethod: scrapedContent.method,
        tier: scrapedContent.method === 'cheerio' ? 1 :
              scrapedContent.method.includes('gemini') ? 2 : 3,
        message: scrapedContent.method === 'cheerio'
          ? 'Fast scraping with cheerio'
          : scrapedContent.method.includes('gemini')
          ? 'Used Gemini AI to bypass protection (FREE tier)'
          : 'Manual paste required'
      }
    });
  } catch (error: any) {
    console.error('❌ URL check error:', error);

    // Check if it's a manual paste required error
    if (error.message.includes('MANUAL_PASTE_REQUIRED')) {
      return res.status(422).json({
        success: false,
        error: 'MANUAL_PASTE_REQUIRED',
        message: error.message,
        suggestion: 'Please copy the page HTML manually and use the /api/check-text endpoint instead'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to check URL'
    });
  }
});

/**
 * GET /api/results/:id
 * Get check result by ID
 */
router.get('/results/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await checkerService.getResult(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Result not found',
        message: `No result found with ID: ${id}`
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('❌ Get result error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve result'
    });
  }
});

/**
 * GET /api/history
 * Get recent check history
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const history = await checkerService.getHistory(limit);

    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error: any) {
    console.error('❌ History error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve history'
    });
  }
});

/**
 * GET /api/rules
 * Get all loaded rules (for debugging/inspection)
 */
router.get('/rules', (req: Request, res: Response) => {
  try {
    const { rulesEngine } = require('../services/rules-engine.service');
    const rules = rulesEngine.getRules();

    res.json({
      success: true,
      data: rules,
      count: rules.length
    });
  } catch (error: any) {
    console.error('❌ Rules error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve rules'
    });
  }
});

/**
 * POST /api/rules/reload
 * Reload rules from YAML file (hot-reload)
 */
router.post('/rules/reload', (req: Request, res: Response) => {
  try {
    const { rulesEngine } = require('../services/rules-engine.service');
    rulesEngine.reload();

    res.json({
      success: true,
      message: 'Rules reloaded successfully',
      count: rulesEngine.getRules().length
    });
  } catch (error: any) {
    console.error('❌ Rules reload error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to reload rules'
    });
  }
});

/**
 * GET /api/stats
 * Get system statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const history = await checkerService.getHistory(100);
    
    const stats = {
      totalChecks: history.length,
      averageScore: history.reduce((sum, r) => sum + r.metrics.complianceScore, 0) / history.length || 0,
      averageProcessingTime: history.reduce((sum, r) => sum + r.processingTime, 0) / history.length || 0,
      fileTypes: {} as Record<string, number>,
      languages: {} as Record<string, number>
    };

    // Count file types and languages
    history.forEach(r => {
      stats.fileTypes[r.fileType] = (stats.fileTypes[r.fileType] || 0) + 1;
      stats.languages[r.language] = (stats.languages[r.language] || 0) + 1;
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('❌ Stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve statistics'
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    message: 'Universal Checker API is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

export default router;