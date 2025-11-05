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
exports.seoAnalyzerService = void 0;
const cheerio = __importStar(require("cheerio"));
class SeoAnalyzerService {
    /**
     * Analyze SEO aspects of HTML content
     */
    analyzeSEO(html, url, urlType = 'others') {
        const $ = cheerio.load(html);
        // Analyze all aspects
        const title = this.analyzeTitle($);
        const metaDescription = this.analyzeMetaDescription($);
        const metaTags = this.extractMetaTags($);
        const openGraph = this.analyzeOpenGraph($);
        const twitterCard = this.analyzeTwitterCard($);
        const technical = this.analyzeTechnicalSEO($);
        const headings = this.analyzeHeadings($);
        const schemas = this.analyzeSchemas($, urlType);
        const images = this.analyzeImages($);
        const links = this.analyzeLinks($, url);
        // Calculate overall score
        const overallScore = this.calculateOverallScore({
            title,
            metaDescription,
            openGraph,
            twitterCard,
            technical,
            headings,
            schemas,
            images,
        });
        return {
            title,
            metaDescription,
            metaTags,
            openGraph,
            twitterCard,
            technical,
            headings,
            schemas,
            images,
            links,
            overallScore,
        };
    }
    /**
     * Analyze title tag
     */
    analyzeTitle($) {
        const titleTag = $('title').first();
        const content = titleTag.text().trim();
        const length = content.length;
        const issues = [];
        let score = 100;
        if (!content) {
            issues.push('Missing title tag');
            score = 0;
        }
        else {
            if (length < 30) {
                issues.push('Title is too short (recommended: 50-60 characters)');
                score -= 30;
            }
            else if (length > 60) {
                issues.push('Title is too long and may be truncated in search results');
                score -= 20;
            }
            if (length > 0 && length < 50) {
                score -= 10;
            }
            // Check for keywords at the beginning
            if (content && !content.match(/^[A-Z]/)) {
                issues.push('Title should start with a capital letter');
                score -= 5;
            }
        }
        return {
            content,
            length,
            score: Math.max(0, score),
            issues,
        };
    }
    /**
     * Analyze meta description
     */
    analyzeMetaDescription($) {
        const metaDesc = $('meta[name="description"]').first();
        const content = metaDesc.attr('content') || '';
        const length = content.length;
        const issues = [];
        let score = 100;
        if (!content) {
            issues.push('Missing meta description');
            score = 0;
        }
        else {
            if (length < 120) {
                issues.push('Meta description is too short (recommended: 150-160 characters)');
                score -= 30;
            }
            else if (length > 160) {
                issues.push('Meta description is too long and may be truncated');
                score -= 20;
            }
            if (length > 0 && length < 150) {
                score -= 10;
            }
            // Check for call-to-action
            const ctaWords = ['discover', 'learn', 'find', 'get', 'explore', 'see', 'try', 'shop', 'buy', 'download'];
            const hasCTA = ctaWords.some(word => content.toLowerCase().includes(word));
            if (!hasCTA) {
                issues.push('Consider adding a call-to-action in your meta description');
                score -= 10;
            }
        }
        return {
            content,
            length,
            score: Math.max(0, score),
            issues,
        };
    }
    /**
     * Extract all meta tags
     */
    extractMetaTags($) {
        const metaTags = [];
        $('meta').each((_, elem) => {
            const $elem = $(elem);
            const tag = {
                content: $elem.attr('content') || '',
            };
            if ($elem.attr('name')) {
                tag.name = $elem.attr('name');
            }
            if ($elem.attr('property')) {
                tag.property = $elem.attr('property');
            }
            if ($elem.attr('http-equiv')) {
                tag.httpEquiv = $elem.attr('http-equiv');
            }
            metaTags.push(tag);
        });
        return metaTags;
    }
    /**
     * Analyze Open Graph tags
     */
    analyzeOpenGraph($) {
        const ogTags = [];
        const issues = [];
        $('meta[property^="og:"]').each((_, elem) => {
            const $elem = $(elem);
            ogTags.push({
                property: $elem.attr('property'),
                content: $elem.attr('content') || '',
            });
        });
        const present = ogTags.length > 0;
        if (!present) {
            issues.push('No Open Graph tags found. Add OG tags for better social media sharing.');
        }
        else {
            const requiredOG = ['og:title', 'og:description', 'og:image', 'og:url'];
            requiredOG.forEach(required => {
                if (!ogTags.find(tag => tag.property === required)) {
                    issues.push(`Missing ${required} tag`);
                }
            });
        }
        return { present, tags: ogTags, issues };
    }
    /**
     * Analyze Twitter Card tags
     */
    analyzeTwitterCard($) {
        const twitterTags = [];
        const issues = [];
        $('meta[name^="twitter:"]').each((_, elem) => {
            const $elem = $(elem);
            twitterTags.push({
                name: $elem.attr('name'),
                content: $elem.attr('content') || '',
            });
        });
        const present = twitterTags.length > 0;
        if (!present) {
            issues.push('No Twitter Card tags found. Add Twitter Card tags for better Twitter sharing.');
        }
        else {
            const requiredTwitter = ['twitter:card', 'twitter:title', 'twitter:description'];
            requiredTwitter.forEach(required => {
                if (!twitterTags.find(tag => tag.name === required)) {
                    issues.push(`Missing ${required} tag`);
                }
            });
        }
        return { present, tags: twitterTags, issues };
    }
    /**
     * Analyze technical SEO elements
     */
    analyzeTechnicalSEO($) {
        const issues = [];
        // Canonical URL
        const canonical = $('link[rel="canonical"]').attr('href') || null;
        if (!canonical) {
            issues.push({
                severity: 'medium',
                message: 'Missing canonical URL. Add a canonical tag to prevent duplicate content issues.',
                category: 'technical-seo',
            });
        }
        // Robots meta
        const robots = $('meta[name="robots"]').attr('content') || null;
        if (robots && (robots.includes('noindex') || robots.includes('nofollow'))) {
            issues.push({
                severity: 'critical',
                message: `Page has restrictive robots directive: ${robots}. This may prevent search engines from indexing.`,
                category: 'technical-seo',
            });
        }
        // Language
        const htmlLang = $('html').attr('lang') || null;
        if (!htmlLang) {
            issues.push({
                severity: 'low',
                message: 'Missing lang attribute on <html> tag. Add lang="en" or appropriate language code.',
                category: 'technical-seo',
            });
        }
        // Viewport
        const viewport = $('meta[name="viewport"]').attr('content') || null;
        if (!viewport) {
            issues.push({
                severity: 'high',
                message: 'Missing viewport meta tag. Page may not be mobile-friendly.',
                category: 'technical-seo',
            });
        }
        // Favicon
        const favicon = $('link[rel="icon"], link[rel="shortcut icon"]').length > 0;
        if (!favicon) {
            issues.push({
                severity: 'low',
                message: 'Missing favicon. Add a favicon for better brand recognition.',
                category: 'technical-seo',
            });
        }
        return {
            canonical,
            robots,
            language: htmlLang,
            viewport,
            favicon,
            issues,
        };
    }
    /**
     * Analyze heading structure
     */
    analyzeHeadings($) {
        const h1Elements = $('h1');
        const h1 = h1Elements.map((_, elem) => $(elem).text().trim()).get();
        const issues = [];
        if (h1.length === 0) {
            issues.push({
                severity: 'critical',
                message: 'Missing H1 tag. Every page should have exactly one H1 heading.',
                category: 'headings',
            });
        }
        else if (h1.length > 1) {
            issues.push({
                severity: 'high',
                message: `Multiple H1 tags found (${h1.length}). Use only one H1 per page.`,
                category: 'headings',
            });
        }
        else {
            // Check H1 length
            if (h1[0].length < 20) {
                issues.push({
                    severity: 'medium',
                    message: 'H1 is too short. Consider making it more descriptive.',
                    category: 'headings',
                });
            }
            else if (h1[0].length > 70) {
                issues.push({
                    severity: 'low',
                    message: 'H1 is quite long. Consider shortening it for better readability.',
                    category: 'headings',
                });
            }
        }
        // Check heading hierarchy
        const h2Count = $('h2').length;
        const h3Count = $('h3').length;
        if (h1.length > 0 && h2Count === 0) {
            issues.push({
                severity: 'medium',
                message: 'No H2 headings found. Use H2 tags to structure your content.',
                category: 'headings',
            });
        }
        return {
            h1,
            h2Count,
            h3Count,
            h4Count: $('h4').length,
            h5Count: $('h5').length,
            h6Count: $('h6').length,
            issues,
        };
    }
    /**
     * Analyze schema markup
     */
    analyzeSchemas($, urlType) {
        const schemas = [];
        const issues = [];
        // Find all JSON-LD scripts
        $('script[type="application/ld+json"]').each((_, elem) => {
            try {
                const content = $(elem).html();
                if (content) {
                    const data = JSON.parse(content);
                    const type = Array.isArray(data) ? data[0]['@type'] : data['@type'];
                    schemas.push({
                        type: type || 'Unknown',
                        data,
                        isValid: true,
                    });
                }
            }
            catch (error) {
                schemas.push({
                    type: 'Invalid',
                    data: null,
                    isValid: false,
                });
                issues.push('Found invalid JSON-LD schema markup');
            }
        });
        const found = schemas.length > 0;
        const types = schemas.map(s => s.type).filter(Boolean);
        if (!found) {
            issues.push('No schema markup found. Add structured data for better search visibility.');
            // URL type-specific recommendations
            if (urlType === 'product') {
                issues.push('For product pages, add Product schema with price, availability, and reviews.');
            }
            else if (urlType === 'offer') {
                issues.push('For offer pages, add Offer schema with validity dates and terms.');
            }
            else if (urlType === 'campaign') {
                issues.push('Consider adding Organization or WebPage schema for campaign pages.');
            }
        }
        else {
            // Check for type-specific schemas
            if (urlType === 'product' && !types.includes('Product')) {
                issues.push('Product page should include Product schema markup.');
            }
            else if (urlType === 'offer' && !types.includes('Offer')) {
                issues.push('Offer page should include Offer schema markup.');
            }
        }
        return {
            found,
            count: schemas.length,
            types,
            data: schemas,
            issues,
        };
    }
    /**
     * Analyze images
     */
    analyzeImages($) {
        const images = $('img');
        const total = images.length;
        const withoutAlt = [];
        const issues = [];
        images.each((_, elem) => {
            const $img = $(elem);
            const alt = $img.attr('alt');
            const src = $img.attr('src');
            if (!alt || alt.trim() === '') {
                withoutAlt.push(src || 'unknown');
                issues.push({
                    severity: 'medium',
                    message: 'Image missing alt text',
                    src,
                });
            }
        });
        if (withoutAlt.length > 0) {
            issues.push({
                severity: 'high',
                message: `${withoutAlt.length} of ${total} images missing alt text. Alt text is important for accessibility and SEO.`,
            });
        }
        return {
            total,
            withoutAlt: withoutAlt.length,
            issues,
        };
    }
    /**
     * Analyze links
     */
    analyzeLinks($, pageUrl) {
        const links = $('a[href]');
        let internal = 0;
        let external = 0;
        let nofollow = 0;
        const baseUrl = new URL(pageUrl);
        links.each((_, elem) => {
            const $link = $(elem);
            const href = $link.attr('href');
            const rel = $link.attr('rel');
            if (href) {
                try {
                    const linkUrl = new URL(href, pageUrl);
                    if (linkUrl.hostname === baseUrl.hostname) {
                        internal++;
                    }
                    else {
                        external++;
                    }
                }
                catch {
                    // Relative or invalid URL, count as internal
                    internal++;
                }
                if (rel && rel.includes('nofollow')) {
                    nofollow++;
                }
            }
        });
        return {
            internal,
            external,
            broken: 0, // Would need to actually check each link
            nofollow,
        };
    }
    /**
     * Calculate overall SEO score
     */
    calculateOverallScore(analysis) {
        let score = 0;
        let maxScore = 0;
        // Title (15 points)
        score += (analysis.title.score / 100) * 15;
        maxScore += 15;
        // Meta description (15 points)
        score += (analysis.metaDescription.score / 100) * 15;
        maxScore += 15;
        // Open Graph (10 points)
        if (analysis.openGraph.present && analysis.openGraph.issues.length === 0) {
            score += 10;
        }
        else if (analysis.openGraph.present) {
            score += 5;
        }
        maxScore += 10;
        // Twitter Card (5 points)
        if (analysis.twitterCard.present && analysis.twitterCard.issues.length === 0) {
            score += 5;
        }
        else if (analysis.twitterCard.present) {
            score += 2;
        }
        maxScore += 5;
        // Technical SEO (20 points)
        const technicalIssues = analysis.technical.issues.length;
        if (technicalIssues === 0) {
            score += 20;
        }
        else {
            score += Math.max(0, 20 - (technicalIssues * 4));
        }
        maxScore += 20;
        // Headings (15 points)
        const headingIssues = analysis.headings.issues.length;
        if (headingIssues === 0 && analysis.headings.h1.length === 1) {
            score += 15;
        }
        else {
            score += Math.max(0, 15 - (headingIssues * 3));
        }
        maxScore += 15;
        // Schema (10 points)
        if (analysis.schemas.found && analysis.schemas.issues.length === 0) {
            score += 10;
        }
        else if (analysis.schemas.found) {
            score += 5;
        }
        maxScore += 10;
        // Images (10 points)
        if (analysis.images.total > 0 && analysis.images.withoutAlt === 0) {
            score += 10;
        }
        else if (analysis.images.total > 0) {
            const ratio = 1 - (analysis.images.withoutAlt / analysis.images.total);
            score += ratio * 10;
        }
        else {
            score += 10; // No images is fine
        }
        maxScore += 10;
        return Math.round((score / maxScore) * 100);
    }
}
exports.seoAnalyzerService = new SeoAnalyzerService();
//# sourceMappingURL=seo-analyzer.service.js.map