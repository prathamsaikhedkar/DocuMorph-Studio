import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker using ESM URL
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

/**
 * Helper to clone buffer slice so PDF.js worker transfer never detaches original ArrayBuffer
 */
function getPdfJsData(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer.slice(0));
}

export interface ImageToPdfItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  width: number;
  height: number;
}

export interface ImageToPdfOptions {
  pageSize: 'fit' | 'a4' | 'letter' | 'legal';
  orientation: 'auto' | 'portrait' | 'landscape';
  margin: number; // in points (72 points = 1 inch)
  imageQuality: number; // 0.1 to 1.0
  addPageNumbers: boolean;
  documentTitle?: string;
}

// Standard page dimensions in points (72 pt / inch)
const PAGE_SIZES = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612.0, height: 792.0 },
  legal: { width: 612.0, height: 1008.0 },
};

/**
 * Converts one or multiple images into a combined single PDF
 */
export async function convertImagesToPdf(
  items: ImageToPdfItem[],
  options: ImageToPdfOptions,
  onProgress?: (current: number, total: number) => void
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  if (options.documentTitle) {
    pdfDoc.setTitle(options.documentTitle);
  }
  pdfDoc.setProducer('DocuMorph Studio (Client-Side)');

  for (let i = 0; i < items.length; i++) {
    onProgress?.(i + 1, items.length);
    const item = items[i];

    // Ensure we convert image to JPEG/PNG bytes using canvas for consistency and compression
    const imageCanvas = document.createElement('canvas');
    const img = new Image();
    const url = URL.createObjectURL(item.file);

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
    URL.revokeObjectURL(url);

    imageCanvas.width = img.naturalWidth;
    imageCanvas.height = img.naturalHeight;
    const ctx = imageCanvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, imageCanvas.width, imageCanvas.height);
    ctx.drawImage(img, 0, 0);

    const jpegBlob = await new Promise<Blob>((resolve) => {
      imageCanvas.toBlob(
        (b) => resolve(b || new Blob()),
        'image/jpeg',
        options.imageQuality
      );
    });

    const imgBytes = await jpegBlob.arrayBuffer();
    const embeddedImage = await pdfDoc.embedJpg(imgBytes);

    const imgWidth = embeddedImage.width;
    const imgHeight = embeddedImage.height;

    let pageWidth: number;
    let pageHeight: number;

    if (options.pageSize === 'fit') {
      pageWidth = imgWidth + options.margin * 2;
      pageHeight = imgHeight + options.margin * 2;
    } else {
      const standardSize = PAGE_SIZES[options.pageSize];
      let pW = standardSize.width;
      let pH = standardSize.height;

      // Determine orientation
      if (options.orientation === 'landscape') {
        [pW, pH] = [pH, pW];
      } else if (options.orientation === 'auto') {
        if (imgWidth > imgHeight) {
          [pW, pH] = [pH, pW];
        }
      }
      pageWidth = pW;
      pageHeight = pH;
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Available drawing area
    const availableW = pageWidth - options.margin * 2;
    const availableH = pageHeight - options.margin * 2;

    const scale = Math.min(availableW / imgWidth, availableH / imgHeight, 1);
    const drawW = imgWidth * scale;
    const drawH = imgHeight * scale;

    // Center image on the page
    const drawX = options.margin + (availableW - drawW) / 2;
    const drawY = options.margin + (availableH - drawH) / 2;

    page.drawImage(embeddedImage, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
    });

    if (options.addPageNumbers) {
      page.drawText(`${i + 1} / ${items.length}`, {
        x: pageWidth / 2 - 12,
        y: Math.max(8, options.margin / 2),
        size: 9,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Merges multiple PDF files into a single PDF
 */
export async function mergePdfs(pdfBuffers: ArrayBuffer[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const buffer of pdfBuffers) {
    const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

/**
 * Splits / extracts specified pages from a PDF
 */
export async function extractPdfPages(
  pdfBuffer: ArrayBuffer,
  pageIndicesToKeep: number[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();

  const validIndices = pageIndicesToKeep.filter(
    (idx) => idx >= 0 && idx < srcDoc.getPageCount()
  );

  const copiedPages = await newDoc.copyPages(srcDoc, validIndices);
  copiedPages.forEach((page) => newDoc.addPage(page));

  return await newDoc.save();
}

/**
 * Renders PDF pages to images using pdfjs-dist
 */
export async function renderPdfToImages(
  pdfBuffer: ArrayBuffer,
  scale: number = 2.0,
  format: 'image/jpeg' | 'image/png' = 'image/jpeg',
  onProgress?: (current: number, total: number) => void
): Promise<Array<{ pageNumber: number; blob: Blob; dataUrl: string; width: number; height: number }>> {
  const loadingTask = pdfjsLib.getDocument({ data: getPdfJsData(pdfBuffer) });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const results: Array<{ pageNumber: number; blob: Blob; dataUrl: string; width: number; height: number }> = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    onProgress?.(pageNum, numPages);
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Fill white background (PDFs can be transparent)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };

    // @ts-ignore
    await page.render(renderContext).promise;

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), format, 0.92);
    });

    results.push({
      pageNumber: pageNum,
      blob,
      dataUrl: URL.createObjectURL(blob),
      width: canvas.width,
      height: canvas.height,
    });
  }

  return results;
}

/**
 * Gets thumbnail previews for all pages in a PDF
 */
export async function getPdfThumbnails(
  pdfBuffer: ArrayBuffer
): Promise<Array<{ pageNumber: number; dataUrl: string; width: number; height: number }>> {
  const loadingTask = pdfjsLib.getDocument({ data: getPdfJsData(pdfBuffer) });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const thumbnails: Array<{ pageNumber: number; dataUrl: string; width: number; height: number }> = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    // Scale for thumbnail preview (e.g. max width ~200px)
    const baseViewport = page.getViewport({ scale: 1.0 });
    const scale = 200 / baseViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // @ts-ignore
    await page.render({ canvasContext: ctx, viewport }).promise;

    thumbnails.push({
      pageNumber: pageNum,
      dataUrl: canvas.toDataURL('image/jpeg', 0.8),
      width: Math.round(baseViewport.width),
      height: Math.round(baseViewport.height),
    });
  }

  return thumbnails;
}

export interface PdfProtectionCheck {
  isProtected: boolean;
  requiresPassword: boolean;
  pageCount?: number;
  message?: string;
}

/**
 * Checks if a PDF is password protected without having to decrypt it
 */
export async function checkPdfPasswordProtection(buffer: ArrayBuffer): Promise<PdfProtectionCheck> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: getPdfJsData(buffer) });
    const pdf = await loadingTask.promise;
    return {
      isProtected: false,
      requiresPassword: false,
      pageCount: pdf.numPages,
    };
  } catch (err: any) {
    if (
      err?.name === 'PasswordException' ||
      err?.message?.toLowerCase().includes('password') ||
      err?.code === 1
    ) {
      return {
        isProtected: true,
        requiresPassword: true,
        message: 'This PDF is encrypted and requires a password to open.',
      };
    }
    throw err;
  }
}

export interface UnlockPdfOptions {
  password?: string;
  resolutionMultiplier?: number;
  quality?: number;
}

/**
 * Decrypts a password-protected PDF using the provided password and exports
 * a completely unlocked, unencrypted version with zero passwords or restrictions.
 */
export async function decryptAndUnlockPdf(
  buffer: ArrayBuffer,
  password: string,
  options: UnlockPdfOptions = {},
  onProgress?: (current: number, total: number) => void
): Promise<{ unlockedBytes: Uint8Array; pageCount: number }> {
  // 1. If it only had owner permission restrictions with blank user password, pdf-lib can save it directly
  if (!password || password.trim() === '') {
    try {
      const directDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const directBytes = await directDoc.save();
      return {
        unlockedBytes: directBytes,
        pageCount: directDoc.getPageCount(),
      };
    } catch {
      // Must use password
    }
  }

  const scale = options.resolutionMultiplier || 2.5; // High crisp resolution (~180-200 DPI equivalent)
  const quality = options.quality || 0.92;

  const loadingTask = pdfjsLib.getDocument({
    data: getPdfJsData(buffer),
    password: password,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const newDoc = await PDFDocument.create();
  newDoc.setProducer('DocuMorph Studio (Client-Side Unlocked)');

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    onProgress?.(pageNum, numPages);
    const page = await pdf.getPage(pageNum);

    // Get unscaled standard viewport for point dimensions (preserving exact page geometry: A4, Letter, etc.)
    const standardViewport = page.getViewport({ scale: 1.0 });
    const renderViewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = renderViewport.width;
    canvas.height = renderViewport.height;
    const ctx = canvas.getContext('2d')!;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: ctx,
      viewport: renderViewport,
    };

    // @ts-ignore
    await page.render(renderContext).promise;

    const jpegBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', quality);
    });

    const imgBytes = await jpegBlob.arrayBuffer();
    const embeddedImg = await newDoc.embedJpg(imgBytes);

    const pdfPage = newDoc.addPage([standardViewport.width, standardViewport.height]);
    pdfPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: standardViewport.width,
      height: standardViewport.height,
    });
  }

  const unlockedBytes = await newDoc.save();
  return {
    unlockedBytes,
    pageCount: numPages,
  };
}

export interface PerPageCompressionConfig {
  quality: number; // 0.1 to 1.0
  scale: number;   // 1.0 to 3.0
}

export interface PdfPerpageCompressOptions {
  defaultQuality: number; // e.g. 0.72
  defaultScale: number;   // e.g. 1.5
  pageConfigs?: Record<number, PerPageCompressionConfig>;
}

export interface PageCompressStat {
  pageNumber: number;
  width: number;
  height: number;
  compressedBytes: number;
  quality: number;
  scale: number;
}

export interface PdfCompressResult {
  compressedBytes: Uint8Array;
  originalSize: number;
  compressedSize: number;
  reductionPercentage: number;
  pageCount: number;
  pageStats: PageCompressStat[];
}

/**
 * Compresses a PDF file page-by-page client-side, allowing granular per-page quality control
 */
export async function compressPdfPerPages(
  buffer: ArrayBuffer,
  options: PdfPerpageCompressOptions,
  onProgress?: (current: number, total: number, latestStat?: PageCompressStat) => void
): Promise<PdfCompressResult> {
  const originalSize = buffer.byteLength;
  const loadingTask = pdfjsLib.getDocument({ data: getPdfJsData(buffer) });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const newDoc = await PDFDocument.create();
  newDoc.setProducer('DocuMorph Studio (Client-Side Per-Page Compressed)');

  const pageStats: PageCompressStat[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const standardViewport = page.getViewport({ scale: 1.0 });

    const config = options.pageConfigs?.[pageNum] || {
      quality: options.defaultQuality,
      scale: options.defaultScale,
    };

    const renderViewport = page.getViewport({ scale: config.scale });
    const canvas = document.createElement('canvas');
    canvas.width = renderViewport.width;
    canvas.height = renderViewport.height;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const renderContext = {
      canvasContext: ctx,
      viewport: renderViewport,
    };

    // @ts-ignore
    await page.render(renderContext).promise;

    const jpegBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', config.quality);
    });

    const imgBytes = await jpegBlob.arrayBuffer();
    const embeddedImg = await newDoc.embedJpg(imgBytes);

    const pdfPage = newDoc.addPage([standardViewport.width, standardViewport.height]);
    pdfPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: standardViewport.width,
      height: standardViewport.height,
    });

    const stat: PageCompressStat = {
      pageNumber: pageNum,
      width: Math.round(standardViewport.width),
      height: Math.round(standardViewport.height),
      compressedBytes: imgBytes.byteLength,
      quality: config.quality,
      scale: config.scale,
    };

    pageStats.push(stat);
    onProgress?.(pageNum, numPages, stat);
  }

  const compressedBytes = await newDoc.save();
  const compressedSize = compressedBytes.length;
  const reductionPercentage = Math.round(
    Math.max(0, ((originalSize - compressedSize) / originalSize) * 100)
  );

  return {
    compressedBytes,
    originalSize,
    compressedSize,
    reductionPercentage,
    pageCount: numPages,
    pageStats,
  };
}
