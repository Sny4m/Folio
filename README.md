<div align="center">

<img src="public/icons/icon-512-maskable.png" alt="Folio icon" width="112" height="112" />

# Folio

**Your files. Your device.**

A browser-based toolkit for PDFs and images, with more to come.

**[Try it](https://sny4m.github.io/Folio/)** · **[Source code](https://github.com/Sny4m/Folio)**

Made by Sanyam.

</div>

## About

Folio brings PDF and image tools together in one place, without the usual upload-your-file-first step.

I started with [PaperKnife](https://github.com/potatameister/PaperKnife), then redesigned the interface, added tools, and kept building on it. I wanted something that felt good to use without making simple document tasks complicated.

It's still a work in progress. There are more ideas I'd like to add over time, but for now the focus is on making the PDF and image tools useful and reliable.

## What you can do

### PDF tools

- **Organize:** merge and split PDFs, extract pages, rotate and reorder them.
- **Make changes:** add watermarks and page numbers, edit metadata, compress, and convert pages to images.
- **Work with secured files:** protect, unlock, and attempt to repair PDFs.
- **Get content out:** extract text, run English OCR on scanned pages, and extract embedded images.
- **Convert:** turn JPG, PNG, and WebP images into PDFs.
- **Sign:** add visual signatures, digitally sign PDFs, and inspect existing digital signatures.

### Image tools

Folio also includes image utilities, alongside converting images to PDF and exporting images from PDF documents. I'm continuing to build out this side of the toolkit.

Repair is best-effort, and some compression methods can change how a document looks.

## Why I built this

I kept running into the same problem: I'd need to make one small change to a document, then end up searching for a website that wanted me to upload it first. Sometimes I needed to merge a PDF, sometimes pull out a page, sometimes turn an image into a PDF. None of those jobs should be a hassle.

Folio is my attempt to put those everyday tools somewhere I actually want to use. I started from PaperKnife, but I've since added functionality and reworked the interface to make it feel like my own project. I also wanted to learn by building something useful, not just another demo.

The goal isn't to cram in every converter on the internet. It's to make a focused set of tools that work well, respect your files, and feel consistent.

## Roadmap

This is the direction I'm working toward, **not a release schedule**. Checked items are already present in the app; unchecked items are goals, not shipped features.

### 1. Get the foundations right

- [x] Bring the core PDF tools into one browser-based interface
- [x] Add local PDF processing and OCR
- [x] Make Folio installable as a PWA
- [ ] Improve mobile workflows, keyboard accessibility, and clearer error messages
- [ ] Add more automated tests for real-world and tricky files

### 2. Make PDF workflows better

- [x] Merge, split, reorder, rotate, and compress PDFs
- [x] Add signatures, PDF protection, and signature verification
- [ ] Make it easier to apply several operations to the same file without starting over
- [ ] Improve handling and feedback for large, encrypted, or damaged documents

### 3. Build out image tools

- [x] Convert JPG, PNG, and WebP images into PDFs
- [x] Export PDF pages and embedded images
- [ ] Add dedicated image conversion between common formats
- [ ] Add image resizing, cropping, and compression with clear quality controls
- [ ] Support batch image processing without uploading files

### 4. Expand carefully

- [ ] Establish a consistent tool interface and shared processing patterns before adding new categories
- [ ] Explore a small set of genuinely useful media or developer utilities
- [ ] Keep privacy, performance, and offline behavior visible as the toolkit grows

I'll update these checkboxes as features actually ship. The priority is making existing tools dependable before widening the scope.

## Privacy

Document processing runs locally in your browser using pdf-lib, PDF.js, qpdf WebAssembly, and Tesseract.js. Folio doesn't have a file-upload endpoint or analytics.

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
