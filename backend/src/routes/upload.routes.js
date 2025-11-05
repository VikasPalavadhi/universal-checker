"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const checker_service_1 = require("../services/checker.service");
const router = (0, express_1.Router)();
// Configure multer for file upload
const storage = multer_1.default.diskStorage({
    destination: './storage/uploads',
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.jpg', '.jpeg', '.png', '.html', '.htm', '.pdf', '.docx'];
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        }
        else {
            cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`));
        }
    }
});
/**
 * POST /api/upload
 * Upload and check file
 */
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded',
                message: 'Please upload a file'
            });
        }
        console.log(`📤 Checking file: ${req.file.originalname}`);
        const result = await checker_service_1.checkerService.checkFile(req.file.path, req.file.originalname);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
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
router.post('/check-text', async (req, res) => {
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
        const result = await checker_service_1.checkerService.checkText(text, content_type || 'edm');
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
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
 * Check URL with content analysis + SEO audit
 */
router.post('/check-url', async (req, res) => {
    try {
        const { url, url_type } = req.body;
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
        }
        catch {
            return res.status(400).json({
                success: false,
                error: 'Invalid URL format',
                message: 'Please provide a valid URL (e.g., https://example.com)'
            });
        }
        console.log(`🌐 Checking URL: ${url} (type: ${url_type || 'others'})`);
        const result = await checker_service_1.checkerService.checkUrl(url, url_type || 'others');
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('❌ URL check error:', error);
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
router.get('/results/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await checker_service_1.checkerService.getResult(id);
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
    }
    catch (error) {
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
router.get('/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const history = await checker_service_1.checkerService.getHistory(limit);
        res.json({
            success: true,
            data: history,
            count: history.length
        });
    }
    catch (error) {
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
router.get('/rules', (req, res) => {
    try {
        const { rulesEngine } = require('../services/rules-engine.service');
        const rules = rulesEngine.getRules();
        res.json({
            success: true,
            data: rules,
            count: rules.length
        });
    }
    catch (error) {
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
router.post('/rules/reload', (req, res) => {
    try {
        const { rulesEngine } = require('../services/rules-engine.service');
        rulesEngine.reload();
        res.json({
            success: true,
            message: 'Rules reloaded successfully',
            count: rulesEngine.getRules().length
        });
    }
    catch (error) {
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
router.get('/stats', async (req, res) => {
    try {
        const history = await checker_service_1.checkerService.getHistory(100);
        const stats = {
            totalChecks: history.length,
            averageScore: history.reduce((sum, r) => sum + r.metrics.complianceScore, 0) / history.length || 0,
            averageProcessingTime: history.reduce((sum, r) => sum + r.processingTime, 0) / history.length || 0,
            fileTypes: {},
            languages: {}
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
    }
    catch (error) {
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
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Universal Checker API is running',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});
exports.default = router;
//# sourceMappingURL=upload.routes.js.map