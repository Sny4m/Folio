<div align="center">

<img src="public/icons/icon-512-maskable.png" alt="Folio icon" width="112" height="112" />

# Folio

**Your files. Your device.**

A browser-based PDF toolkit that keeps your documents on your device.

**[Try it](https://sny4m.github.io/Folio/)** · **[Source code](https://github.com/Sny4m/Folio)**

Made by Sanyam.

</div>

## About

Folio is a collection of PDF tools in one place, without the usual upload-your-file-first step.

I started with [PaperKnife](https://github.com/potatameister/PaperKnife), then redesigned the interface, added tools, and kept building on it. I wanted something that felt good to use without making simple document tasks complicated.

It's still a work in progress. There are more ideas I'd like to add over time, but for now the focus is on making the PDF tools useful and reliable.

## What you can do

- **Organize:** merge and split PDFs, extract pages, rotate and reorder them.
- **Make changes:** add watermarks and page numbers, edit metadata, compress, and convert pages to images.
- **Work with secured files:** protect, unlock, and attempt to repair PDFs.
- **Get content out:** extract text, run English OCR on scanned pages, and extract embedded images.
- **Convert:** turn JPG, PNG, and WebP images into PDFs.
- **Sign:** add visual signatures, digitally sign PDFs, and inspect existing digital signatures.

Repair is best-effort, and some compression methods can change how a document looks.

## Privacy

PDF processing runs locally in your browser using pdf-lib, PDF.js, qpdf WebAssembly, and Tesseract.js. Folio doesn't have a file-upload endpoint or analytics.

Some recent results, workspaces, saved signatures, and digital identities can be kept in your browser storage. You can clear them from Settings. Files you've already downloaded stay on your device.

Folio is also installable as a PWA, with caching for offline use after the necessary assets have loaded.

## Running locally

Requires Node.js 22 or newer.

```bash
git clone https://github.com/Sny4m/Folio.git
cd Folio
npm ci
npm run dev
```

The setup scripts prepare qpdf and OCR assets. The first run may download English OCR language data.

```bash
npm run lint
npm run build
npm run preview
```

Folio is built with React, TypeScript, and Vite. Browser tests are available through `npm run test:browser` and `npm run test:workflows` after installing Playwright Chromium and starting the preview server on port 4173.

## Credits

Folio is based on [PaperKnife](https://github.com/potatameister/PaperKnife) by potatameister (© 2026). Thanks to the original project for the foundation.

The interface redesign, additional tools, and continued development of Folio are by Sanyam.

Licensed under **[AGPL-3.0-or-later](LICENSE)**, with upstream copyright notices retained. Modified versions distributed or hosted publicly must provide corresponding source as required by the license.

Fredoka font license: `public/fonts/Fredoka-LICENSE.txt`. PDF.js CMap notices: `public/cmaps/LICENSE`.
