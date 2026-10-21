/**
 * PaperKnife - The Swiss Army Knife for PDFs
 * Copyright (C) 2026 potatameister
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
export interface PdfMetaData { thumbnail: string; pageCount: number; isLocked: boolean }
const getCMapUrl = () => `${import.meta.env.BASE_URL}cmaps/`;
export const downloadFile = async (data: Uint8Array | string, fileName: string, mimeType: string) => {
  const blob = typeof data === 'string'
    ? /^(blob:|data:)/.test(data) ? await (await fetch(data)).blob() : new Blob([data], { type: mimeType })
    : new Blob([data as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = fileName; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
};
export const shareFile = async (data: Uint8Array | string, fileName: string, mimeType: string) => {
  const blob = typeof data === 'string' ? /^(blob:|data:)/.test(data) ? await (await fetch(data)).blob() : new Blob([data], { type: mimeType }) : new Blob([data as BlobPart], { type: mimeType });
  const file = new File([blob], fileName, { type: mimeType });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: fileName, text: 'Shared via Folio' });
    return true;
  }
  return downloadFile(data, fileName, mimeType);
};
// Optimized: Load the PDF Document once
export const loadPdfDocument = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: getCMapUrl(),
      cMapPacked: true,
    });
    return await loadingTask.promise;
  } catch (error: any) {
    if (error.name === 'PasswordException') {
      throw error;
    }
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: getCMapUrl(),
      cMapPacked: true,
      stopAtErrors: false,
    });
    return await loadingTask.promise;
  }
};

// Optimized: Render a specific page from an already loaded PDF Document
// maxDpr caps device-pixel-ratio scaling (viewer passes 1.5 for live pages:
// same perceived sharpness, ~44% less bitmap RAM vs dpr 2).
export const renderPageThumbnail = async (pdf: any, pageNum: number, scale = 1.0, maxDpr = 2): Promise<string> => {
  try {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: scale });

    // High-quality preview (1200px)
    const maxDimension = 1200;
    const thumbnailScale = Math.min(maxDimension / viewport.width, maxDimension / viewport.height);
    const dpr = window.devicePixelRatio || 1;
    const renderScale = scale * thumbnailScale * Math.min(dpr, maxDpr);
    const thumbViewport = page.getViewport({ scale: renderScale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Canvas context not available');
    
    canvas.height = thumbViewport.height;
    canvas.width = thumbViewport.width;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    await page.render({ canvasContext: context, viewport: thumbViewport, intent: 'print' }).promise;
    const dataUrl = canvas.toDataURL('image/webp', 0.8) || canvas.toDataURL('image/jpeg', 0.9);
    
    // Memory cleanup
    canvas.width = 0;
    canvas.height = 0;
    try { await page.cleanup(); } catch { /* ignore */ }
    return dataUrl;
  } catch (error) {
    console.error(`Error rendering page ${pageNum}:`, error);
    return '';
  }
};

/**
 * ULTRA-FAST: Render a small thumbnail for grids/lists
 * Uses lower dimension and higher compression to save RAM on 100+ page docs
 */
export const renderGridThumbnail = async (pdf: any, pageNum: number): Promise<string> => {
  try {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 0.5 }); // Lower initial scale
    
    const maxDimension = 400; // Small but crisp for grids
    const thumbnailScale = Math.min(maxDimension / viewport.width, maxDimension / viewport.height);
    const thumbViewport = page.getViewport({ scale: thumbnailScale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!context) return '';
    
    canvas.height = thumbViewport.height;
    canvas.width = thumbViewport.width;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    await page.render({ canvasContext: context, viewport: thumbViewport, intent: 'display' }).promise;
    
    // Higher compression for grid thumbnails
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
    
    canvas.width = 0;
    canvas.height = 0;
    try { await page.cleanup(); } catch { /* ignore */ }
    return dataUrl;
  } catch (error) {
    return '';
  }
};

// Wrapper for backward compatibility
export const generateThumbnail = async (file: File, pageNum: number = 1): Promise<string> => {
  try {
    const pdf = await loadPdfDocument(file);
    const thumb = await renderPageThumbnail(pdf, pageNum, 0.8);
    try { await pdf.destroy(); } catch { /* ignore */ }
    return thumb;
  } catch (error) {
    console.error('Thumbnail error:', error);
    return '';
  }
};

export const destroyPdf = async (pdf: any) => {
  try { await pdf?.destroy(); } catch { /* ignore */ }
};

export const getPdfMetaData = async (file: File): Promise<PdfMetaData> => {
  const attempt = async (lenient: boolean): Promise<PdfMetaData> => {
    // Fresh bytes per attempt: pdf.js may detach the buffer it is given.
    const loadingTask = pdfjsLib.getDocument({
      data: await file.arrayBuffer(),
      cMapUrl: getCMapUrl(),
      cMapPacked: true,
      ...(lenient ? { stopAtErrors: false } : {}),
    });

    const pdf = await loadingTask.promise;
    const firstPageThumb = await renderPageThumbnail(pdf, 1);
    const pageCount = pdf.numPages;
    try { await pdf.destroy(); } catch { /* ignore */ }

    return {
      thumbnail: firstPageThumb,
      pageCount,
      isLocked: false
    };
  };
  try {
    return await attempt(false);
  } catch (error: any) {
    if (error.message === 'PASSWORD_REQUIRED' || error.name === 'PasswordException') {
      return { thumbnail: '', pageCount: 0, isLocked: true };
    }
    // Quirky-but-readable files: retry with the lenient parser (mirrors loadPdfDocument)
    try {
      return await attempt(true);
    } catch {
      return { thumbnail: '', pageCount: 0, isLocked: false };
    }
  }
};

export const unlockPdf = async (file: File, password: string): Promise<PdfMetaData & { success: boolean, pdfDoc?: any }> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      password: password,
      cMapUrl: getCMapUrl(),
      cMapPacked: true,
    });

    const pdf = await loadingTask.promise;
    const firstPageThumb = await renderPageThumbnail(pdf, 1);

    return {
      thumbnail: firstPageThumb,
      pageCount: pdf.numPages,
      isLocked: false,
      success: true,
      pdfDoc: pdf
    };
  } catch (error: any) {
    return {
      thumbnail: '',
      pageCount: 0,
      isLocked: true,
      success: false
    };
  }
};
