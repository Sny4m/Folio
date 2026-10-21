<div align="center">

<img src="public/icons/icon-512-maskable.png" alt="Folio icon" width="112" height="112" />

# Folio

**Your files. Your device.**

A little toolbox for working with PDFs, built to keep your files where they belong: on your device.

**[Try Folio](https://sny4m.github.io/Folio/)** · **[View source](https://github.com/Sny4m/Folio)**

Made by Sanyam.

</div>

---

## What is Folio?

I wanted a simple place to do everyday PDF tasks without sending personal documents to a server. Folio runs in the browser and handles processing locally. No account, no upload queue, no analytics.

The interface is deliberately a bit different: black and white, rounded type, and a playful feel. Underneath that, the aim is to make common document tasks straightforward.

You can install Folio as a progressive web app, too. It caches assets for offline use, although some features may still need an initial download before they'll work without a connection.

## What can it do?

**Organize PDFs:** merge files, split and extract pages, rotate, reorder, add page numbers, and edit metadata.

**Edit and prepare:** compress, add watermarks, turn pages grayscale, protect or unlock files, and attempt to repair damaged PDFs. Repair is best-effort, and raster-based compression may change how a document looks.

**Sign and verify:** add visual signatures, create cryptographically signed PDFs using digital identities and certificates, and inspect digital signatures for signer and integrity information.

**Extract and convert:** copy text from PDFs (with English OCR for scanned pages), export PDF pages as images, extract embedded images, and turn JPG, PNG, or WebP files into PDFs.

Folio only shows tools that have been implemented. General-purpose image resizing, cropping, and compression aren't part of the toolkit yet.

## Your files stay local

PDF and image processing happens in your browser using libraries such as **pdf-lib**, **PDF.js**, **qpdf (WebAssembly)**, and **Tesseract.js**. Folio doesn't provide a file-upload endpoint or use analytics.

A few things are worth knowing:

- Recent results (up to 25 MB each), tool workspaces, digital identities, and saved signatures can be stored in your browser so you can return to them.
- You can clear Folio's saved local data from Settings. That won't delete files you've already downloaded.
- The app and its processing assets need to be loaded at least once. Offline caching helps after that, but complete offline availability isn't guaranteed.

## Run it yourself

You'll need **Node.js 22+**.

```bash
git clone https://github.com/Sny4m/Folio.git
cd Folio
npm ci
npm run dev
```

The first run prepares local qpdf and OCR assets, including downloading English OCR language data. Later runs reuse the prepared files. Fonts and runtime dependencies are served locally rather than from a runtime CDN.

To check or build the project:

```bash
npm run lint
npm run build
npm run preview
```

For browser tests, build and start the preview server on port 4173, install Chromium once with `npx playwright install chromium`, then run `npm run test:browser` and `npm run test:workflows`. Test fixtures and screenshots go into the ignored `test-results/` directory.

## Built with

Folio uses **React**, **TypeScript**, and **Vite**, with hash-based routing so it can run on static hosts like GitHub Pages. PDF and OCR work happens through local browser APIs, workers, and WebAssembly.

If you're looking around the codebase, `src/components/` contains the main interface and shared tool layouts, `src/utils/` contains document processing utilities, and `scripts/vendor-local.mjs` plus `scripts/vendor-tesseract.mjs` prepare the local processing assets.

## Credits and license

Folio started as a fork of [PaperKnife](https://github.com/potatameister/PaperKnife) by **potatameister** (© 2026). The Folio branding and interface redesign are by **Sanyam**.

This project remains licensed under **[AGPL-3.0-or-later](LICENSE)**. Upstream copyright notices are preserved. If you distribute or host a modified version, make the complete corresponding source available in accordance with the license.

The bundled Fredoka font uses the SIL Open Font License (see `public/fonts/Fredoka-LICENSE.txt`), and PDF.js CMap notices are in `public/cmaps/LICENSE`.

---

<div align="center">

**Folio** · Your files. Your device.

Made by **Sanyam**.

</div>
