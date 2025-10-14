#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function validateMPQFix() {
  console.log('🧪 Validating MPQ Parser Fix...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);

    // Log important messages
    if (text.includes('MPQParser') ||
        text.includes('Found MPQ magic') ||
        text.includes('extracting') ||
        text.includes('ERROR') ||
        text.includes('Failed')) {
      console.log(`[CONSOLE] ${text}`);
    }
  });

  try {
    console.log('📂 Navigating to http://localhost:3001/...');
    await page.goto('http://localhost:3001/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🗂️  Switching to Gallery View...');
    await page.click('button:has-text("Gallery View")').catch(() => {
      console.log('   Already on Gallery View');
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('🗺️  Clicking first map card...');
    await page.click('.map-card');

    console.log('⏳ Waiting for map to load (30 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Analyze console logs
    console.log('\n========== ANALYSIS ==========');

    const mpqMagicFound = consoleLogs.some(log => log.includes('Found MPQ magic at offset'));
    const mpqParsedSuccess = consoleLogs.some(log => log.includes('MPQ parsed successfully') || log.includes('Found VALID MPQ header'));
    const fileExtracted = consoleLogs.some(log => log.includes('Got w3i data') || log.includes('Got w3e data'));
    const mpqErrors = consoleLogs.filter(log => log.includes('Failed to parse MPQ') || log.includes('NOT FOUND'));

    console.log(`MPQ Magic Found: ${mpqMagicFound ? '✅' : '❌'}`);
    console.log(`MPQ Parsed Successfully: ${mpqParsedSuccess ? '✅' : '❌'}`);
    console.log(`Files Extracted: ${fileExtracted ? '✅' : '❌'}`);
    console.log(`MPQ Errors: ${mpqErrors.length > 0 ? '❌ ' + mpqErrors.length : '✅ None'}`);

    if (mpqErrors.length > 0) {
      console.log('\nFirst 3 errors:');
      mpqErrors.slice(0, 3).forEach(err => console.log(`  - ${err}`));
    }

    console.log('================================\n');

    if (mpqMagicFound && mpqParsedSuccess && fileExtracted) {
      console.log('✅ 🎉 MPQ PARSER FIX VALIDATED!');
      console.log('Maps are now loading successfully!');
    } else {
      console.log('❌ MPQ Parser still has issues');
    }

    console.log('\nBrowser will stay open for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

validateMPQFix().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
