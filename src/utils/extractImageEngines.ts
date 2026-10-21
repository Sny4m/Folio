import { OPS, type PDFDocumentProxy } from "pdfjs-dist";

interface DecodedImage {
  width: number;
  height: number;
  bitmap?: ImageBitmap;
  data?: Uint8Array | Uint8ClampedArray;
}

/** Extract decoded image objects at their original dimensions, without uploading. */
export async function extractEmbeddedImages(
  pdf: PDFDocumentProxy,
  onProgress: (percent: number) => void,
) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  let count = 0;
  for (let index = 1; index <= pdf.numPages; index++) {
    const page = await pdf.getPage(index);
    const viewport = page.getViewport({ scale: 0.1 });
    const scratch = document.createElement("canvas");
    scratch.width = Math.ceil(viewport.width);
    scratch.height = Math.ceil(viewport.height);
    // Rendering resolves image dependencies, including worker-created ImageBitmaps.
    await page.render({ canvas: scratch, viewport }).promise;
    const operators = await page.getOperatorList();
    const seen = new Set<string>();
    for (let op = 0; op < operators.fnArray.length; op++) {
      const kind = operators.fnArray[op];
      let decoded: DecodedImage | undefined;
      if (kind === OPS.paintImageXObject) {
        const name = operators.argsArray[op][0] as string;
        if (seen.has(name)) continue;
        seen.add(name);
        decoded = (name.startsWith("g_") ? page.commonObjs : page.objs).get(
          name,
        );
      } else if (kind === OPS.paintInlineImageXObject) {
        decoded = operators.argsArray[op][0];
      }
      if (!decoded || !decoded.width || !decoded.height) continue;
      const canvas = document.createElement("canvas");
      canvas.width = decoded.width;
      canvas.height = decoded.height;
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error("Image export is unavailable in this browser.");
      if (decoded.bitmap) {
        context.drawImage(decoded.bitmap, 0, 0);
      } else if (decoded.data) {
        const pixels = context.createImageData(decoded.width, decoded.height);
        const data = decoded.data;
        if (data.length === pixels.data.length) pixels.data.set(data);
        else if (data.length === decoded.width * decoded.height * 3) {
          for (let n = 0, target = 0; n < data.length; n += 3, target += 4) {
            pixels.data[target] = data[n];
            pixels.data[target + 1] = data[n + 1];
            pixels.data[target + 2] = data[n + 2];
            pixels.data[target + 3] = 255;
          }
        } else {
          // Packed one-bit grayscale images use row-aligned bytes.
          const stride = Math.ceil(decoded.width / 8);
          if (data.length !== stride * decoded.height) continue;
          for (let y = 0; y < decoded.height; y++)
            for (let x = 0; x < decoded.width; x++) {
              const value =
                data[y * stride + (x >> 3)] & (128 >> (x & 7)) ? 255 : 0;
              const target = (y * decoded.width + x) * 4;
              pixels.data.set([value, value, value, 255], target);
            }
        }
        context.putImageData(pixels, 0, 0);
      } else continue;
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (result) =>
            result
              ? resolve(result)
              : reject(new Error("Could not encode an image.")),
          "image/png",
        ),
      );
      zip.file(
        `image-${String(++count).padStart(3, "0")}.png`,
        await blob.arrayBuffer(),
      );
      canvas.width = canvas.height = 0;
    }
    scratch.width = scratch.height = 0;
    page.cleanup();
    onProgress(Math.round((index / pdf.numPages) * 100));
  }
  if (!count)
    throw new Error(
      "No supported embedded images found. Try PDF to Image to export entire pages.",
    );
  return { blob: await zip.generateAsync({ type: "blob" }), count };
}
