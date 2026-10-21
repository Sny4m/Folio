import { mkdir, copyFile } from "node:fs/promises";
await mkdir("public/qpdf", { recursive: true });
await Promise.all(
  [
    ["node_modules/qpdf-run/src/worker.js", "public/qpdf/worker.js"],
    ["node_modules/qpdf-run/vendor/qpdf/lib/qpdf.js", "public/qpdf/qpdf.js"],
    [
      "node_modules/qpdf-run/vendor/qpdf/lib/qpdf.wasm",
      "public/qpdf/qpdf.wasm",
    ],
    ["LICENSE", "public/LICENSE"],
  ].map(([from, to]) => copyFile(from, to)),
);
