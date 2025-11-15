/**
 * Complete test for URL checking endpoint
 * Tests the 3-tier scraping and URL-specific rule filtering
 *
 * Run from external machine (not from server due to network restrictions):
 * node test-url-endpoint.js
 */

const fetch = require('node-fetch');

// Test configuration
const API_URL = 'https://checker.xopenai.in/api/check-url';
// const API_URL = 'http://localhost:3006/api/check-url'; // For local testing

async function testUrlCheck() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 URL CHECKING ENDPOINT TEST');
  console.log('='.repeat(80) + '\n');

  // Test URLs with different characteristics
  const testCases = [
    {
      name: 'Simple URL (Tier 1: Cheerio expected)',
      url: 'https://example.com',
      expectedTier: 1,
      description: 'Basic HTML, should work with cheerio'
    },
    {
      name: 'Bank Website (Tier 2: Gemini AI expected)',
      url: 'https://www.emiratesnbd.com/en/about-us',
      expectedTier: 2,
      description: 'Protected by Cloudflare, needs Gemini AI'
    },
    {
      name: 'Arabic Content Test',
      url: 'https://www.emiratesnbd.com/ar/about-us',
      expectedTier: 2,
      description: 'Arabic page, tests language detection and link validation'
    }
  ];

  for (const testCase of testCases) {
    console.log('━'.repeat(80));
    console.log(`📋 Test: ${testCase.name}`);
    console.log(`🔗 URL: ${testCase.url}`);
    console.log(`📝 ${testCase.description}`);
    console.log('━'.repeat(80) + '\n');

    try {
      console.log('⏳ Sending request...\n');
      const startTime = Date.now();

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: testCase.url,
          content_type: 'web'
        })
      });

      const elapsedTime = Date.now() - startTime;
      const data = await response.json();

      if (data.success) {
        console.log('✅ SUCCESS\n');
        console.log('📊 RESULTS:');
        console.log('─'.repeat(80));
        console.log(`   URL: ${data.data.url}`);
        console.log(`   Page Title: ${data.data.pageTitle || 'N/A'}`);
        console.log(`   Scraping Method: ${data.data.scrapingMethod}`);
        console.log(`   Tier Used: ${data.meta?.tier || 'N/A'}`);
        console.log(`   Total Issues: ${data.data.metrics.totalIssues}`);
        console.log(`   Compliance Score: ${data.data.metrics.complianceScore}/100`);
        console.log(`   Processing Time: ${data.data.processingTime}ms`);
        console.log(`   Total Request Time: ${elapsedTime}ms\n`);

        // Verify tier expectation
        if (data.meta?.tier === testCase.expectedTier) {
          console.log(`   ✅ Expected tier ${testCase.expectedTier} was used`);
        } else {
          console.log(`   ⚠️  Expected tier ${testCase.expectedTier}, but tier ${data.meta?.tier} was used`);
          console.log(`   💡 ${data.meta?.message || ''}`);
        }

        // Show issues by category
        const issues = data.data.issues || {};
        console.log('\n📋 ISSUES BY CATEGORY:');
        console.log('─'.repeat(80));

        let totalFound = 0;
        for (const [category, categoryIssues] of Object.entries(issues)) {
          if (Array.isArray(categoryIssues) && categoryIssues.length > 0) {
            console.log(`\n   ${category.toUpperCase()} (${categoryIssues.length}):)`);
            categoryIssues.slice(0, 3).forEach((issue, index) => {
              totalFound++;
              console.log(`   ${index + 1}. [${issue.severity}] ${issue.rule_id}`);
              console.log(`      ${issue.message}`);
              if (issue.suggestion) {
                console.log(`      💡 ${issue.suggestion}`);
              }
            });
            if (categoryIssues.length > 3) {
              console.log(`   ... and ${categoryIssues.length - 3} more`);
            }
          }
        }

        if (totalFound === 0) {
          console.log('   ✅ No issues found - content is compliant!');
        }

        // Verify URL-specific filtering
        console.log('\n🔍 RULE FILTERING VERIFICATION:');
        console.log('─'.repeat(80));
        const allIssuesFlat = Object.values(issues).flat();

        const edmSpecificRules = [
          'variable_format',
          'font_family',
          'color_validation',
          'staging_url'
        ];

        const foundEdmRules = allIssuesFlat.filter(i =>
          edmSpecificRules.some(pattern => i.rule_id?.startsWith(pattern))
        );

        if (foundEdmRules.length === 0) {
          console.log('   ✅ PASS: No EDM-specific rules detected (correct filtering)');
        } else {
          console.log('   ❌ FAIL: Found EDM-specific rules that should be filtered:');
          foundEdmRules.forEach(issue => {
            console.log(`      - ${issue.rule_id}`);
          });
        }

        console.log('\n' + '='.repeat(80) + '\n');

      } else {
        console.log('❌ FAILED\n');
        console.log(`Status: ${response.status}`);
        console.log(`Error: ${data.error}`);
        console.log(`Message: ${data.message}`);

        if (data.error === 'MANUAL_PASTE_REQUIRED') {
          console.log('\n💡 This URL requires manual paste (Tier 3):');
          console.log('   The site has strong anti-scraping protection');
          console.log('   that cannot be bypassed by automated tools.\n');
        }
        console.log('\n' + '='.repeat(80) + '\n');
      }

    } catch (error) {
      console.log('💥 ERROR\n');
      console.error(`Message: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
      console.log('\n' + '='.repeat(80) + '\n');
    }

    // Wait between tests
    if (testCases.indexOf(testCase) < testCases.length - 1) {
      console.log('⏸️  Waiting 2 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✨ ALL TESTS COMPLETE');
  console.log('='.repeat(80) + '\n');
}

// Run tests
testUrlCheck().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
