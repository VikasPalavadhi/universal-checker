import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

interface CheckResult {
  grammarIssues: any[];
  brandIssues: any[];
  toneAnalysis: any;
  suggestions: string[];
}

class OpenAIService {
  private client: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } else {
      console.warn('⚠️  OpenAI API key not found');
    }
  }

  async checkContent(text: string, language: string = 'en'): Promise<CheckResult> {
    if (!this.client) {
      return {
        grammarIssues: [],
        brandIssues: [],
        toneAnalysis: { score: 0, message: 'OpenAI not configured' },
        suggestions: []
      };
    }

    try {
      const prompt = language === 'ara' || language === 'ar' 
        ? this.getArabicPrompt(text)
        : this.getEnglishPrompt(text);

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert content checker for marketing materials.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      return result;
    } catch (error) {
      console.error('OpenAI Error:', error);
      return {
        grammarIssues: [],
        brandIssues: [],
        toneAnalysis: { score: 0, message: 'Error checking content' },
        suggestions: []
      };
    }
  }

  private getEnglishPrompt(text: string): string {
    return `Check this marketing content for issues. Return JSON format:

Text: ${text}

Analyze for:
1. Grammar and spelling errors
2. Tone and professionalism
3. Content quality

Return format:
{
  "grammarIssues": [{"type": "grammar", "message": "...", "original": "...", "suggestion": "...", "severity": "high|medium|low"}],
  "brandIssues": [],
  "toneAnalysis": {"professionalism": 1-10, "clarity": 1-10, "summary": "..."},
  "suggestions": ["suggestion 1", "suggestion 2"]
}`;
  }

  private getArabicPrompt(text: string): string {
    return `تحقق من هذا المحتوى التسويقي. أرجع بصيغة JSON:

النص: ${text}

قم بالتحليل:
1. الأخطاء النحوية والإملائية
2. النبرة والاحترافية
3. جودة المحتوى

صيغة الإرجاع:
{
  "grammarIssues": [{"type": "grammar", "message": "...", "original": "...", "suggestion": "...", "severity": "high|medium|low"}],
  "brandIssues": [],
  "toneAnalysis": {"professionalism": 1-10, "clarity": 1-10, "summary": "..."},
  "suggestions": ["اقتراح 1", "اقتراح 2"]
}`;
  }
}

export const openaiService = new OpenAIService();
