import { chromium } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import JSZip from "jszip";
import { mkdir, writeFile, readFile } from "node:fs/promises";

await mkdir("test-results", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
page.setDefaultTimeout(20000);
const errors = [];
const requests = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => {
  if (/^https?:/.test(r.url()) && !r.url().startsWith("http://127.0.0.1:4173/"))
    requests.push(r.url());
});
await page.goto("http://127.0.0.1:4173/");
const png = await page.evaluate(() => {
  const c = document.createElement("canvas");
  c.width = 400;
  c.height = 150;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 400, 150);
  ctx.fillStyle = "black";
  ctx.font = "36px sans-serif";
  ctx.fillText("Folio local test", 20, 80);
  return c.toDataURL("image/png").split(",")[1];
});
await writeFile("test-results/image.png", Buffer.from(png, "base64"));
const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const img = await pdf.embedPng(Buffer.from(png, "base64"));
for (let i = 0; i < 2; i++) {
  const p = pdf.addPage([400, 500]);
  p.drawText(`Folio sample page ${i + 1}`, { x: 30, y: 420, font, size: 20 });
  p.drawImage(img, { x: 30, y: 100, width: 300, height: 110 });
}
await writeFile("test-results/workflow.pdf", await pdf.save());
const failures = [];
const routes = [
  "merge",
  "split",
  "compress",
  "protect",
  "unlock",
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
  try {
    await page.goto(`http://127.0.0.1:4173/?check=${route}#/${route}`);
    const file =
      route === "image-to-pdf"
        ? "test-results/image.png"
        : route === "unlock"
          ? "test-results/protect.pdf"
          : "test-results/workflow.pdf";
    await page
      .locator("input[type=file]")
      .first()
      .setInputFiles(route === "merge" ? [file, file] : file);
    await page.locator(".tool-actions button").first().waitFor();
    if (route === "protect") {
      await page.locator("input[type=password]").nth(0).fill("folio-test");
      await page.locator("input[type=password]").nth(1).fill("folio-test");
    }
    if (route === "unlock")
      await page.locator("input[type=password]").fill("folio-test");
    if (route === "signature") {
      await page
        .locator("input[type=file]")
        .nth(1)
        .setInputFiles("test-results/image.png");
      await page.getByAltText("Signature preview").waitFor();
      await page
        .getByAltText("Page 1 preview")
        .click({ position: { x: 100, y: 150 } });
    }
    await page.locator(".tool-actions button").first().click();
    const button = page.getByRole("button", { name: "Download", exact: true });
    await button.waitFor({ timeout: 60000 });
    const pending = page.waitForEvent("download");
    await button.click();
    const download = await pending;
    const name = download.suggestedFilename();
    const path = `test-results/${route}.${name.split(".").pop()}`;
    await download.saveAs(path);
    const bytes = await readFile(path);
    if (bytes.length === 0) throw new Error("Empty output");
    if (name.endsWith(".pdf") && route !== "protect") {
      const result = await PDFDocument.load(bytes);
      const expected = route === "merge" ? 4 : route === "image-to-pdf" ? 1 : 2;
      if (result.getPageCount() !== expected)
        throw new Error(
          `Expected ${expected} pages, got ${result.getPageCount()}`,
        );
    }
    if (name.endsWith(".zip")) {
      const zip = await JSZip.loadAsync(bytes);
      if (!Object.keys(zip.files).length) throw new Error("Empty ZIP");
    }
    if (
      name.endsWith(".txt") &&
      !bytes.toString().includes("Folio sample page")
    )
      throw new Error("Missing extracted text");
    console.log(`PASS ${route}: ${name}, ${bytes.length} bytes`);
  } catch (error) {
    failures.push(`${route}: ${error.message}`);
    console.log(`FAIL ${route}: ${error.message}`);
    await page.screenshot({ path: `test-results/failure-${route}.png` });
  }
}
await browser.close();
if (requests.length)
  failures.push(`Unexpected external requests: ${requests.join(", ")}`);
if (errors.length) failures.push(`Browser errors: ${errors.join(", ")}`);
if (failures.length) throw new Error(failures.join("\n"));
console.log("All workflow exports passed with no external requests.");
