/**
 * Test text checking endpoint to verify URL-specific rule filtering
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:3003/api/check-text';

async function testTextCheck() {
  console.log('\n🧪 Testing text checking with URL-appropriate rules\n');

  // Text with both EDM-specific and general issues
  const testText = `
    Dear [Field: Customer Name],

    Get amazing interest rate on your personal loan!
    Click here to learn more.

    Visit staging.emiratesnbd.com for details.
    Contact us at test@gmail.com or call 123-456-7890.

    Apply now with our credit card offers.
    We guarantee 100% approval!
  `;

  try {
    console.log('📝 Test text includes:');
    console.log('  - Custom variable [Field: Customer Name] (EDM-only)');
    console.log('  - "interest rate" instead of "profit rate"');
    console.log('  - "amazing" (casual tone)');
    console.log('  - "Click here" (generic CTA)');
    console.log('  - staging URL');
    console.log('  - non-official email');
    console.log('  - "guarantee" (absolute claim)');
    console.log('  - "loan" instead of "financing"');

    console.log('\n📡 Sending request...\n');

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: testText,
        content_type: 'web'
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ SUCCESS\n');
      console.log(`📊 Results:`);
      console.log(`  Total Issues: ${data.data.metrics.totalIssues}`);
      console.log(`  - Critical: ${data.data.metrics.criticalIssues}`);
      console.log(`  - High: ${data.data.metrics.highIssues}`);
      console.log(`  - Medium: ${data.data.metrics.mediumIssues}`);
      console.log(`  - Low: ${data.data.metrics.lowIssues}`);
      console.log(`  Compliance Score: ${data.data.metrics.complianceScore}/100\n`);

      if (data.data.issues && data.data.issues.length > 0) {
        console.log('🔍 Issues found:');
        data.data.issues.forEach((issue, index) => {
          console.log(`\n  ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.category}`);
          console.log(`     Rule: ${issue.rule_id}`);
          console.log(`     Message: ${issue.message}`);
          if (issue.suggestion) {
            console.log(`     Suggestion: ${issue.suggestion}`);
          }
        });
      }

      console.log('\n✅ URL-specific filtering is working!');
      console.log('   (EDM-specific rules like [Field: ] variables should be excluded)');

    } else {
      console.log('❌ FAILED');
      console.log(`Error: ${data.error}`);
      console.log(`Message: ${data.message}`);
    }
  } catch (error) {
    console.error('💥 ERROR:', error.message);
  }
}

// Run test
testTextCheck();
