import fs from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';

async function generateIcons() {
  const svgPath = path.resolve('public/icons/logo.svg');
  const svgContent = fs.readFileSync(svgPath, 'utf8');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const sizes = [192, 512];

  for (const size of sizes) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body {
            width: ${size}px;
            height: ${size}px;
            overflow: hidden;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          svg {
            width: ${size}px;
            height: ${size}px;
          }
        </style>
      </head>
      <body>
        ${svgContent}
      </body>
      </html>
    `;

    await page.setViewportSize({ width: size, height: size });
    await page.setContent(html);

    const outPath = path.resolve(`public/icons/icon-${size}.png`);
    await page.screenshot({ path: outPath, omitBackground: false });
    console.log(`Generated ${outPath}`);

    // Also generate maskable icon with slight padding
    const maskableHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body {
            width: ${size}px;
            height: ${size}px;
            overflow: hidden;
            background: #000000;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .icon-container {
            width: ${Math.round(size * 0.8)}px;
            height: ${Math.round(size * 0.8)}px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          svg {
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <div class="icon-container">
          ${svgContent}
        </div>
      </body>
      </html>
    `;

    await page.setContent(maskableHtml);
    const maskableOutPath = path.resolve(`public/icons/icon-${size}-maskable.png`);
    await page.screenshot({ path: maskableOutPath, omitBackground: false });
    console.log(`Generated ${maskableOutPath}`);
  }

  // Also create apple-touch-icon (180x180)
  await page.setViewportSize({ width: 180, height: 180 });
  const appleHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
          width: 180px;
          height: 180px;
          overflow: hidden;
          background: #000000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        svg {
          width: 180px;
          height: 180px;
        }
      </style>
    </head>
    <body>
      ${svgContent}
    </body>
    </html>
  `;
  await page.setContent(appleHtml);
  await page.screenshot({ path: path.resolve('public/icons/apple-touch-icon.png') });
  console.log('Generated apple-touch-icon.png');

  await browser.close();
  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
