import { chromium } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { mkdir, writeFile } from "node:fs/promises";
const out = "test-results";
await mkdir(out, { recursive: true });
const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
for (let i = 1; i <= 2; i++)
  doc
    .addPage([400, 500])
    .drawText(`Folio sample page ${i}`, { x: 40, y: 400, font, size: 22 });
await writeFile(`${out}/sample.pdf`, await doc.save());
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(15000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto("http://127.0.0.1:4173/");
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: `${out}/home-desktop.png`, fullPage: true });
const routes = [
  "merge",
  "split",
  "compress",
  "protect",
  "unlock",
  "rotate-pdf",
  "rearrange-pdf",
  "page-numbers",
  "watermark",
  "metadata",
  "signature",
  "grayscale",
  "pdf-to-image",
  "image-to-pdf",
  "extract-images",
  "pdf-to-text",
  "repair",
];
for (const route of routes) {
  await page.goto(`http://127.0.0.1:4173/?check=${route}#/${route}`);
  await page.locator(".tool-heading h1").waitFor();
  if (route !== "image-to-pdf") {
    await page
      .locator("input[type=file]")
      .first()
      .setInputFiles(`${out}/sample.pdf`);
    await page.waitForTimeout(500);
    if (await page.getByText("Failed to open PDF", { exact: true }).count())
      throw new Error(`Upload failed: ${route}`);
  }
  console.log(`Route and upload: ${route}`);
}
await page.goto("http://127.0.0.1:4173/#/rotate-pdf");
await page.locator("input[type=file]").setInputFiles(`${out}/sample.pdf`);
await page.getByRole("button", { name: "All", exact: true }).click();
console.log("Rotate buttons:", await page.locator(".tool-actions").innerText());
await page.locator(".tool-actions button").click();
await page.getByRole("button", { name: "Download", exact: true }).waitFor();
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "Download", exact: true }).click();
const download = await downloadPromise;
await download.saveAs(`${out}/rotated.pdf`);
const { readFile } = await import("node:fs/promises");
const rotated = await PDFDocument.load(await readFile(`${out}/rotated.pdf`));
if (rotated.getPages().some((p) => p.getRotation().angle !== 90))
  throw new Error("Rotation not applied");
console.log("Rotation output verified: 2 pages, 90 degrees");
await page.screenshot({ path: `${out}/tool-success.png`, fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://127.0.0.1:4173/");
await page.screenshot({ path: `${out}/home-mobile.png`, fullPage: true });
await page.getByRole("button", { name: "Open navigation" }).click();
await page
  .getByRole("navigation")
  .getByRole("link", { name: "Image Tools" })
  .click();
if ((await page.locator(".tool-card").count()) !== 3)
  throw new Error("Image filter failed");
await page.goto("http://127.0.0.1:4173/#/merge");
await page.screenshot({ path: `${out}/tool-mobile.png`, fullPage: true });
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > innerWidth,
);
if (overflow) throw new Error("Mobile horizontal overflow");
await browser.close();
if (errors.length) throw new Error(errors.join("\n"));
console.log("Browser checks passed; no uncaught browser errors.");
