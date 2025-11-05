interface OCRResult {
    text: string;
    confidence: number;
}
declare class OCRService {
    extractText(imagePath: string): Promise<OCRResult>;
}
export declare const ocrService: OCRService;
export {};
//# sourceMappingURL=ocr.service.d.ts.map