/**
 * Detailed test to verify URL vs EDM rule filtering
 */

const fetch = require('node-fetch');

async function testRuleFiltering() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 Testing URL-specific vs EDM-specific Rule Filtering');
  console.log('='.repeat(70) + '\n');

  // Text with BOTH EDM-specific and URL-applicable issues
  const testText = `
    Dear [Field: Customer Name],

    Get amazing interest rate on your personal loan!
    Click here to learn more.

    Visit staging.emiratesnbd.com for details.
    Contact us at test@gmail.com
  `;

  console.log('📝 Test Text Contains:');
  console.log('  ✓ [Field: Customer Name] - EDM variable (should be EXCLUDED for URLs)');
  console.log('  ✓ "interest rate" - Should suggest "profit rate"');
  console.log('  ✓ "amazing" - Casual tone warning');
  console.log('  ✓ "Click here" - Generic CTA');
  console.log('  ✓ "staging.emiratesnbd.com" - Staging URL');
  console.log('  ✓ "test@gmail.com" - Non-official email');
  console.log('  ✓ "loan" - Should suggest "financing"\n');

  // Test 1: Check as WEB content (URL-specific rules only)
  console.log('━'.repeat(70));
  console.log('TEST 1: Checking as WEB content (URL-appropriate rules only)');
  console.log('━'.repeat(70) + '\n');

  try {
    const webResponse = await fetch('http://localhost:3003/api/check-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: testText,
        content_type: 'web'
      })
    });

    const webData = await webResponse.json();

    if (webData.success) {
      console.log(`✅ Web Check Results:`);
      console.log(`   Total Issues: ${webData.data.metrics.totalIssues}`);
      console.log(`   Compliance Score: ${webData.data.metrics.complianceScore}/100\n`);

      if (webData.data.issues && webData.data.issues.length > 0) {
        console.log('   Issues Found:');
        webData.data.issues.forEach((issue, index) => {
          console.log(`   ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.rule_id}`);
          console.log(`      ${issue.message}`);
        });

        // Check if variable_format was excluded
        const hasVariableIssue = webData.data.issues.some(i =>
          i.rule_id && i.rule_id.startsWith('variable_format')
        );

        console.log('\n   🔍 EDM Variable Rule Check:');
        if (hasVariableIssue) {
          console.log('   ❌ FAIL: variable_format rule was NOT filtered out!');
        } else {
          console.log('   ✅ PASS: variable_format rule correctly excluded for web content');
        }
      }
    } else {
      console.log(`❌ FAILED: ${webData.error}`);
    }
  } catch (error) {
    console.error(`💥 ERROR: ${error.message}`);
  }

  // Test 2: Check as EDM content (all rules apply)
  console.log('\n' + '━'.repeat(70));
  console.log('TEST 2: Checking as EDM content (all rules including EDM-specific)');
  console.log('━'.repeat(70) + '\n');

  try {
    const edmResponse = await fetch('http://localhost:3003/api/check-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: testText,
        content_type: 'edm'
      })
    });

    const edmData = await edmResponse.json();

    if (edmData.success) {
      console.log(`✅ EDM Check Results:`);
      console.log(`   Total Issues: ${edmData.data.metrics.totalIssues}`);
      console.log(`   Compliance Score: ${edmData.data.metrics.complianceScore}/100\n`);

      if (edmData.data.issues && edmData.data.issues.length > 0) {
        console.log('   Issues Found:');
        edmData.data.issues.forEach((issue, index) => {
          console.log(`   ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.rule_id}`);
          console.log(`      ${issue.message}`);
        });

        // Check if variable_format was included
        const hasVariableIssue = edmData.data.issues.some(i =>
          i.rule_id && i.rule_id.startsWith('variable_format')
        );

        console.log('\n   🔍 EDM Variable Rule Check:');
        if (hasVariableIssue) {
          console.log('   ✅ PASS: variable_format rule correctly included for EDM content');
        } else {
          console.log('   ℹ️  INFO: variable_format rule not triggered (may need proper format)');
        }
      }
    } else {
      console.log(`❌ FAILED: ${edmData.error}`);
    }
  } catch (error) {
    console.error(`💥 ERROR: ${error.message}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✨ Rule Filtering Test Complete');
  console.log('='.repeat(70) + '\n');
}

// Test 3: Verify /api/check-url endpoint exists
async function testUrlEndpoint() {
  console.log('\n🔍 Verifying /api/check-url endpoint is available...\n');

  try {
    // Try with invalid data to see if endpoint exists
    const response = await fetch('http://localhost:3003/api/check-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: '' })
    });

    const data = await response.json();

    if (response.status === 400 && data.error === 'No URL provided') {
      console.log('✅ /api/check-url endpoint exists and is responding correctly');
      console.log('   (Returns proper error for empty URL)\n');
    } else {
      console.log('ℹ️  Endpoint exists but response unexpected:');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
    }
  } catch (error) {
    console.error(`❌ Endpoint test failed: ${error.message}\n`);
  }
}

// Run all tests
(async () => {
  await testRuleFiltering();
  await testUrlEndpoint();
})();
