/**
 * Test URL Scraper with 3-Tier Approach
 * Tests: cheerio → Gemini AI → manual fallback
 */

const fetch = require('node-fetch');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api/check-url';

// Test URLs
const testUrls = [
  {
    name: 'Simple Site (should use cheerio)',
    url: 'https://example.com'
  },
  {
    name: 'Emirates NBD (may need Gemini)',
    url: 'https://www.emiratesnbd.com'
  },
  {
    name: 'Emirates NBD - About',
    url: 'https://www.emiratesnbd.com/en/about-us'
  }
];

async function testUrlScraping(url, name) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Testing: ${name}`);
  console.log(`🌐 URL: ${url}`);
  console.log(`${'='.repeat(60)}`);

  const startTime = Date.now();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        content_type: 'edm'
      })
    });

    const data = await response.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (data.success) {
      console.log(`\n✅ SUCCESS (${duration}s)`);
      console.log(`📊 Scraping Method: ${data.meta.scrapingMethod}`);
      console.log(`🎯 Tier Used: ${data.meta.tier}`);
      console.log(`💬 ${data.meta.message}`);
      console.log(`\n📄 Page Title: ${data.data.pageTitle}`);
      console.log(`📝 Text Length: ${data.data.extractedText?.length || 0} chars`);
      console.log(`🔍 Issues Found: ${data.data.metrics.totalIssues}`);

      if (data.data.metrics.totalIssues > 0) {
        console.log(`   ├─ Critical: ${data.data.metrics.criticalIssues}`);
        console.log(`   ├─ High: ${data.data.metrics.highIssues}`);
        console.log(`   ├─ Medium: ${data.data.metrics.mediumIssues}`);
        console.log(`   └─ Low: ${data.data.metrics.lowIssues}`);
      }

      console.log(`⭐ Compliance Score: ${data.data.metrics.complianceScore}/100`);

      if (data.data.redirectedTo) {
        console.log(`🔀 Redirected to: ${data.data.redirectedTo}`);
      }
    } else {
      console.log(`\n❌ FAILED (${duration}s)`);
      console.log(`Error: ${data.error}`);
      console.log(`Message: ${data.message}`);

      if (data.suggestion) {
        console.log(`💡 Suggestion: ${data.suggestion}`);
      }
    }
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n💥 ERROR (${duration}s)`);
    console.error(`Error: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('\n🚀 Starting URL Scraper Tests');
  console.log('Testing 3-Tier Approach:');
  console.log('  Tier 1: Cheerio (fast, lightweight)');
  console.log('  Tier 2: Gemini AI (handles Cloudflare, FREE)');
  console.log('  Tier 3: Manual paste fallback\n');

  for (const test of testUrls) {
    await testUrlScraping(test.url, test.name);

    // Wait a bit between tests
    if (testUrls.indexOf(test) < testUrls.length - 1) {
      console.log('\n⏳ Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✨ All tests completed!');
  console.log(`${'='.repeat(60)}\n`);
}

// Run tests
runAllTests().catch(err => {
  console.error('💥 Test suite failed:', err);
  process.exit(1);
});
