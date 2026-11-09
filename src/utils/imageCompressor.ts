export interface CompressionOptions {
  mode: 'target-size' | 'quality';
  targetSizeKb?: number; // e.g. 200 for 200 KB
  quality?: number; // 0.1 to 1.0 (default 0.8)
  maxWidth?: number;
  maxHeight?: number;
  format?: 'image/jpeg' | 'image/webp' | 'image/png';
}

export interface CompressionResult {
  blob: Blob;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  reductionPercentage: number;
  width: number;
  height: number;
  format: string;
}

/**
 * Loads an image from File or Blob into an HTMLImageElement
 */
export function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Compresses an image completely in the browser using HTML5 Canvas & binary search
 */
export async function compressImage(
  file: File | Blob,
  options: CompressionOptions,
  onProgress?: (msg: string) => void
): Promise<CompressionResult> {
  const originalSize = file.size;
  const img = await loadImage(file);
  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;

  let format = options.format || (file.type === 'image/png' ? 'image/png' : 'image/jpeg');
  // PNG cannot be lossy compressed via canvas toBlob quality parameter in standard browser canvas,
  // so if user requests target size or quality compression on PNG, switch to WebP or JPEG unless specified
  if (format === 'image/png' && (options.mode === 'target-size' || options.quality !== undefined)) {
    format = 'image/webp';
  }

  // Calculate target dimensions
  let targetWidth = origWidth;
  let targetHeight = origHeight;

  if (options.maxWidth || options.maxHeight) {
    const maxW = options.maxWidth || origWidth;
    const maxH = options.maxHeight || origHeight;
    const ratio = Math.min(maxW / origWidth, maxH / origHeight, 1);
    targetWidth = Math.round(origWidth * ratio);
    targetHeight = Math.round(origHeight * ratio);
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Helper to render to blob
  const renderToBlob = (w: number, h: number, q: number): Promise<Blob> => {
    canvas.width = w;
    canvas.height = h;

    // Fill white background for JPEG to prevent transparent areas turning black
    if (format === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        },
        format,
        q
      );
    });
  };

  let finalBlob: Blob;

  if (options.mode === 'quality') {
    const q = options.quality ?? 0.8;
    onProgress?.('Compressing with selected quality...');
    finalBlob = await renderToBlob(targetWidth, targetHeight, q);
  } else {
    // Target Size Mode with intelligent binary search
    const targetBytes = (options.targetSizeKb || 200) * 1024;
    onProgress?.(`Optimizing for target size ${options.targetSizeKb} KB...`);

    let curWidth = targetWidth;
    let curHeight = targetHeight;
    let minQ = 0.05;
    let maxQ = 0.98;
    let bestBlob: Blob | null = null;
    let iterations = 0;

    // Binary search quality first
    while (iterations < 7 && minQ <= maxQ) {
      const midQ = (minQ + maxQ) / 2;
      const testBlob = await renderToBlob(curWidth, curHeight, midQ);
      iterations++;

      if (testBlob.size <= targetBytes) {
        bestBlob = testBlob;
        minQ = midQ + 0.05; // Try higher quality
      } else {
        maxQ = midQ - 0.05; // Need lower quality
      }
    }

    // If even lowest quality is still bigger than targetBytes, downscale dimensions
    if (!bestBlob || bestBlob.size > targetBytes) {
      let scale = 0.85;
      while (scale >= 0.2) {
        curWidth = Math.round(targetWidth * scale);
        curHeight = Math.round(targetHeight * scale);
        const testBlob = await renderToBlob(curWidth, curHeight, 0.65);
        if (testBlob.size <= targetBytes) {
          bestBlob = testBlob;
          break;
        }
        scale -= 0.15;
      }
    }

    finalBlob = bestBlob || (await renderToBlob(curWidth, curHeight, 0.4));
  }

  const dataUrl = URL.createObjectURL(finalBlob);
  const compressedSize = finalBlob.size;
  const reductionPercentage = Math.round(((originalSize - compressedSize) / originalSize) * 100);

  return {
    blob: finalBlob,
    dataUrl,
    originalSize,
    compressedSize,
    reductionPercentage,
    width: canvas.width,
    height: canvas.height,
    format,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
