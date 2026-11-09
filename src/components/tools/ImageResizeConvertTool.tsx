import React, { useState } from 'react';
import {
  RefreshCw,
  Download,
  Lock,
  Unlock,
  Archive,
  Trash2,
  Check,
  Loader2,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import { downloadBlob, downloadZip } from '../../utils/canvasUtils';
import { formatFileSize } from '../../utils/imageCompressor';

interface ConvertItem {
  id: string;
  file: File;
  previewUrl: string;
  originalWidth: number;
  originalHeight: number;
  targetWidth: number;
  targetHeight: number;
  resultBlob?: Blob;
  resultUrl?: string;
}

export const ImageResizeConvertTool: React.FC = () => {
  const [items, setItems] = useState<ConvertItem[]>([]);
  const [targetFormat, setTargetFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/png');
  const [quality, setQuality] = useState<number>(0.92);
  const [lockAspect, setLockAspect] = useState<boolean>(true);
  const [scalePercent, setScalePercent] = useState<number>(100);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleFilesAdded = async (files: File[]) => {
    const valid = files.filter((f) => f.type.startsWith('image/'));
    if (valid.length === 0) return;

    const newItems: ConvertItem[] = [];

    for (const file of valid) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise<void>((r) => {
        img.onload = () => r();
        img.onerror = () => r();
        img.src = url;
      });

      const w = img.naturalWidth || 800;
      const h = img.naturalHeight || 600;

      newItems.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        previewUrl: url,
        originalWidth: w,
        originalHeight: h,
        targetWidth: Math.round((w * scalePercent) / 100),
        targetHeight: Math.round((h * scalePercent) / 100),
      });
    }

    setItems((prev) => [...prev, ...newItems]);
  };

  const updateItemDimensions = (id: string, w: number, h: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          targetWidth: w,
          targetHeight: h,
        };
      })
    );
  };

  const applyScaleToAll = (percent: number) => {
    setScalePercent(percent);
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        targetWidth: Math.round((item.originalWidth * percent) / 100),
        targetHeight: Math.round((item.originalHeight * percent) / 100),
      }))
    );
  };

  const handleConvertAll = async () => {
    if (items.length === 0) return;
    setIsProcessing(true);

    const updated = [...items];

    for (let i = 0; i < updated.length; i++) {
      const item = updated[i];
      const canvas = document.createElement('canvas');
      canvas.width = item.targetWidth;
      canvas.height = item.targetHeight;
      const ctx = canvas.getContext('2d')!;

      if (targetFormat === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      const img = new Image();
      img.src = item.previewUrl;
      await new Promise<void>((r) => (img.onload = () => r()));

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), targetFormat, quality));
      item.resultBlob = blob;
      item.resultUrl = URL.createObjectURL(blob);
    }

    setItems(updated);
    setIsProcessing(false);
  };

  const handleDownloadSingle = (item: ConvertItem) => {
    if (!item.resultBlob) return;
    const baseName = item.file.name.substring(0, item.file.name.lastIndexOf('.')) || item.file.name;
    const ext = targetFormat === 'image/png' ? 'png' : targetFormat === 'image/webp' ? 'webp' : 'jpg';
    downloadBlob(item.resultBlob, `${baseName}_converted.${ext}`, targetFormat);
  };

  const handleDownloadAllZip = async () => {
    const readyItems = items.filter((i) => i.resultBlob);
    if (readyItems.length === 0) return;

    const ext = targetFormat === 'image/png' ? 'png' : targetFormat === 'image/webp' ? 'webp' : 'jpg';
    const zipFiles = readyItems.map((item) => {
      const baseName = item.file.name.substring(0, item.file.name.lastIndexOf('.')) || item.file.name;
      return {
        name: `${baseName}_converted.${ext}`,
        content: item.resultBlob!,
      };
    });

    await downloadZip(zipFiles, `converted_images_${Date.now()}.zip`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-brand-500" />
            Format Converter &amp; Batch Resizer
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Convert image formats between PNG, JPG, WebP and resize dimensions with high-quality filtering.
          </p>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-2">
            {items.some((i) => i.resultBlob) && (
              <button
                onClick={handleDownloadAllZip}
                className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Archive className="w-3.5 h-3.5" />
                Download All (.ZIP)
              </button>
            )}
            <button
              onClick={() => {
                items.forEach((i) => URL.revokeObjectURL(i.previewUrl));
                setItems([]);
              }}
              className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/60"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <DropZone
          onFilesSelected={handleFilesAdded}
          accept="image/*"
          multiple={true}
          title="Upload or Drag &amp; Drop Images to Convert"
          subtitle="Supports PNG, JPG, WebP, GIF, BMP, SVG"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Col: Items List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="w-14 h-14 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.file.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Orig: {item.originalWidth} × {item.originalHeight} px • {formatFileSize(item.file.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Dimension Controls */}
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <input
                        type="number"
                        value={item.targetWidth}
                        onChange={(e) => {
                          const w = parseInt(e.target.value) || 1;
                          const h = lockAspect
                            ? Math.round(w * (item.originalHeight / item.originalWidth))
                            : item.targetHeight;
                          updateItemDimensions(item.id, w, h);
                        }}
                        className="w-16 px-1.5 py-1 text-center bg-slate-50 dark:bg-slate-800 border rounded"
                      />
                      <span className="text-slate-400">×</span>
                      <input
                        type="number"
                        value={item.targetHeight}
                        onChange={(e) => {
                          const h = parseInt(e.target.value) || 1;
                          const w = lockAspect
                            ? Math.round(h * (item.originalWidth / item.originalHeight))
                            : item.targetWidth;
                          updateItemDimensions(item.id, w, h);
                        }}
                        className="w-16 px-1.5 py-1 text-center bg-slate-50 dark:bg-slate-800 border rounded"
                      />
                    </div>

                    {item.resultBlob && (
                      <button
                        onClick={() => handleDownloadSingle(item)}
                        className="p-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg hover:bg-emerald-100"
                        title="Download converted"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                      className="p-1.5 text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <DropZone
              onFilesSelected={handleFilesAdded}
              accept="image/*"
              multiple={true}
              compact={true}
              title="Add more images"
            />
          </div>

          {/* Right Col: Conversion Settings */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm pb-2 border-b border-slate-100 dark:border-slate-800">
                Conversion Settings
              </h3>

              {/* Target Format */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Convert To Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'image/png', label: 'PNG' },
                    { id: 'image/jpeg', label: 'JPG' },
                    { id: 'image/webp', label: 'WebP' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      onClick={() => setTargetFormat(fmt.id as any)}
                      className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        targetFormat === fmt.id
                          ? 'bg-brand-50 dark:bg-brand-950 border-brand-500 text-brand-600 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              {targetFormat !== 'image/png' && (
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <span>Export Quality</span>
                    <span className="font-bold text-brand-600">{Math.round(quality * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-full accent-brand-500 cursor-pointer"
                  />
                </div>
              )}

              {/* Batch Scale Presets */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Scale All Dimensions: <span className="font-bold text-brand-600">{scalePercent}%</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[25, 50, 75, 100].map((p) => (
                    <button
                      key={p}
                      onClick={() => applyScaleToAll(p)}
                      className={`py-1 text-xs font-medium rounded-lg border ${
                        scalePercent === p
                          ? 'bg-brand-50 dark:bg-brand-950 border-brand-500 text-brand-600 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600'
                      }`}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Lock Aspect Ratio Toggle */}
              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Lock Aspect Ratio</span>
                <button
                  onClick={() => setLockAspect(!lockAspect)}
                  className={`p-1.5 rounded-lg border flex items-center gap-1 ${
                    lockAspect
                      ? 'bg-brand-50 border-brand-500 text-brand-600 font-semibold'
                      : 'border-slate-300 text-slate-400'
                  }`}
                >
                  {lockAspect ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>{lockAspect ? 'Locked' : 'Unlocked'}</span>
                </button>
              </div>

              {/* Action Button */}
              <button
                onClick={handleConvertAll}
                disabled={isProcessing || items.length === 0}
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Convert &amp; Resize All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
