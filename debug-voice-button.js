/**
 * Production Debugging Script - Voice Button Issue
 *
 * This script automates browser testing to capture the exact behavior
 * of the Voice Mode button on the production site.
 */

const { chromium } = require('playwright');

async function debugVoiceButton() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Set up console logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  try {
    console.log('\n=== STEP 1: Navigating to production site ===');
    await page.goto('https://cuttingedge.cihconsultingllc.com', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Screenshot of main page
    await page.screenshot({
      path: '/tmp/voice-debug-01-main-page.png',
      fullPage: true
    });
    console.log('✓ Screenshot saved: /tmp/voice-debug-01-main-page.png');

    console.log('\n=== STEP 2: Finding and clicking floating button ===');

    // Wait for floating button
    const floatingButton = await page.waitForSelector(
      'button:has-text("Need help? Ask our concierge"), button[aria-label*="concierge"], button:has([data-lucide="message-circle"])',
      { timeout: 10000 }
    );

    await floatingButton.click();
    console.log('✓ Clicked floating button');

    // Screenshot of modal
    await page.screenshot({
      path: '/tmp/voice-debug-02-modal.png'
    });
    console.log('✓ Screenshot saved: /tmp/voice-debug-02-modal.png');

    console.log('\n=== STEP 3: Inspecting modal content ===');

    // Get all buttons in modal
    const buttons = await page.$$eval('button', buttons =>
      buttons.map(btn => ({
        text: btn.textContent?.trim(),
        html: btn.outerHTML,
        href: btn.getAttribute('href'),
        onclick: btn.getAttribute('onclick'),
        dataset: JSON.stringify({ ...btn.dataset })
      }))
    );

    console.log('\nAll buttons found:');
    buttons.forEach((btn, i) => {
      if (btn.text?.toLowerCase().includes('voice') ||
          btn.text?.toLowerCase().includes('chat') ||
          btn.text?.toLowerCase().includes('concierge')) {
        console.log(`\nButton ${i}:`);
        console.log(`  Text: ${btn.text}`);
        console.log(`  HTML: ${btn.html}`);
        console.log(`  Href: ${btn.href}`);
        console.log(`  Onclick: ${btn.onclick}`);
        console.log(`  Dataset: ${btn.dataset}`);
      }
    });

    console.log('\n=== STEP 4: Finding and inspecting Voice button ===');

    // Look specifically for Voice button
    const voiceButtonSelectors = [
      'a:has-text("Voice")',
      'button:has-text("Voice")',
      '[href*="voice"]',
      '[data-mode="voice"]'
    ];

    let voiceButton = null;
    let voiceButtonHTML = null;

    for (const selector of voiceButtonSelectors) {
      try {
        voiceButton = await page.$(selector);
        if (voiceButton) {
          console.log(`✓ Found Voice button with selector: ${selector}`);
          voiceButtonHTML = await voiceButton.evaluate(el => el.outerHTML);
          console.log('\nVoice Button HTML:');
          console.log(voiceButtonHTML);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!voiceButton) {
      console.error('❌ Could not find Voice button!');
    }

    // Screenshot before clicking
    await page.screenshot({
      path: '/tmp/voice-debug-03-before-voice-click.png'
    });
    console.log('✓ Screenshot saved: /tmp/voice-debug-03-before-voice-click.png');

    console.log('\n=== STEP 5: Clicking Voice button and tracking navigation ===');

    // Set up navigation tracking
    let navigatedUrl = null;
    page.on('response', response => {
      const url = response.url();
      if (url.includes('voice')) {
        console.log(`🔍 Response URL detected: ${url}`);
        navigatedUrl = url;
      }
    });

    // Click voice button
    if (voiceButton) {
      // Get href before clicking
      const href = await voiceButton.evaluate(el => el.getAttribute('href'));
      console.log(`\nVoice button href attribute: ${href}`);

      await voiceButton.click();

      // Wait for navigation or timeout
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch (e) {
        console.log('Note: Navigation may have opened in new tab');
      }

      // Screenshot after click
      await page.screenshot({
        path: '/tmp/voice-debug-04-after-voice-click.png'
      });
      console.log('✓ Screenshot saved: /tmp/voice-debug-04-after-voice-click.png');

      // Get current URL
      const currentUrl = page.url();
      console.log(`\n📍 Current page URL: ${currentUrl}`);

      // Check for new page/tab
      const pages = context.pages();
      console.log(`\n📑 Total browser pages: ${pages.length}`);
      pages.forEach((p, i) => {
        console.log(`  Page ${i}: ${p.url()}`);
      });
    }

    console.log('\n=== STEP 6: Inspecting production JavaScript ===');

    // Check if there's a build folder or compiled JS
    const scriptTags = await page.$$eval('script', scripts =>
      scripts.map(s => s.src || 'inline')
    );

    console.log('\nScripts loaded:');
    scriptTags.forEach(src => {
      if (src.includes('voice') || src.includes('concierge')) {
        console.log(`  ${src}`);
      }
    });

    console.log('\n=== DEBUGGING COMPLETE ===');
    console.log('\n📸 Screenshots saved to /tmp/:');
    console.log('  - voice-debug-01-main-page.png');
    console.log('  - voice-debug-02-modal.png');
    console.log('  - voice-debug-03-before-voice-click.png');
    console.log('  - voice-debug-04-after-voice-click.png');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

debugVoiceButton().catch(console.error);
