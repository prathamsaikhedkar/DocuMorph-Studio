import React, { useState } from 'react';
import {
  Minimize2,
  Download,
  Sliders,
  Loader2,
  Archive,
  ArrowRight,
  TrendingDown,
  Trash2,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import type {
  CompressionOptions,
  CompressionResult,
} from '../../utils/imageCompressor';
import {
  compressImage,
  formatFileSize,
} from '../../utils/imageCompressor';
import { downloadBlob, downloadZip } from '../../utils/canvasUtils';

interface BatchItem {
  id: string;
  file: File;
  previewUrl: string;
  originalSize: number;
  result?: CompressionResult;
  status: 'idle' | 'compressing' | 'done' | 'error';
}

export const ImageCompressTool: React.FC = () => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [mode, setMode] = useState<'target-size' | 'quality'>('target-size');
  const [targetSizeKb, setTargetSizeKb] = useState<number>(200);
  const [qualityPercent, setQualityPercent] = useState<number>(80);
  const [maxDimension, setMaxDimension] = useState<number>(1920);
  const [outputFormat, setOutputFormat] = useState<'image/jpeg' | 'image/webp' | 'image/png'>('image/jpeg');

  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(0);

  const handleFilesAdded = (files: File[]) => {
    const valid = files.filter((f) => f.type.startsWith('image/'));
    if (valid.length === 0) return;

    const newItems: BatchItem[] = valid.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      previewUrl: URL.createObjectURL(file),
      originalSize: file.size,
      status: 'idle',
    }));

    setItems((prev) => [...prev, ...newItems]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        if (target.result?.dataUrl) URL.revokeObjectURL(target.result.dataUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleCompressAll = async () => {
    if (items.length === 0) return;
    setIsProcessing(true);

    const compOptions: CompressionOptions = {
      mode,
      targetSizeKb: mode === 'target-size' ? targetSizeKb : undefined,
      quality: mode === 'quality' ? qualityPercent / 100 : undefined,
      maxWidth: maxDimension > 0 ? maxDimension : undefined,
      maxHeight: maxDimension > 0 ? maxDimension : undefined,
      format: outputFormat,
    };

    const updated = [...items];

    for (let i = 0; i < updated.length; i++) {
      updated[i].status = 'compressing';
      setItems([...updated]);

      try {
        const res = await compressImage(updated[i].file, compOptions);
        updated[i].result = res;
        updated[i].status = 'done';
      } catch (err) {
        console.error('Compression failed for', updated[i].file.name, err);
        updated[i].status = 'error';
      }

      setItems([...updated]);
    }

    setIsProcessing(false);
  };

  const handleDownloadSingle = (item: BatchItem) => {
    if (!item.result) return;
    const baseName = item.file.name.substring(0, item.file.name.lastIndexOf('.')) || item.file.name;
    const ext = item.result.format === 'image/webp' ? 'webp' : item.result.format === 'image/png' ? 'png' : 'jpg';
    downloadBlob(item.result.blob, `${baseName}_compressed.${ext}`, item.result.format);
  };

  const handleDownloadAllZip = async () => {
    const readyItems = items.filter((i) => i.result && i.status === 'done');
    if (readyItems.length === 0) return;

    const zipFiles = readyItems.map((item) => {
      const baseName = item.file.name.substring(0, item.file.name.lastIndexOf('.')) || item.file.name;
      const ext = item.result!.format === 'image/webp' ? 'webp' : item.result!.format === 'image/png' ? 'png' : 'jpg';
      return {
        name: `${baseName}_compressed.${ext}`,
        content: item.result!.blob,
      };
    });

    await downloadZip(zipFiles, `compressed_images_${Date.now()}.zip`);
  };

  const activeItem = items[selectedPreviewIndex] || items[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Minimize2 className="w-6 h-6 text-brand-500" />
            Image Size Compressor
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Compress JPG, PNG, and WebP images to an exact target file size (KB) or adjust quality slider.
          </p>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-2">
            {items.some((i) => i.status === 'done') && (
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
                items.forEach((i) => {
                  URL.revokeObjectURL(i.previewUrl);
                  if (i.result?.dataUrl) URL.revokeObjectURL(i.result.dataUrl);
                });
                setItems([]);
              }}
              className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/60"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <DropZone
          onFilesSelected={handleFilesAdded}
          accept="image/jpeg,image/png,image/webp"
          multiple={true}
          title="Upload or Drag &amp; Drop Images to Compress"
          subtitle="Supports batch compression of JPG, PNG, WEBP files"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Col: Files List & Comparison */}
          <div className="lg:col-span-2 space-y-4">
            {/* Active Item Visual Comparison (Before vs After) */}
            {activeItem && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Preview: {activeItem.file.name}
                  </span>
                  {activeItem.result && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Reduced by {activeItem.result.reductionPercentage}%
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Original */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                      Original
                    </span>
                    <div className="h-44 rounded-lg overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                      <img
                        src={activeItem.previewUrl}
                        alt="Original"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {formatFileSize(activeItem.originalSize)}
                    </span>
                  </div>

                  {/* Compressed */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                    <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 block">
                      Compressed
                    </span>
                    <div className="h-44 rounded-lg overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                      {activeItem.result ? (
                        <img
                          src={activeItem.result.dataUrl}
                          alt="Compressed"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <div className="text-xs text-slate-400 flex flex-col items-center gap-1">
                          <Minimize2 className="w-6 h-6 opacity-40" />
                          <span>Click Compress to generate</span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {activeItem.result ? formatFileSize(activeItem.result.compressedSize) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Batch List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Batch Queue ({items.length})
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Select an item to view preview
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedPreviewIndex(idx)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedPreviewIndex === idx
                        ? 'bg-brand-50/60 dark:bg-brand-950/40 border-brand-500 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        className="w-10 h-10 object-cover rounded-lg border shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {item.file.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {formatFileSize(item.originalSize)}
                          {item.result && (
                            <>
                              {' '}
                              <ArrowRight className="inline w-3 h-3 text-emerald-500" />{' '}
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {formatFileSize(item.result.compressedSize)} (-{item.result.reductionPercentage}%)
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.result && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadSingle(item);
                          }}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(item.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <DropZone
                onFilesSelected={handleFilesAdded}
                accept="image/jpeg,image/png,image/webp"
                multiple={true}
                compact={true}
                title="Add more images to batch"
              />
            </div>
          </div>

          {/* Right Col: Compression Settings */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-brand-500" />
                Compression Controls
              </h3>

              {/* Mode Toggle */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Compression Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode('target-size')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                      mode === 'target-size'
                        ? 'bg-brand-50 dark:bg-brand-950/80 border-brand-500 text-brand-600 dark:text-brand-300 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Target File Size
                  </button>
                  <button
                    onClick={() => setMode('quality')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                      mode === 'quality'
                        ? 'bg-brand-50 dark:bg-brand-950/80 border-brand-500 text-brand-600 dark:text-brand-300 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Quality Slider
                  </button>
                </div>
              </div>

              {/* Target Size Controls */}
              {mode === 'target-size' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Max Target Size: <span className="font-bold text-brand-600">{targetSizeKb} KB</span>
                    </label>
                    <div className="grid grid-cols-4 gap-1.5 mb-2">
                      {[50, 100, 200, 500].map((kb) => (
                        <button
                          key={kb}
                          onClick={() => setTargetSizeKb(kb)}
                          className={`py-1 text-xs font-medium rounded-lg border ${
                            targetSizeKb === kb
                              ? 'bg-brand-50 dark:bg-brand-950 border-brand-500 text-brand-600 font-bold'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {kb} KB
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="10"
                        max="20000"
                        value={targetSizeKb}
                        onChange={(e) => setTargetSizeKb(parseInt(e.target.value) || 200)}
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold"
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-400">KB</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Quality Slider Controls */
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                    <span>Quality Level</span>
                    <span className="font-bold text-brand-600">{qualityPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="98"
                    value={qualityPercent}
                    onChange={(e) => setQualityPercent(parseInt(e.target.value))}
                    className="w-full accent-brand-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Smallest Size</span>
                    <span>Balanced (80%)</span>
                    <span>Best Quality</span>
                  </div>
                </div>
              )}

              {/* Max Dimension Limit */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Max Resolution Limit: {maxDimension === 0 ? 'No Limit (Keep Original)' : `${maxDimension}px`}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { val: 1080, label: '1080p' },
                    { val: 1920, label: '1920p' },
                    { val: 2560, label: '2K' },
                    { val: 0, label: 'Full' },
                  ].map((dim) => (
                    <button
                      key={dim.label}
                      onClick={() => setMaxDimension(dim.val)}
                      className={`py-1 text-xs font-medium rounded-lg border ${
                        maxDimension === dim.val
                          ? 'bg-brand-50 dark:bg-brand-950 border-brand-500 text-brand-600 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {dim.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Output Format */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Output Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOutputFormat('image/jpeg')}
                    className={`py-1.5 text-xs font-semibold rounded-lg border ${
                      outputFormat === 'image/jpeg'
                        ? 'bg-brand-50 dark:bg-brand-950 border-brand-500 text-brand-600 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    JPEG (.jpg)
                  </button>
                  <button
                    onClick={() => setOutputFormat('image/webp')}
                    className={`py-1.5 text-xs font-semibold rounded-lg border ${
                      outputFormat === 'image/webp'
                        ? 'bg-brand-50 dark:bg-brand-950 border-brand-500 text-brand-600 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    WebP (Best Ratio)
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleCompressAll}
                disabled={isProcessing || items.length === 0}
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Compressing images...</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4" />
                    <span>Compress {items.length} {items.length === 1 ? 'Image' : 'Images'}</span>
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
