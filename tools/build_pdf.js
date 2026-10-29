// Print the deck to a static PDF, one 1920×1080 page per slide, in the
// original deck's order (the two popouts get their own pages after About
// Stream). Text stays selectable and the contact links stay clickable.
//
//   python3 -m http.server 8766          (from the repo root)
//   node tools/build_pdf.js [out.pdf]    (needs Playwright and pdfunite)
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const base = process.env.DECK_URL || 'http://localhost:8766/';
const out = path.resolve(process.argv[2] || 'VistaTrans-Stream.pdf');
const pages = [
  'cover', 'your-team', 'about-stream', 'investment-management', 'development',
  'understanding-your-business', 'capital-structure', 'thank-you',
];

// Settled, chrome-free view: no controls or progress line, and a popout
// shown full size instead of floating over the dimmed slide.
const printCss = `
  .deck-nav, .progress, .wipe, .popout-close, .popout-switch, .popout::before, .popout-backdrop { display: none !important; }
  .popout-layer.open .popout { transform: none !important; box-shadow: none !important; }
  .photo-wrap { transform: none !important; }
`;

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-pdf-'));
  const browser = await chromium.launch();
  // Reduced motion puts every element straight into its final state.
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
  const parts = [];
  for (const [i, id] of pages.entries()) {
    await page.goto(base + '#' + id);
    await page.reload();
    await page.addStyleTag({ content: printCss });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    const file = path.join(tmp, `${String(i).padStart(2, '0')}.pdf`);
    await page.pdf({ path: file, width: '1920px', height: '1080px', printBackground: true, pageRanges: '1' });
    parts.push(file);
  }
  await browser.close();
  execFileSync('pdfunite', [...parts, out]);
  console.log(`${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB, ${parts.length} pages)`);
})();
