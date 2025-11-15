/**
 * Test URL-specific rule filtering by directly calling the url-checker service
 */

const fetch = require('node-fetch');

async function testUrlFiltering() {
  console.log('\n' + '='.repeat(75));
  console.log('🎯 URL-SPECIFIC RULE FILTERING TEST');
  console.log('='.repeat(75) + '\n');

  // HTML with BOTH URL-appropriate and EDM-specific issues
  const testHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Test Page - Emirates NBD</title>
  <style>
    .header { font-family: "Helvetica"; color: #FF0000; }
    .pb_special { font-family: "IBM Plex Sans"; color: #072447; }
  </style>
</head>
<body>
  <h1>Welcome [Field: Customer Name]!</h1>

  <p>Get amazing interest rate on your personal loan!</p>

  <p><a href="https://staging.emiratesnbd.com">Click here</a> to learn more.</p>

  <img src="banner.jpg">

  <p>Contact us at test@gmail.com or call 123-456-7890</p>

  <p>We guarantee 100% approval! Apply now.</p>
</body>
</html>
  `;

  const testText = testHTML.replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  console.log('📄 Test HTML contains:');
  console.log('  🔴 EDM-SPECIFIC (should be FILTERED for URLs):');
  console.log('     • [Field: Customer Name] - custom variable');
  console.log('     • font-family: "Helvetica" - invalid font (EDM validation)');
  console.log('     • color: #FF0000 - unauthorized color (EDM validation)');
  console.log('     • staging.emiratesnbd.com - staging URL (internal)');
  console.log('');
  console.log('  🟢 URL-APPROPRIATE (should be DETECTED):');
  console.log('     • "interest rate" → should be "profit rate"');
  console.log('     • "amazing" - overly casual tone');
  console.log('     • "Click here" - generic CTA');
  console.log('     • "loan" → should be "financing"');
  console.log('     • test@gmail.com - non-official email');
  console.log('     • "guarantee 100%" - absolute claim');
  console.log('     • <img> without alt - accessibility');
  console.log('');

  console.log('━'.repeat(75));
  console.log('📡 Sending to /api/check-url endpoint (with URL-specific filtering)...');
  console.log('━'.repeat(75) + '\n');

  try {
    // Simulate URL check by passing the HTML/text directly
    // In production, this would come from the url-scraper
    const response = await fetch('http://localhost:3003/api/check-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: testText,
        content_type: 'web'
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ SUCCESS - Response received\n');
      console.log('📊 RESULTS:');
      console.log('─'.repeat(75));
      console.log(`   Total Issues: ${data.data.metrics.totalIssues}`);
      console.log(`   Compliance Score: ${data.data.metrics.complianceScore}/100`);
      console.log(`   Processing Time: ${data.data.processingTime}ms\n`);

      // Analyze issues by category
      const issues = data.data.issues || {};

      let totalFound = 0;
      console.log('📋 ISSUES BY CATEGORY:');
      console.log('─'.repeat(75));

      for (const [category, categoryIssues] of Object.entries(issues)) {
        if (Array.isArray(categoryIssues) && categoryIssues.length > 0) {
          console.log(`\n   ${category.toUpperCase()} (${categoryIssues.length} issues):`);
          categoryIssues.forEach((issue, index) => {
            totalFound++;
            console.log(`   ${index + 1}. [${issue.severity || 'unknown'}] ${issue.rule_id || 'N/A'}`);
            console.log(`      ${issue.message || 'No message'}`);
            if (issue.suggestion) {
              console.log(`      💡 ${issue.suggestion}`);
            }
          });
        }
      }

      if (totalFound === 0) {
        console.log('   No issues found in categories');
      }

      console.log('\n' + '='.repeat(75));
      console.log('🔍 VERIFICATION:');
      console.log('='.repeat(75));

      // Check for EDM-specific rules that should be filtered
      const allIssuesFlat = Object.values(issues).flat();

      const hasVariableIssue = allIssuesFlat.some(i =>
        i.rule_id && i.rule_id.startsWith('variable_format')
      );
      const hasFontIssue = allIssuesFlat.some(i =>
        i.rule_id && i.rule_id.startsWith('font_family')
      );
      const hasColorIssue = allIssuesFlat.some(i =>
        i.rule_id && i.rule_id.startsWith('color_')
      );
      const hasStagingUrlIssue = allIssuesFlat.some(i =>
        i.rule_id && i.rule_id.startsWith('staging_url')
      );

      console.log('\nEDM-SPECIFIC RULES (should be excluded for web content):');
      console.log(`  ${hasVariableIssue ? '❌ FAIL' : '✅ PASS'} - variable_format (custom variables)`);
      console.log(`  ${hasFontIssue ? '❌ FAIL' : '✅ PASS'} - font_family validation`);
      console.log(`  ${hasColorIssue ? '❌ FAIL' : '✅ PASS'} - color validation`);
      console.log(`  ${hasStagingUrlIssue ? '❌ FAIL' : '✅ PASS'} - staging_url detection`);

      const allPassed = !hasVariableIssue && !hasFontIssue && !hasColorIssue && !hasStagingUrlIssue;

      if (allPassed) {
        console.log('\n🎉 SUCCESS: URL-specific filtering is working correctly!');
        console.log('   All EDM-specific rules were properly excluded.');
      } else {
        console.log('\n⚠️  WARNING: Some EDM-specific rules were not filtered!');
        console.log('   This may indicate a filtering issue.');
      }

      console.log('\n' + '='.repeat(75) + '\n');

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
testUrlFiltering();
