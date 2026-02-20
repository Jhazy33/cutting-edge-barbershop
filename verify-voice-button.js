/**
 * Verification Script - Voice Button URL Fix
 *
 * This script verifies that the Voice button now correctly navigates
 * to https://voice.cihconsultingllc.com instead of voice-ce.cihconsultingllc.com
 */

const { chromium } = require('playwright');

async function verifyVoiceButton() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track all new pages/tabs
  const newPages = [];
  context.on('page', p => newPages.push(p));

  try {
    console.log('\n=== VERIFICATION: Voice Button URL Fix ===\n');

    console.log('Step 1: Navigating to production site...');
    await page.goto('https://cuttingedge.cihconsultingllc.com', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    console.log('✓ Loaded https://cuttingedge.cihconsultingllc.com');

    console.log('\nStep 2: Looking for floating concierge button...');
    await page.waitForTimeout(2000); // Wait for button to appear

    // Try to find the floating button
    const floatingButton = await page.$('button:has-text("Need help")');
    if (!floatingButton) {
      console.log('⚠️ Floating button not found, trying alternative selectors...');

      // Try hovering to show quick action buttons
      const mainButton = await page.$('button[aria-label*="concierge"], button:has([data-lucide="message-circle"])');
      if (mainButton) {
        console.log('✓ Found main concierge button');
        await mainButton.hover();
        await page.waitForTimeout(500);
      }
    } else {
      console.log('✓ Found floating concierge button');
    }

    console.log('\nStep 3: Looking for Voice quick action button...');
    // Look for Voice button in hover menu
    const voiceButton = await page.$('button:has-text("🎤"), button:has-text("Voice")');

    if (voiceButton) {
      console.log('✓ Found Voice button in hover menu');

      // Get the onclick handler
      const onClickValue = await voiceButton.evaluate(el => {
        return {
          outerHTML: el.outerHTML,
          onclick: el.onclick ? el.onclick.toString() : null,
          hasAttribute: el.hasAttribute('onclick')
        };
      });

      console.log('\nVoice Button HTML:');
      console.log(onClickValue.outerHTML.substring(0, 200));

      console.log('\nStep 4: Clicking Voice button...');
      await voiceButton.click();
      await page.waitForTimeout(2000);

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
        console.log('\n⚠️  No new page opened. Checking current page URL...');
        const currentUrl = page.url();
        console.log(`📍 Current URL: ${currentUrl}`);
      }
    } else {
      console.log('❌ Could not find Voice button');
      console.log('\nLooking for ANY button with voice-related text...');
      const allButtons = await page.$$eval('button', buttons =>
        buttons
          .filter(b => b.textContent && (
            b.textContent.toLowerCase().includes('voice') ||
            b.textContent.includes('🎤')
          ))
          .map(b => ({
            text: b.textContent,
            html: b.outerHTML.substring(0, 150)
          }))
      );

      if (allButtons.length > 0) {
        console.log(`Found ${allButtons.length} voice-related buttons:`);
        allButtons.forEach((btn, i) => {
          console.log(`\nButton ${i + 1}:`);
          console.log(`  Text: ${btn.text}`);
          console.log(`  HTML: ${btn.html}`);
        });
      }
    }

    console.log('\n=== VERIFICATION COMPLETE ===\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await browser.close();
  }
}

verifyVoiceButton().catch(console.error);
