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

  /**
   * Analyze SEO aspects with AI suggestions
   */
  async analyzeSEO(seoData: any, urlType: string): Promise<{
    titleSuggestion: string;
    descriptionSuggestion: string;
    keywordOpportunities: string[];
    contentSuggestions: string[];
    schemaSuggestions: string[];
  }> {
    if (!this.client) {
      return {
        titleSuggestion: '',
        descriptionSuggestion: '',
        keywordOpportunities: [],
        contentSuggestions: [],
        schemaSuggestions: [],
      };
    }

    try {
      const prompt = this.getSEOPrompt(seoData, urlType);

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert SEO consultant specializing in Emirates NBD digital content. Provide actionable, specific recommendations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      return result;
    } catch (error) {
      console.error('OpenAI SEO Analysis Error:', error);
      return {
        titleSuggestion: '',
        descriptionSuggestion: '',
        keywordOpportunities: [],
        contentSuggestions: [],
        schemaSuggestions: [],
      };
    }
  }

  private getSEOPrompt(seoData: any, urlType: string): string {
    return `Analyze this webpage's SEO and provide specific, actionable recommendations for Emirates NBD.

URL Type: ${urlType}

Current SEO Data:
- Title: "${seoData.title.content}" (${seoData.title.length} chars)
- Meta Description: "${seoData.metaDescription.content}" (${seoData.metaDescription.length} chars)
- H1: ${seoData.headings.h1.length > 0 ? '"' + seoData.headings.h1[0] + '"' : 'Missing'}
- Open Graph: ${seoData.openGraph.present ? 'Present' : 'Missing'}
- Twitter Card: ${seoData.twitterCard.present ? 'Present' : 'Missing'}
- Schema Markup: ${seoData.schemas.found ? seoData.schemas.types.join(', ') : 'None'}
- Overall Score: ${seoData.overallScore}/100

Page Content Preview: ${seoData.pageText?.substring(0, 500) || 'N/A'}

Provide recommendations in JSON format:
{
  "titleSuggestion": "An improved, SEO-optimized title (50-60 chars) that includes relevant keywords and appeals to users",
  "descriptionSuggestion": "An improved meta description (150-160 chars) with a clear call-to-action and value proposition",
  "keywordOpportunities": ["keyword 1", "keyword 2", "keyword 3"],
  "contentSuggestions": [
    "Specific suggestion 1 about content structure",
    "Specific suggestion 2 about headings",
    "Specific suggestion 3 about readability"
  ],
  "schemaSuggestions": [
    "Specific schema markup to add for ${urlType} pages",
    "Properties to include in schema",
    "Additional structured data recommendations"
  ]
}

Focus on:
1. Banking/financial services keywords for Emirates NBD
2. Arabic and English bilingual optimization
3. ${urlType === 'product' ? 'Product-specific SEO (pricing, features, benefits)' : ''}
4. ${urlType === 'offer' ? 'Promotional SEO (urgency, value proposition, terms)' : ''}
5. ${urlType === 'campaign' ? 'Campaign-specific SEO (brand awareness, engagement)' : ''}
6. Mobile-first considerations
7. Local SEO for UAE market`;
  }
}

export const openaiService = new OpenAIService();
