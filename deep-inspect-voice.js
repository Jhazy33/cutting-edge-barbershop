/**
 * Deep Inspection Script - Voice Button Structure
 *
 * This script deeply inspects the voice button structure and captures
 * the actual URL being used
 */

const { chromium } = require('playwright');

async function deepInspectVoiceButton() {
  const browser = await chromium.launch({ headless: false }); // Run visible
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track all console messages
  page.on('console', msg => {
    if (msg.text().includes('voice') || msg.text().includes('cihconsultingllc')) {
      console.log('BROWSER CONSOLE:', msg.text());
    }
  });

  // Track navigation
  page.on('framenavigated', frame => {
    console.log(`NAVIGATION: ${frame.url()}`);
  });

  try {
    console.log('\n=== DEEP INSPECTION: Voice Button ===\n');

    console.log('Step 1: Loading site...');
    await page.goto('https://cuttingedge.cihconsultingllc.com', {
      waitUntil: 'networkidle'
    });

    console.log('\nStep 2: Opening concierge modal...');
    await page.waitForTimeout(2000);

    // Click floating button
    const floatBtn = await page.$('button:has-text("Need help")');
    if (floatBtn) {
      await floatBtn.click();
      await page.waitForTimeout(2000);
    }

    console.log('\nStep 3: Inspecting ALL Voice-related elements...');
    const voiceElements = await page.$$eval('*', elements =>
      elements
        .filter(el => {
          const text = el.textContent || '';
          const lowerText = text.toLowerCase();
          return (
            (lowerText.includes('voice') || lowerText.includes('🎤')) &&
            text.trim().length < 50 // Short text like buttons
          );
        })
        .map(el => ({
          tagName: el.tagName,
          text: el.textContent.trim(),
          className: el.className,
          id: el.id,
          href: el.href || null,
          onclick: el.onclick ? 'has onclick' : null,
          outerHTML: el.outerHTML.substring(0, 200)
        }))
    );

    console.log(`\nFound ${voiceElements.length} voice-related elements:\n`);
    voiceElements.forEach((el, i) => {
      console.log(`Element ${i + 1}:`);
      console.log(`  Tag: ${el.tagName}`);
      console.log(`  Text: "${el.text}"`);
      console.log(`  Class: ${el.className}`);
      console.log(`  ID: ${el.id}`);
      console.log(`  Href: ${el.href}`);
      console.log(`  onClick: ${el.onclick}`);
      console.log(`  HTML: ${el.outerHTML}`);
      console.log('');
    });

    console.log('\nStep 4: Searching for ALL href attributes containing voice...');
    const voiceHrefs = await page.$$eval('[href]', elements =>
      elements
        .filter(el => el.href && el.href.includes('voice'))
        .map(el => ({
          tagName: el.tagName,
          href: el.href,
          text: el.textContent.trim().substring(0, 50),
          outerHTML: el.outerHTML.substring(0, 300)
        }))
    );

    console.log(`\nFound ${voiceHrefs.length} href elements with 'voice':\n`);
    voiceHrefs.forEach((el, i) => {
      console.log(`Href Element ${i + 1}:`);
      console.log(`  Tag: ${el.tagName}`);
      console.log(`  Href: ${el.href}`);
      console.log(`  Text: "${el.text}"`);
      console.log(`  HTML: ${el.outerHTML}`);
      console.log('');

      // Check if URL is correct
      if (el.href.includes('voice.cihconsultingllc.com')) {
        console.log('  ✅ CORRECT URL DETECTED!');
      } else if (el.href.includes('voice-ce.cihconsultingllc.com')) {
        console.log('  ❌ OLD URL DETECTED!');
      }
    });

    console.log('\nStep 5: Searching for window.open calls in script tags...');
    const scriptContents = await page.$$eval('script', scripts =>
      scripts
        .map(s => s.textContent)
        .filter(content => content && content.includes('voice'))
        .map(content => {
          // Find lines with voice
          const lines = content.split('\n');
          return lines.filter(line =>
            line.toLowerCase().includes('voice') &&
            (line.includes('http') || line.includes('window.open') || line.includes('location'))
          ).join('\n');
        })
    );

    if (scriptContents.length > 0) {
      console.log('\nFound voice references in scripts:');
      scriptContents.forEach((content, i) => {
        if (content.length > 0) {
          console.log(`\nScript ${i + 1}:\n${content.substring(0, 500)}`);
        }
      });
    }

    console.log('\n=== INSPECTION COMPLETE ===');
    console.log('\n🔍 Browser will stay open for 10 seconds for manual inspection...');
    console.log('   Please manually click the Voice button and observe the behavior.\n');

    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await browser.close();
  }
}

deepInspectVoiceButton().catch(console.error);
