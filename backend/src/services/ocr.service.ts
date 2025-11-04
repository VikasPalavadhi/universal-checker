import tesseract from 'node-tesseract-ocr';

interface OCRResult {
  text: string;
  confidence: number;
}

class OCRService {
  async extractText(imagePath: string): Promise<OCRResult> {
    try {
      const config = {
        lang: 'eng+ara',
        oem: 1,
        psm: 3,
      };

      const text = await tesseract.recognize(imagePath, config);
      
      return {
        text: text.trim(),
        confidence: 85 // Tesseract doesn't provide confidence easily, using default
      };
    } catch (error) {
      console.error('OCR Error:', error);
      throw new Error('Failed to extract text from image');
    }
  }
}

export const ocrService = new OCRService();
