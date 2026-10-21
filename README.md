# Folio

**Your files. Your device. Made by Sanyam.**

A private, browser-based PDF and image toolkit with a playful monochrome interface. Files are processed on the user's device using pdf-lib, PDF.js, qpdf WebAssembly, and Tesseract.js. There are no file-upload endpoints or analytics.

## Development

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

`predev` and `prebuild` prepare local qpdf and OCR assets. The first run downloads English OCR language data; subsequent runs reuse it. Fonts are bundled and served locally. No runtime CDN is required.

```sh
npm run lint
npm run build
npm run preview
```

For browser regression checks, build the app and run the preview server on port 4173, then run `npm run test:browser` and `npm run test:workflows`. Install the test browser once with `npx playwright install chromium`. Tests generate small document fixtures and screenshots in ignored `test-results/`.

## Tools

Merge, split/extract pages, compress, rotate, reorder, number pages, watermark, edit metadata, sign, protect, unlock, repair, grayscale, extract text (including English OCR), convert PDF pages to images, extract embedded images, and convert JPG/PNG/WebP images to PDF.

Only implemented tools are listed. General-purpose image resizing, cropping, and compression are not advertised as available. PDF repair is best-effort, and raster compression can change document fidelity.

## Privacy and storage

Processing runs locally. Recent results (up to 25 MB per result), tool workspaces, and saved signatures may persist in browser storage. Settings provides a clear-local-data action. Downloaded files are not removed by that action. Site assets and processing engines require an initial network load; complete offline availability is not guaranteed.

Existing database names are retained for compatibility with saved upstream workspaces. The project is web-only.

## Architecture and design

- React + TypeScript + Vite; hash routing supports static hosts and repository subpaths.
- `src/components/Layout.tsx`: responsive navigation, footer, global file drop.
- `src/components/WebView.tsx`: homepage, searchable tool catalog, privacy and workflow sections.
- `src/components/tools/shared/ToolLayout.tsx`: shared tool shell, headers, local drop handling, and success/download UI.
- `src/index.css`: monochrome design tokens, bundled typography, responsive layouts, reduced-motion handling.
- `src/utils/`: existing local document engines and workers.
- `scripts/vendor-local.mjs` and `scripts/vendor-tesseract.mjs`: local runtime assets.

## License and attribution

Folio is derived from **PaperKnife**, copyright © 2026 potatameister. It remains licensed under **AGPL-3.0-or-later**; see [LICENSE](LICENSE). Original copyright notices are retained in source files. Folio branding and interface redesign are by Sanyam.

Upstream source: https://github.com/potatameister/PaperKnife

When distributing or hosting a modified version, provide its complete corresponding source as required by the AGPL. The About page includes upstream credits and the license. Keep the source of your deployed Folio version publicly available and link it from your deployment.

Fredoka is distributed under the SIL Open Font License. Its license is served at `fonts/Fredoka-LICENSE.txt`. PDF.js CMap attribution remains in `public/cmaps/LICENSE`.
