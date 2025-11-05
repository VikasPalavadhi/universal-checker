"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ocrService = void 0;
const node_tesseract_ocr_1 = __importDefault(require("node-tesseract-ocr"));
class OCRService {
    async extractText(imagePath) {
        try {
            const config = {
                lang: 'eng+ara',
                oem: 1,
                psm: 3,
            };
            const text = await node_tesseract_ocr_1.default.recognize(imagePath, config);
            return {
                text: text.trim(),
                confidence: 85 // Tesseract doesn't provide confidence easily, using default
            };
        }
        catch (error) {
            console.error('OCR Error:', error);
            throw new Error('Failed to extract text from image');
        }
    }
}
exports.ocrService = new OCRService();
//# sourceMappingURL=ocr.service.js.map