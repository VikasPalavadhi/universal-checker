import * as yaml from 'js-yaml';
import * as fs from 'fs';

// CRITICAL: Must include | undefined for all optional properties
interface Issue {
  rule_id: string;
  type: string;
  category: string;
  severity: string;
  message: string;
  original: string;
  suggestion?: string | undefined;
  position?: number | undefined;
  length?: number | undefined;
  context?: string | undefined;
  link_text?: string | undefined;
  found?: string | undefined;
}

interface Rule {
  id: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  pattern: string;
  replacement?: string | undefined;
  message: string;
  suggestion?: string | undefined;
  context_exceptions?: string[] | undefined;
  applies_to?: string[] | undefined;
}

class RulesEngineEnhanced {
  private rules: Rule[] = [];
  private rulesPath: string;

  // Expanded: Brand colors (updated based on real EDM analysis)
  private readonly ALLOWED_COLORS = [
    '#072447',  // Brand Primary (Dark Blue)
    '#FFFFFF',  // White (uppercase)
    '#ffffff',  // White (lowercase)
    '#e8e7ec',  // Light Gray (lowercase)
    '#E8E7EC',  // Light Gray (uppercase)
    '#e7e8ea',  // Alternative Light Gray (found in EDMs)
    '#ECEAEA',  // Background Gray (found in EDMs)
    '#666666',  // Text Gray (found in EDMs)
    '#FFF',     // Short white notation
    '#000'      // Black text
  ];
  
  private readonly ALLOWED_DOMAINS = [
    'www.emiratesnbd.com',
    'cdn.emiratesnbd.com',
    'www.emiratesislamic.ae',
    'emiratesnbdresearch'
  ];

  // Social media domains - exempt from language mismatch checks
  private readonly SOCIAL_MEDIA_DOMAINS = [
    'twitter.com',
    'x.com',
    'instagram.com',
    'linkedin.com',
    'youtube.com',
    'youtu.be',
    'facebook.com',
    'fb.com',
    'snapchat.com',
    'tiktok.com'
  ];

  constructor() {
    this.rulesPath = process.env.BRAND_RULES_PATH || './storage/rules/brand-rules.yaml';
    this.loadRules();
  }

  loadRules(): void {
    try {
      if (fs.existsSync(this.rulesPath)) {
        const fileContents = fs.readFileSync(this.rulesPath, 'utf8');
        const data = yaml.load(fileContents) as { rules: Rule[] };
        this.rules = data.rules || [];
        console.log(`✓ Loaded ${this.rules.length} brand rules from YAML`);
      } else {
        console.warn('⚠️  No rules file found');
        this.rules = [];
      }
    } catch (error) {
      console.error('❌ Error loading rules:', error);
      this.rules = [];
    }
  }

  // ============================================
  // ORIGINAL METHODS (ALL PRESERVED)
  // ============================================

  /**
   * Standard rule checking from YAML
   */
  checkText(text: string, contentType: string = 'edm'): Issue[] {
    const issues: Issue[] = [];
    if (!text || text.trim().length === 0) return issues;

    for (const rule of this.rules) {
      try {
        const appliesTo = rule.applies_to || ['edm', 'web', 'social', 'document'];
        if (!appliesTo.includes(contentType)) continue;

        const regex = new RegExp(rule.pattern, 'gi');
        let match;

        while ((match = regex.exec(text)) !== null) {
          const exceptions = rule.context_exceptions || [];
          if (this.isException(text, match, exceptions)) continue;

          const issue: Issue = {
            rule_id: rule.id,
            type: 'brand_compliance',
            category: rule.category,
            severity: rule.severity,
            message: rule.message,
            original: match[0],
            position: match.index,
            length: match[0].length
          };

          if (rule.replacement) {
            issue.suggestion = rule.replacement;
          } else if (rule.suggestion) {
            issue.suggestion = rule.suggestion;
          }

          issues.push(issue);
        }
      } catch (error) {
        console.error(`❌ Error processing rule ${rule.id}:`, error);
      }
    }

    return issues;
  }

  /**
   * Check numerical and currency formats
   */
  checkNumericalFormats(text: string): Issue[] {
    const issues: Issue[] = [];
    if (!text) return issues;

    // Check for currency without space
    const currencyPattern = /(AED|USD|EUR|GBP)(\d+)/g;
    let match;

    while ((match = currencyPattern.exec(text)) !== null) {
      issues.push({
        rule_id: 'currency_format_001',
        type: 'formatting',
        category: 'numerical_format',
        severity: 'high',
        message: `Currency should have space: "${match[1]} ${match[2]}"`,
        original: match[0],
        suggestion: `${match[1]} ${match[2]}`,
        position: match.index
      });
    }

    // Check for large numbers without separators
    const largeNumberPattern = /\b\d{5,}\b/g;
    while ((match = largeNumberPattern.exec(text)) !== null) {
      const number = match[0];
      const formatted = parseInt(number).toLocaleString();
      
      issues.push({
        rule_id: 'number_format_001',
        type: 'formatting',
        category: 'numerical_format',
        severity: 'medium',
        message: `Large number should use thousand separators: "${formatted}"`,
        original: number,
        suggestion: formatted,
        position: match.index
      });
    }

    return issues;
  }

  /**
   * Check Call-to-Action effectiveness
   */
  checkCTA(text: string): Issue[] {
    const suggestions: Issue[] = [];
    if (!text) return suggestions;

    const weakCTAs = [
      { pattern: /\bclick here\b/gi, message: 'Generic CTA detected' },
      { pattern: /\blearn more\b/gi, message: 'Weak CTA - consider more specific action' },
      { pattern: /\bread more\b/gi, message: 'Weak CTA - consider more engaging text' },
      { pattern: /\bsubmit\b/gi, message: 'Generic button text' }
    ];

    for (const cta of weakCTAs) {
      if (cta.pattern.test(text)) {
        suggestions.push({
          rule_id: 'cta_optimization',
          type: 'cta_optimization',
          category: 'cta',
          severity: 'medium',
          message: cta.message,
          original: '',
          suggestion: 'Use action-oriented CTAs: "Apply Now", "Start Earning", "Get Your Quote"'
        });
        break;
      }
    }

    return suggestions;
  }

  /**
   * Comprehensive link validation with HTML structure checks
   */
  validateLinks(html: string, language: string = 'en'): Issue[] {
    const issues: Issue[] = [];
    if (!html) return issues;

    // 1. Check for <a> tags WITHOUT href attribute
    const noHrefPattern = /<a(?![^>]*href)[^>]*>(.*?)<\/a>/gi;
    let match;

    while ((match = noHrefPattern.exec(html)) !== null) {
      const linkText = match[1].replace(/<[^>]+>/g, '').trim();
      issues.push({
        rule_id: 'link_missing_href_001',
        type: 'link_validation',
        category: 'broken_links',
        severity: 'critical',
        message: 'Link missing href attribute',
        found: 'no href attribute',
        link_text: linkText,
        original: match[0],
        suggestion: 'Add href attribute with valid URL'
      });
    }

    // 2. Check for <a> tags with EMPTY href
    const emptyHrefPattern = /<a[^>]*href=["']\s*["'][^>]*>(.*?)<\/a>/gi;
    while ((match = emptyHrefPattern.exec(html)) !== null) {
      const linkText = match[1].replace(/<[^>]+>/g, '').trim();
      issues.push({
        rule_id: 'link_empty_href_001',
        type: 'link_validation',
        category: 'broken_links',
        severity: 'critical',
        message: 'Link has empty href attribute',
        found: 'href=""',
        link_text: linkText,
        original: match[0],
        suggestion: 'Add valid URL to href attribute'
      });
    }

    // 3. Standard link extraction with comprehensive validation
    const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;

    while ((match = linkPattern.exec(html)) !== null) {
      const link = match[1];
      const linkText = match[2].replace(/<[^>]+>/g, '').trim();

      // Skip if empty (already caught above)
      if (!link || link.trim() === '') continue;

      // Check for malformed URLs FIRST
      // Note: Spaces are allowed in URLs with dynamic fields like [Field: First Name]
      const hasDynamicField = /\[Field:\s+[^\]]+\]/.test(link);
      
      const malformedPatterns = [
        { pattern: /---https?:\/\//i, message: 'Malformed URL with extra dashes (---https://)' },
        { pattern: /https?::\/\//i, message: 'Malformed URL with double colons (https::)' },
        { pattern: /https?:\/[^\/]/i, message: 'Malformed URL missing second slash (https:/)' },
        { pattern: /https?:\/\/\//i, message: 'Malformed URL with triple slashes (https:///)' },
        { pattern: /[<>]/g, message: 'URL contains invalid characters (<>)' }
      ];

      // Only check for spaces if NOT part of dynamic field
      if (!hasDynamicField && /\s+/.test(link)) {
        malformedPatterns.push({ 
          pattern: /\s+/g, 
          message: 'URL contains spaces (not part of dynamic field)' 
        });
      }

      let isMalformed = false;
      for (const { pattern, message } of malformedPatterns) {
        if (pattern.test(link)) {
          issues.push({
            rule_id: 'url_malformed_001',
            type: 'link_validation',
            category: 'broken_links',
            severity: 'critical',
            message: message,
            found: link,
            link_text: linkText,
            original: link,
            suggestion: 'Fix URL format before deployment'
          });
          isMalformed = true;
          break;
        }
      }

      if (isMalformed) continue; // Skip further checks for malformed URLs

      // Check for placeholder/broken links
      if (link === '#' || link === 'javascript:void(0)' || link === 'javascript:;') {
        issues.push({
          rule_id: 'link_validation_001',
          type: 'link_validation',
          category: 'broken_links',
          severity: 'critical',
          message: 'Placeholder link detected (not a real URL)',
          found: link,
          link_text: linkText,
          original: link,
          suggestion: 'Replace with actual destination URL'
        });
        continue;
      }

      // Validate URL format for http/https links
      if (link.startsWith('http') && !this.isValidUrl(link)) {
        issues.push({
          rule_id: 'url_invalid_001',
          type: 'link_validation',
          category: 'broken_links',
          severity: 'high',
          message: 'Invalid URL format',
          found: link,
          link_text: linkText,
          original: link,
          suggestion: 'Check URL syntax and structure'
        });
        continue;
      }

      // Check for missing UTM parameters
      if (!link.includes('utm_') && 
          !link.startsWith('#') && 
          !link.startsWith('mailto:') && 
          !link.startsWith('tel:') &&
          link.startsWith('http')) {
        issues.push({
          rule_id: 'utm_tracking_001',
          type: 'link_validation',
          category: 'utm_tracking',
          severity: 'medium',
          message: 'Link missing UTM tracking parameters',
          found: link,
          link_text: linkText,
          original: link,
          suggestion: `Add tracking: ${link}${link.includes('?') ? '&' : '?'}utm_source=edm&utm_medium=email`
        });
      }

      // Language-specific validation
      // ⭐ FIXED: Check local context for each link instead of document-level language
      const linkContextStart = Math.max(0, match.index - 500);
      const linkContextEnd = Math.min(html.length, match.index + 500);
      const linkContext = html.slice(linkContextStart, linkContextEnd);

      // Detect if this specific link is in an Arabic or English context
      const hasRTL = /direction:\s*rtl/i.test(linkContext) || /dir=["']rtl["']/i.test(linkContext);
      const arabicCharsInContext = (linkContext.match(/[\u0600-\u06FF]/g) || []).length;
      const englishCharsInContext = (linkContext.match(/[a-zA-Z]/g) || []).length;
      const isLinkInArabicContext = hasRTL || (arabicCharsInContext > 0 && arabicCharsInContext / (englishCharsInContext + arabicCharsInContext) > 0.3);
      const isLinkInEnglishContext = !isLinkInArabicContext;

      // Skip social media links from language mismatch checks
      const isSocialMedia = this.isSocialMediaLink(link);

      if (!isSocialMedia && isLinkInEnglishContext && (link.includes('/ar/') || link.toLowerCase().includes('/arabic/'))) {
        issues.push({
          rule_id: 'language_mismatch_001',
          type: 'language_validation',
          category: 'language_mismatch',
          severity: 'critical',
          message: 'English content contains Arabic page link',
          found: link,
          link_text: linkText,
          original: link,
          suggestion: 'Ensure all links point to English pages'
        });
      } else if (!isSocialMedia && isLinkInArabicContext && (link.includes('/en/') || link.toLowerCase().includes('/english/')) && link.startsWith('http')) {
        issues.push({
          rule_id: 'language_mismatch_002',
          type: 'language_validation',
          category: 'language_mismatch',
          severity: 'critical',
          message: 'Arabic content contains English page link',
          found: link,
          link_text: linkText,
          original: link,
          suggestion: 'Ensure all links point to Arabic pages'
        });
      } else if (!isSocialMedia && isLinkInArabicContext && !link.includes('/ar/') && !link.toLowerCase().includes('/arabic/') && link.startsWith('http')) {
        issues.push({
          rule_id: 'language_mismatch_003',
          type: 'language_validation',
          category: 'language_mismatch',
          severity: 'critical',
          message: 'Arabic content contains non-Arabic page link',
          found: link,
          link_text: linkText,
          original: link,
          suggestion: 'Ensure all links point to Arabic pages'
        });
      }

      // Accessibility - check for "click here"
      if (linkText.toLowerCase() === 'click here' || linkText.toLowerCase() === 'here') {
        issues.push({
          rule_id: 'accessibility_001',
          type: 'accessibility',
          category: 'link_accessibility',
          severity: 'medium',
          message: 'Link text should be descriptive for screen readers',
          found: link,
          link_text: linkText,
          original: linkText,
          suggestion: 'Use meaningful text that describes the destination'
        });
      }

      // Check for missing link text
      if (!linkText || linkText.trim() === '') {
        issues.push({
          rule_id: 'link_no_text_001',
          type: 'accessibility',
          category: 'link_accessibility',
          severity: 'high',
          message: 'Link has no visible text (accessibility issue)',
          found: link,
          link_text: '(empty)',
          original: link,
          suggestion: 'Add descriptive link text'
        });
      }
    }

    return issues;
  }

  /**
   * Validate URL format
   */
  private isValidUrl(urlString: string): boolean {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Check if URL is a social media link (exempt from language checks)
   */
  private isSocialMediaLink(urlString: string): boolean {
    try {
      const url = new URL(urlString);
      const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
      return this.SOCIAL_MEDIA_DOMAINS.some(domain => 
        hostname === domain || hostname.endsWith('.' + domain)
      );
    } catch {
      return false;
    }
  }

  /**
   * Validate images
   */
  validateImages(html: string): Issue[] {
    const issues: Issue[] = [];
    if (!html) return issues;

    const imgPattern = /<img[^>]*>/gi;
    let match;

    while ((match = imgPattern.exec(html)) !== null) {
      const imgTag = match[0];
      const srcMatch = /src=["']([^"']*)["']/i.exec(imgTag);
      const altMatch = /alt=["']([^"']*)["']/i.exec(imgTag);
      
      const src = srcMatch ? srcMatch[1] : '';
      const alt = altMatch ? altMatch[1] : '';

      // Check for broken image src
      if (!src || src === '#' || src.startsWith('data:image/gif;base64,R0lGOD')) {
        issues.push({
          rule_id: 'image_validation_001',
          type: 'image_validation',
          category: 'broken_images',
          severity: 'critical',
          message: 'Broken or placeholder image detected',
          found: src || 'missing src',
          original: src,
          suggestion: 'Provide valid image URL'
        });
      }

      // Check for missing alt text
      if (!alt || alt.trim().length === 0) {
        issues.push({
          rule_id: 'accessibility_002',
          type: 'accessibility',
          category: 'image_accessibility',
          severity: 'high',
          message: 'Image missing alt text for accessibility',
          found: src,
          original: '',
          suggestion: 'Add descriptive alt text for screen readers'
        });
      }
    }

    return issues;
  }

  /**
   * Detect language (English or Arabic)
   */
  detectLanguage(text: string): string {
    if (!text) return 'unknown';
    
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const totalChars = (text.match(/[a-zA-Z\u0600-\u06FF]/g) || []).length;
    
    if (totalChars === 0) return 'unknown';
    
    const arabicRatio = arabicChars / totalChars;
    return arabicRatio > 0.3 ? 'ar' : 'en';
  }

  // ============================================
  // NEW ENHANCED METHODS
  // ============================================

  /**
   * Validate font families based on filename AND language context
   * â­ ENHANCED: Now checks for Arabic font (Tajawal) universally
   */
  validateFontFamily(html: string, fileName: string): Issue[] {
    const issues: Issue[] = [];
    if (!html) return issues;

    const isPBFont = fileName.toLowerCase().startsWith('pb_font');
    const fontFamilyPattern = /font-family:\s*([^;}\n]+)/gi;
    let match;

    while ((match = fontFamilyPattern.exec(html)) !== null) {
      const fontFamily = match[1].trim().replace(/["']/g, '');
      
      // â­ NEW: Check if this font is in an Arabic context
      // Get surrounding context (200 chars before and after)
      const contextStart = Math.max(0, match.index - 500);
      const contextEnd = Math.min(html.length, match.index + 500);
      const context = html.slice(contextStart, contextEnd);

      // Check for explicit RTL direction (strongest indicator of Arabic section)
      const hasRTLDirection = /direction:\s*rtl/i.test(context) || /dir=["']rtl["']/i.test(context);

      // Count Arabic vs English characters in the immediate context
      const arabicChars = (context.match(/[\u0600-\u06FF]/g) || []).length;
      const englishChars = (context.match(/[a-zA-Z]/g) || []).length;

      // Consider it Arabic context if has explicit RTL direction OR Arabic chars significantly outnumber English (ratio > 0.3)
      const hasArabicChars = hasRTLDirection || (arabicChars > 0 && arabicChars / (englishChars + arabicChars) > 0.3);
      
      // â­ PRIORITY CHECK: Arabic content MUST use Tajawal
      if (hasArabicChars) {
        // Skip validation for generic fallback fonts
        const isFallbackFont = fontFamily.toLowerCase() === 'sans-serif' ||
                               fontFamily.toLowerCase() === 'arial' ||
                               fontFamily.toLowerCase() === 'helvetica';
        if (isFallbackFont) {
          continue; // Generic fallback fonts are acceptable
        }

        // Arabic content must use Tajawal
        if (!fontFamily.includes('Tajawal')) {
          issues.push({
            rule_id: 'font_family_arabic_001',
            type: 'brand_compliance',
            category: 'brand_compliance',
            severity: 'critical',
            message: 'Arabic content must use "Tajawal, sans-serif" font',
            original: fontFamily,
            suggestion: 'Tajawal, sans-serif',
            position: match.index,
            found: `font-family: ${fontFamily}`,
            context: context.substring(0, 100) + '...'
          });
          continue; // Skip other checks if Arabic check fails
        }
      }
      
      // Existing checks for non-Arabic content
      if (isPBFont) {
        if (!fontFamily.includes('IBM Plex Sans') && !fontFamily.includes('sans-serif')) {
          issues.push({
            rule_id: 'font_family_pb_001',
            type: 'brand_compliance',
            category: 'brand_compliance',
            severity: 'critical',
            message: 'PB_Font file must use "IBM Plex Sans, sans-serif"',
            original: fontFamily,
            suggestion: 'IBM Plex Sans, sans-serif',
            position: match.index,
            found: `font-family: ${fontFamily}`
          });
        }
      } else {
        // Only check for Plus Jakarta Sans if NOT in Arabic context
        // Also allow Tajawal for bilingual content
        if (!hasArabicChars && !fontFamily.includes('Plus Jakarta Sans') && !fontFamily.includes('Tajawal')) {
          issues.push({
            rule_id: 'font_family_regular_001',
            type: 'brand_compliance',
            category: 'brand_compliance',
            severity: 'critical',
            message: 'Regular files must use "Plus Jakarta Sans"',
            original: fontFamily,
            suggestion: 'Plus Jakarta Sans, sans-serif',
            position: match.index,
            found: `font-family: ${fontFamily}`
          });
        }
      }
    }

    return issues;
  }

  /**
   * Validate colors
   */
  validateColors(html: string): Issue[] {
    const issues: Issue[] = [];
    if (!html) return issues;

    const colorPatterns = [
      /color:\s*#([0-9a-fA-F]{6})/gi,
      /background-color:\s*#([0-9a-fA-F]{6})/gi,
      /background:\s*#([0-9a-fA-F]{6})/gi,
      /border-color:\s*#([0-9a-fA-F]{6})/gi,
    ];

    for (const pattern of colorPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const fullColor = `#${match[1]}`;
        
        const isAllowed = this.ALLOWED_COLORS.some(
          allowed => allowed.toLowerCase() === fullColor.toLowerCase()
        );

        if (!isAllowed) {
          issues.push({
            rule_id: 'color_validation_001',
            type: 'brand_compliance',
            category: 'brand_compliance',
            severity: 'high',
            message: `Unauthorized color code detected: ${fullColor}`,
            original: fullColor,
            suggestion: `Verify if this color should be allowed. Current allowed: ${this.ALLOWED_COLORS.join(', ')}`,
            position: match.index,
            found: fullColor
          });
        }
      }
    }

    return issues;
  }

  /**
   * Validate custom variable format [Field: VariableName]
   * CASE-SENSITIVE and EXACT match required
   * Shows exact text and location for each error
   */
  validateCustomVariables(text: string): Issue[] {
    const issues: Issue[] = [];
    if (!text) return issues;

    // Expanded: Exact allowed variables (CASE-SENSITIVE)
    // Updated based on real Emirates NBD EDM analysis
    const allowedVariables = [
      // Original fields
      'First Name',
      'Last Name',
      'Pseudo ID',
      'Email',
      'Phone',
      
      // NEW: Fields found in actual Emirates NBD EDMs
      'Customer CIF - Masked',
      'Personalization Field1',
      'Personalization Field2',
      'Personalization Field3',
      'Personalization Field4',
      'Customer CIF',
      'Customer Name',
      'Account Number',
      'Card Number',
      'Mobile Number',
      'Branch Name',
      'Offer Date',
      'Expiry Date'
    ];

    // Pattern 1: Detect missing space after colon [Field:Name]
    const incorrectPattern = /\[Field:(?!\s)([^\]]+)\]/g;
    let match;

    while ((match = incorrectPattern.exec(text)) !== null) {
      const variableName = match[1];
      const fullMatch = match[0]; // e.g., "[Field:LastName]"
      
      // Get surrounding context - extract full sentence or HTML tag
      const start = Math.max(0, match.index - 100);
      const end = Math.min(text.length, match.index + match[0].length + 100);
      let context = text.slice(start, end);
      
      // Try to extract meaningful context (sentence or HTML tag)
      const tagMatch = context.match(/<[^>]*\[Field:[^\]]*\][^>]*>/);
      if (tagMatch) {
        context = tagMatch[0]; // Show the full HTML tag
      } else {
        // Try to extract sentence
        const sentenceMatch = context.match(/[^.!?\n<>]*\[Field:[^\]]*\][^.!?\n<>]*/);
        if (sentenceMatch) {
          context = sentenceMatch[0].trim();
        }
      }
      
      // Limit context length
      if (context.length > 150) {
        context = '...' + context.slice(context.length - 150);
      }
      
      issues.push({
        rule_id: 'variable_format_001',
        type: 'brand_compliance',
        category: 'brand_compliance',
        severity: 'critical',
        message: `Variable missing space after colon`,
        original: fullMatch,
        suggestion: `[Field: ${variableName.trim()}]`,
        position: match.index,
        found: fullMatch,
        context: context
      });
    }

    // Pattern 2: Check variables with correct format [Field: Name]
    // Must be EXACT match (case-sensitive) with allowed variables
    const validPattern = /\[Field:\s+([^\]]+)\]/g;

    while ((match = validPattern.exec(text)) !== null) {
      const variableName = match[1].trim();
      const fullMatch = match[0]; // e.g., "[Field: LastName]"
      
      // Get surrounding context
      const start = Math.max(0, match.index - 30);
      const end = Math.min(text.length, match.index + match[0].length + 30);
      const context = text.slice(start, end);
      
      // EXACT case-sensitive match
      if (!allowedVariables.includes(variableName)) {
        // Check if it's a case mismatch of an allowed variable
        const correctVariable = allowedVariables.find(
          allowed => allowed.toLowerCase() === variableName.toLowerCase()
        );

        if (correctVariable) {
          // Case mismatch - CRITICAL error with exact details
          issues.push({
            rule_id: 'variable_format_002',
            type: 'brand_compliance',
            category: 'brand_compliance',
            severity: 'critical',
            message: `Variable name case mismatch: "${variableName}"`,
            original: fullMatch,
            suggestion: `[Field: ${correctVariable}]`,
            position: match.index,
            found: fullMatch,
            context: context
          });
        } else {
          // Completely unknown variable
          // Changed from 'high' to 'medium' - new fields are added frequently
          issues.push({
            rule_id: 'variable_format_003',
            type: 'brand_compliance',
            category: 'brand_compliance',
            severity: 'medium',
            message: `Unknown variable: "${variableName}" - May need to be added to allowed list`,
            original: fullMatch,
            suggestion: `Verify with CRM team. Common fields: ${allowedVariables.slice(0, 5).join(', ')}...`,
            position: match.index,
            found: fullMatch,
            context: context
          });
        }
      }
    }

    return issues;
  }

  /**
   * Validate production URLs
   */
  validateProductionUrls(html: string): Issue[] {
    const issues: Issue[] = [];
    if (!html) return issues;

    const stagingPattern = /(https?:\/\/)?(staging|test|dev|qa)\.emiratesnbd\.com/gi;
    let match;

    while ((match = stagingPattern.exec(html)) !== null) {
      issues.push({
        rule_id: 'staging_url_001',
        type: 'deployment',
        category: 'broken_links',
        severity: 'critical',
        message: '🚨 STAGING/TEST URL DETECTED - Must use production URL',
        original: match[0],
        suggestion: 'Replace with www.emiratesnbd.com',
        position: match.index,
        found: match[0]
      });
    }

    return issues;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private isException(text: string, match: RegExpExecArray, exceptions: string[]): boolean {
    if (!exceptions || exceptions.length === 0) return false;
    const start = Math.max(0, match.index - 100);
    const end = Math.min(text.length, match.index + match[0].length + 100);
    const context = text.slice(start, end).toLowerCase();
    return exceptions.some(exception => context.includes(exception.toLowerCase()));
  }

  getRules(): Rule[] {
    return this.rules;
  }

  reload(): void {
    console.log('🔄 Reloading rules...');
    this.loadRules();
  }
}

// Export as 'rulesEngine' to match import in checker.service.ts
export const rulesEngine = new RulesEngineEnhanced();