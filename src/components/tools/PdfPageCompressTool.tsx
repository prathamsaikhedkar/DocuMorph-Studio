import React, { useState } from 'react';
import {
  FileText,
  Sliders,
  TrendingDown,
  Download,
  Eye,
  CheckCircle2,
  Loader2,
  SlidersHorizontal,
  Sparkles,
  Zap,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import type {
  PerPageCompressionConfig,
  PdfCompressResult,
} from '../../utils/pdfUtils';
import {
  getPdfThumbnails,
  compressPdfPerPages,
} from '../../utils/pdfUtils';
import { downloadBlob } from '../../utils/canvasUtils';
import { formatFileSize } from '../../utils/imageCompressor';

interface PageThumbnail {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

type CompressionPreset = 'extreme' | 'balanced' | 'high' | 'custom';

export const PdfPageCompressTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [isLoadingThumbs, setIsLoadingThumbs] = useState<boolean>(false);

  // Compression settings
  const [preset, setPreset] = useState<CompressionPreset>('balanced');
  const [globalQuality, setGlobalQuality] = useState<number>(70); // percentage 10 - 95
  const [globalScale, setGlobalScale] = useState<number>(1.5);    // 1.0 to 2.5

  // Per-page overrides: pageNum -> { quality, scale }
  const [pageOverrides, setPageOverrides] = useState<Record<number, PerPageCompressionConfig>>({});
  const [activeConfigPage, setActiveConfigPage] = useState<number | null>(null);

  // Compression progress & result
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number; latestKb?: number } | null>(null);
  const [result, setResult] = useState<PdfCompressResult | null>(null);
  const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setIsLoadingThumbs(true);
    setResult(null);
    setPageOverrides({});
    setActiveConfigPage(null);

    try {
      const buf = await selected.arrayBuffer();
      const thumbs = await getPdfThumbnails(buf);
      setThumbnails(thumbs);
    } catch (err) {
      console.error('Failed to load PDF thumbnails:', err);
      alert('Could not render PDF pages. Check if the PDF is password-protected or corrupted.');
    } finally {
      setIsLoadingThumbs(false);
    }
  };

  const applyPreset = (p: CompressionPreset) => {
    setPreset(p);
    if (p === 'extreme') {
      setGlobalQuality(50);
      setGlobalScale(1.2);
    } else if (p === 'balanced') {
      setGlobalQuality(70);
      setGlobalScale(1.5);
    } else if (p === 'high') {
      setGlobalQuality(85);
      setGlobalScale(2.0);
    }
    setResult(null);
  };

  const setPageQualityPreset = (pageNum: number, level: 'low' | 'normal' | 'high' | 'inherit') => {
    if (level === 'inherit') {
      setPageOverrides((prev) => {
        const next = { ...prev };
        delete next[pageNum];
        return next;
      });
      return;
    }

    const configs: Record<'low' | 'normal' | 'high', PerPageCompressionConfig> = {
      low: { quality: 0.45, scale: 1.2 },
      normal: { quality: 0.70, scale: 1.5 },
      high: { quality: 0.90, scale: 2.2 },
    };

    setPageOverrides((prev) => ({
      ...prev,
      [pageNum]: configs[level],
    }));
  };

  const handleCompress = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress({ current: 0, total: thumbnails.length });

    try {
      const freshBuffer = await file.arrayBuffer();
      const compressRes = await compressPdfPerPages(
        freshBuffer,
        {
          defaultQuality: globalQuality / 100,
          defaultScale: globalScale,
          pageConfigs: pageOverrides,
        },
        (current, total, stat) => {
          setProgress({
            current,
            total,
            latestKb: stat ? Math.round(stat.compressedBytes / 1024) : undefined,
          });
        }
      );

      const blob = new Blob([compressRes.compressedBytes.buffer as ArrayBuffer], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);

      setResult(compressRes);
      setResultBlobUrl(url);
    } catch (err) {
      console.error('Per-page compression failed:', err);
      alert('Compression failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const handleDownload = () => {
    if (!result || !file) return;
    const baseName = file.name.replace(/\.pdf$/i, '');
    downloadBlob(
      result.compressedBytes,
      `${baseName}_compressed.pdf`,
      'application/pdf'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-brand-500" />
            Per-Page PDF Compressor
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Compress PDF documents with page-by-page rendering. Set global presets or fine-tune individual page quality to drastically shrink file sizes.
          </p>
        </div>

        {file && (
          <button
            onClick={() => {
              setFile(null);
              setThumbnails([]);
              setResult(null);
              setPageOverrides({});
            }}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Change PDF
          </button>
        )}
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFileSelected}
          accept="application/pdf"
          multiple={false}
          title="Upload or Drag &amp; Drop a PDF to Compress"
          subtitle="Supports scanned docs, heavy presentations, reports • 100% Client-Side"
        />
      ) : isLoadingThumbs ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <p className="text-sm font-medium">Analyzing PDF pages client-side...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Col: Visual Pages & Per-Page Controls */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-brand-500" />
                <span>Pages ({thumbnails.length})</span>
                {Object.keys(pageOverrides).length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    {Object.keys(pageOverrides).length} customized
                  </span>
                )}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Click a page to customize its individual quality
              </span>
            </div>

            {/* Thumbnails Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[560px] overflow-y-auto p-1">
              {thumbnails.map((t) => {
                const override = pageOverrides[t.pageNumber];
                const isActive = activeConfigPage === t.pageNumber;

                return (
                  <div
                    key={t.pageNumber}
                    onClick={() =>
                      setActiveConfigPage(isActive ? null : t.pageNumber)
                    }
                    className={`relative group rounded-xl p-2.5 border cursor-pointer transition-all flex flex-col justify-between text-center select-none ${
                      isActive
                        ? 'bg-brand-50/80 dark:bg-brand-950/60 border-brand-500 ring-2 ring-brand-500/20 shadow-md'
                        : override
                        ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-400'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    {/* Badge */}
                    <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                      <span className="text-slate-700 dark:text-slate-300">
                        Page {t.pageNumber}
                      </span>
                      {override ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                          {Math.round(override.quality * 100)}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          Global
                        </span>
                      )}
                    </div>

                    {/* Thumbnail Preview */}
                    <div className="w-full h-36 flex items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 border my-1">
                      <img
                        src={t.dataUrl}
                        alt={`Page ${t.pageNumber}`}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>

                    {/* Quick Per-Page Quality Switcher Buttons */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="grid grid-cols-4 gap-0.5 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px]"
                    >
                      <button
                        onClick={() => setPageQualityPreset(t.pageNumber, 'inherit')}
                        className={`py-0.5 rounded ${
                          !override
                            ? 'bg-slate-200 dark:bg-slate-700 font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'
                        }`}
                        title="Use Global Settings"
                      >
                        Auto
                      </button>
                      <button
                        onClick={() => setPageQualityPreset(t.pageNumber, 'low')}
                        className={`py-0.5 rounded ${
                          override?.quality === 0.45
                            ? 'bg-amber-500 text-white font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
                        }`}
                        title="Low Quality (Max Compression)"
                      >
                        Low
                      </button>
                      <button
                        onClick={() => setPageQualityPreset(t.pageNumber, 'normal')}
                        className={`py-0.5 rounded ${
                          override?.quality === 0.70
                            ? 'bg-brand-500 text-white font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
                        }`}
                        title="Normal Quality"
                      >
                        Med
                      </button>
                      <button
                        onClick={() => setPageQualityPreset(t.pageNumber, 'high')}
                        className={`py-0.5 rounded ${
                          override?.quality === 0.90
                            ? 'bg-emerald-500 text-white font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
                        }`}
                        title="High Quality (Crisp Vector Details)"
                      >
                        High
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Col: Compression Settings & Action */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Sliders className="w-4 h-4 text-brand-500" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  Compression Presets
                </h3>
              </div>

              {/* Preset Buttons */}
              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    id: 'extreme',
                    title: 'Extreme Compression',
                    desc: 'Smallest file size (~50% quality, 1.2x scale)',
                    icon: Zap,
                  },
                  {
                    id: 'balanced',
                    title: 'Recommended (Balanced)',
                    desc: 'Great balance of quality & size (~70% quality, 1.5x scale)',
                    icon: Sparkles,
                    popular: true,
                  },
                  {
                    id: 'high',
                    title: 'High Quality (Crisp)',
                    desc: 'Preserves sharp text (~85% quality, 2.0x scale)',
                    icon: Eye,
                  },
                  {
                    id: 'custom',
                    title: 'Custom Settings',
                    desc: 'Adjust quality slider and resolution scale',
                    icon: SlidersHorizontal,
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => applyPreset(item.id as CompressionPreset)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      preset === item.id
                        ? 'bg-brand-50 dark:bg-brand-950/80 border-brand-500 text-brand-700 dark:text-brand-300 font-semibold shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <item.icon className="w-3.5 h-3.5" />
                        {item.title}
                      </span>
                      {item.popular && (
                        <span className="text-[10px] bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300 px-1.5 py-0.2 rounded font-bold">
                          Best
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] opacity-75 block mt-0.5">
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom Sliders (shown when preset === custom) */}
              {preset === 'custom' && (
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      <span>Image Quality</span>
                      <span className="font-bold text-brand-600">{globalQuality}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="95"
                      step="5"
                      value={globalQuality}
                      onChange={(e) => setGlobalQuality(parseInt(e.target.value))}
                      className="w-full accent-brand-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      <span>Resolution Multiplier</span>
                      <span className="font-bold text-brand-600">{globalScale}x</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="2.5"
                      step="0.1"
                      value={globalScale}
                      onChange={(e) => setGlobalScale(parseFloat(e.target.value))}
                      className="w-full accent-brand-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleCompress}
                disabled={isProcessing}
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {progress
                        ? `Compressing page ${progress.current}/${progress.total} (${progress.latestKb || 0} KB)...`
                        : 'Starting compression...'}
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4" />
                    <span>Compress PDF ({thumbnails.length} Pages)</span>
                  </>
                )}
              </button>
            </div>

            {/* Compression Results Card */}
            {result && resultBlobUrl && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-5 space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  PDF Compressed Successfully!
                </div>

                <div className="bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Original Size:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {formatFileSize(result.originalSize)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Compressed Size:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatFileSize(result.compressedSize)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Space Saved:</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                      -{result.reductionPercentage}%
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleDownload}
                    className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Compressed PDF
                  </button>
                  <a
                    href={resultBlobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
