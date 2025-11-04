import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { checkerService } from '../services/checker.service';

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