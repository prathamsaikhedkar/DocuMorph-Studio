import JSZip from 'jszip';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TransformOptions {
  crop?: CropRect;
  rotation?: number; // 0, 90, 180, 270 or arbitrary degrees
  flipH?: boolean;
  flipV?: boolean;
  outputWidth?: number;
  outputHeight?: number;
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
  quality?: number;
  backgroundColor?: string;
}

/**
 * Downloads a Blob directly to the client's filesystem
 */
export function downloadBlob(blob: Blob | Uint8Array, filename: string, mimeType?: string) {
  const finalBlob =
    blob instanceof Blob
      ? blob
      : new Blob([blob.buffer as ArrayBuffer], { type: mimeType || 'application/octet-stream' });
  const url = URL.createObjectURL(finalBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Downloads multiple files zipped together in browser memory
 */
export async function downloadZip(
  files: Array<{ name: string; content: Blob | Uint8Array | string }>,
  zipName: string
) {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.name, file.content);
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, zipName, 'application/zip');
}

/**
 * Loads an HTMLImageElement safely
 */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Transforms, crops, rotates, flips, and exports image
 */
export async function processImageTransform(
  imageSource: string | File | Blob,
  options: TransformOptions
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  let imgUrl: string;
  let needsRevoke = false;

  if (typeof imageSource === 'string') {
    imgUrl = imageSource;
  } else {
    imgUrl = URL.createObjectURL(imageSource);
    needsRevoke = true;
  }

  const img = await loadImageElement(imgUrl);
  if (needsRevoke) {
    URL.revokeObjectURL(imgUrl);
  }

  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;

  // 1. First stage: Crop & Rotate on intermediate canvas
  const crop = options.crop || { x: 0, y: 0, width: origWidth, height: origHeight };
  
  // Constrain crop to valid boundaries
  const cropX = Math.max(0, Math.min(crop.x, origWidth));
  const cropY = Math.max(0, Math.min(crop.y, origHeight));
  const cropW = Math.max(1, Math.min(crop.width, origWidth - cropX));
  const cropH = Math.max(1, Math.min(crop.height, origHeight - cropY));

  // Determine rotated dimensions
  const rotRad = ((options.rotation || 0) * Math.PI) / 180;
  const absCos = Math.abs(Math.cos(rotRad));
  const absSin = Math.abs(Math.sin(rotRad));

  const rotatedW = Math.round(cropW * absCos + cropH * absSin);
  const rotatedH = Math.round(cropW * absSin + cropH * absCos);

  const finalW = options.outputWidth || rotatedW;
  const finalH = options.outputHeight || rotatedH;

  const canvas = document.createElement('canvas');
  canvas.width = finalW;
  canvas.height = finalH;
  const ctx = canvas.getContext('2d')!;

  const format = options.format || 'image/png';
  if (format === 'image/jpeg' || options.backgroundColor) {
    ctx.fillStyle = options.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, finalW, finalH);
  } else {
    ctx.clearRect(0, 0, finalW, finalH);
  }

  ctx.save();

  // Move to center of output
  ctx.translate(finalW / 2, finalH / 2);

  // Apply flip
  const scaleX = (options.flipH ? -1 : 1) * (finalW / rotatedW);
  const scaleY = (options.flipV ? -1 : 1) * (finalH / rotatedH);
  ctx.scale(scaleX, scaleY);

  // Apply rotation
  ctx.rotate(rotRad);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw cropped slice
  ctx.drawImage(
    img,
    cropX, cropY, cropW, cropH,
    -cropW / 2, -cropH / 2, cropW, cropH
  );

  ctx.restore();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Canvas export failed'));
      },
      format,
      options.quality ?? 0.92
    );
  });

  return {
    blob,
    dataUrl: URL.createObjectURL(blob),
    width: finalW,
    height: finalH,
  };
}
