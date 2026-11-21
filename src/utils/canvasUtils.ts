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

export type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'tile';

export interface ImageWatermarkOptions {
  type: 'text' | 'image';
  text?: string;
  textColor?: string;
  fontSize?: number;
  watermarkImageSrc?: string;
  watermarkScale?: number;
  opacity: number; // 0.05 to 1.0
  rotation: number; // in degrees, e.g. -45, 0, 30
  position: WatermarkPosition;
  margin?: number;
  tileGap?: number;
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
  quality?: number;
}

export interface ImageFilterOptions {
  brightness: number; // 0 to 200 (100 is normal)
  contrast: number;   // 0 to 200 (100 is normal)
  saturation: number; // 0 to 200 (100 is normal)
  grayscale: number;  // 0 to 100
  sepia: number;      // 0 to 100
  invert: number;     // 0 to 100
  hueRotate: number;  // 0 to 360 (degrees)
  blur: number;       // 0 to 20 (px)
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
  quality?: number;
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

/**
 * Applies text or logo watermark onto an image
 */
export async function applyImageWatermark(
  imageSource: string | File | Blob,
  options: ImageWatermarkOptions
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  let imgUrl: string;
  let needsRevoke = false;

  if (typeof imageSource === 'string') {
    imgUrl = imageSource;
  } else {
    imgUrl = URL.createObjectURL(imageSource);
    needsRevoke = true;
  }

  const baseImg = await loadImageElement(imgUrl);
  if (needsRevoke) {
    URL.revokeObjectURL(imgUrl);
  }

  const w = baseImg.naturalWidth;
  const h = baseImg.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const format = options.format || 'image/png';
  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(baseImg, 0, 0);

  ctx.save();
  ctx.globalAlpha = Math.max(0.01, Math.min(1.0, options.opacity));

  const margin = options.margin ?? Math.max(20, Math.round(w * 0.03));
  const rotRad = ((options.rotation || 0) * Math.PI) / 180;

  if (options.type === 'text') {
    const text = options.text || 'CONFIDENTIAL';
    const baseFontSize = options.fontSize || Math.max(24, Math.round(w * 0.05));
    ctx.font = `bold ${baseFontSize}px sans-serif`;
    ctx.fillStyle = options.textColor || '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    const textMetrics = ctx.measureText(text);
    const textW = textMetrics.width;
    const textH = baseFontSize;

    if (options.position === 'tile') {
      const stepX = textW + (options.tileGap ?? 120);
      const stepY = textH + (options.tileGap ?? 100);

      for (let y = -h * 0.5; y < h * 1.5; y += stepY) {
        for (let x = -w * 0.5; x < w * 1.5; x += stepX) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rotRad);
          // subtle stroke for readability on any background
          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          ctx.lineWidth = Math.max(1, Math.round(baseFontSize * 0.06));
          ctx.strokeText(text, 0, 0);
          ctx.fillText(text, 0, 0);
          ctx.restore();
        }
      }
    } else {
      // Calculate coordinates based on 9-anchor positioning
      let cx = w / 2;
      let cy = h / 2;

      if (options.position.includes('left')) cx = margin + textW / 2;
      else if (options.position.includes('right')) cx = w - margin - textW / 2;

      if (options.position.includes('top')) cy = margin + textH / 2;
      else if (options.position.includes('bottom')) cy = h - margin - textH / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotRad);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = Math.max(1, Math.round(baseFontSize * 0.06));
      ctx.strokeText(text, 0, 0);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  } else if (options.type === 'image' && options.watermarkImageSrc) {
    const markImg = await loadImageElement(options.watermarkImageSrc);
    const targetScale = options.watermarkScale || 0.25;
    const markW = markImg.naturalWidth * targetScale;
    const markH = markImg.naturalHeight * targetScale;

    if (options.position === 'tile') {
      const stepX = markW + (options.tileGap ?? 100);
      const stepY = markH + (options.tileGap ?? 100);

      for (let y = -h * 0.5; y < h * 1.5; y += stepY) {
        for (let x = -w * 0.5; x < w * 1.5; x += stepX) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rotRad);
          ctx.drawImage(markImg, -markW / 2, -markH / 2, markW, markH);
          ctx.restore();
        }
      }
    } else {
      let cx = w / 2;
      let cy = h / 2;

      if (options.position.includes('left')) cx = margin + markW / 2;
      else if (options.position.includes('right')) cx = w - margin - markW / 2;

      if (options.position.includes('top')) cy = margin + markH / 2;
      else if (options.position.includes('bottom')) cy = h - margin - markH / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotRad);
      ctx.drawImage(markImg, -markW / 2, -markH / 2, markW, markH);
      ctx.restore();
    }
  }

  ctx.restore();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Canvas watermark export failed'));
      },
      format,
      options.quality ?? 0.92
    );
  });

  return {
    blob,
    dataUrl: URL.createObjectURL(blob),
    width: w,
    height: h,
  };
}

/**
 * Applies color adjustments and filters (brightness, contrast, saturation, sepia, etc.)
 */
export async function applyImageFilters(
  imageSource: string | File | Blob,
  filters: ImageFilterOptions
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  let imgUrl: string;
  let needsRevoke = false;

  if (typeof imageSource === 'string') {
    imgUrl = imageSource;
  } else {
    imgUrl = URL.createObjectURL(imageSource);
    needsRevoke = true;
  }

  const baseImg = await loadImageElement(imgUrl);
  if (needsRevoke) {
    URL.revokeObjectURL(imgUrl);
  }

  const w = baseImg.naturalWidth;
  const h = baseImg.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const filterString = [
    `brightness(${filters.brightness}%)`,
    `contrast(${filters.contrast}%)`,
    `saturate(${filters.saturation}%)`,
    `grayscale(${filters.grayscale}%)`,
    `sepia(${filters.sepia}%)`,
    `invert(${filters.invert}%)`,
    `hue-rotate(${filters.hueRotate}deg)`,
    filters.blur > 0 ? `blur(${filters.blur}px)` : '',
  ]
    .filter(Boolean)
    .join(' ');

  ctx.filter = filterString;

  const format = filters.format || 'image/png';
  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(baseImg, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Filter export failed'));
      },
      format,
      filters.quality ?? 0.92
    );
  });

  return {
    blob,
    dataUrl: URL.createObjectURL(blob),
    width: w,
    height: h,
  };
}
