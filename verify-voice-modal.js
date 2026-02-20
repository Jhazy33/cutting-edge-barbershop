/**
 * Verification Script - Voice Modal Button URL Fix
 *
 * This script verifies that the Voice button in the modal correctly navigates
 * to https://voice.cihconsultingllc.com instead of voice-ce.cihconsultingllc.com
 */

const { chromium } = require('playwright');

async function verifyVoiceModalButton() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track all new pages/tabs
  const newPages = [];
  context.on('page', p => newPages.push(p));

  try {
    console.log('\n=== VERIFICATION: Voice Modal Button URL Fix ===\n');

    console.log('Step 1: Navigating to production site...');
    await page.goto('https://cuttingedge.cihconsultingllc.com', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    console.log('✓ Loaded https://cuttingedge.cihconsultingllc.com');

    console.log('\nStep 2: Finding and clicking floating concierge button...');
    await page.waitForTimeout(2000);

    // Find and click the main floating button to open modal
    const selectors = [
      'button:has-text("Need help")',
      'button[aria-label*="concierge"]',
      'button:has([data-lucide="message-circle"])'
    ];

    let clicked = false;
    for (const selector of selectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          console.log(`✓ Found button with selector: ${selector}`);
          await button.click();
          clicked = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!clicked) {
      console.log('❌ Could not find or click floating button');
      return;
    }

    console.log('\nStep 3: Waiting for modal to open...');
    await page.waitForTimeout(2000);

    console.log('\nStep 4: Looking for Voice button in modal...');
    // Look for Voice button in modal
    const voiceButtonSelectors = [
      'button:has-text("Voice")',
      'button:has([data-lucide="mic"])',
      'text=Voice'
    ];

    let voiceButton = null;
    for (const selector of voiceButtonSelectors) {
      try {
        voiceButton = await page.$(selector);
        if (voiceButton) {
          console.log(`✓ Found Voice button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (voiceButton) {
      // Get the button HTML
      const buttonHTML = await voiceButton.evaluate(el => el.outerHTML);
      console.log('\nVoice Button HTML (first 300 chars):');
      console.log(buttonHTML.substring(0, 300));

      // Check if it has an onClick handler
      const hasClick = await voiceButton.evaluate(el => {
        return el.onclick !== null || el.getAttribute('onClick') !== null;
      });
      console.log(`\nHas onClick handler: ${hasClick}`);

      console.log('\nStep 5: Clicking Voice button...');
      await voiceButton.click();
      await page.waitForTimeout(3000);

      // Check if a new page/tab opened
      if (newPages.length > 0) {
        const voicePage = newPages[0];
        const voiceUrl = voicePage.url();
        console.log(`\n✓ Voice button opened new tab/page`);
        console.log(`📍 URL: ${voiceUrl}`);

        if (voiceUrl.includes('voice.cihconsultingllc.com')) {
          console.log('\n✅ SUCCESS: Voice button navigates to CORRECT URL!');
          console.log('   Expected: https://voice.cihconsultingllc.com');
          console.log('   Actual:   ', voiceUrl);
        } else if (voiceUrl.includes('voice-ce.cihconsultingllc.com')) {
          console.log('\n❌ FAILURE: Voice button still navigates to OLD URL!');
          console.log('   Expected: https://voice.cihconsultingllc.com');
          console.log('   Actual:   ', voiceUrl);
        } else {
          console.log('\n⚠️  WARNING: Voice button navigates to unexpected URL');
          console.log('   Expected: https://voice.cihconsultingllc.com');
          console.log('   Actual:   ', voiceUrl);
        }
      } else {
        console.log('\n⚠️  No new page opened. Checking if page navigated...');
        const currentUrl = page.url();
        console.log(`📍 Current URL: ${currentUrl}`);

        if (currentUrl.includes('voice.cihconsultingllc.com')) {
          console.log('\n✅ SUCCESS: Page navigated to CORRECT URL!');
        } else if (currentUrl.includes('voice-ce.cihconsultingllc.com')) {
          console.log('\n❌ FAILURE: Page navigated to OLD URL!');
        }
      }
    } else {
      console.log('❌ Could not find Voice button in modal');

      // Debug: Show all buttons in modal
      console.log('\nLooking for ALL buttons in page...');
      const allButtons = await page.$$eval('button', buttons =>
        buttons
          .filter(b => b.textContent && b.textContent.trim())
          .map(b => ({
            text: b.textContent.trim(),
            visible: b.offsetParent !== null
          }))
          .filter(b => b.visible)
      );

      console.log(`\nFound ${allButtons.length} visible buttons:`);
      allButtons.forEach((btn, i) => {
        if (i < 10) { // Show first 10
          console.log(`  ${i + 1}. "${btn.text}"`);
        }
      });
    }

    console.log('\n=== VERIFICATION COMPLETE ===\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

verifyVoiceModalButton().catch(console.error);
