import React, { useState } from 'react';
import {
  Sliders,
  Download,
  CheckCircle2,
  Loader2,
  Sparkles,
  RotateCcw as ResetIcon,
  Palette,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import type { ImageFilterOptions } from '../../utils/canvasUtils';
import {
  applyImageFilters,
  downloadBlob,
} from '../../utils/canvasUtils';
import { formatFileSize } from '../../utils/imageCompressor';

const DEFAULT_FILTERS: ImageFilterOptions = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: 0,
  sepia: 0,
  invert: 0,
  hueRotate: 0,
  blur: 0,
};

export const ImageFiltersTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [filters, setFilters] = useState<ImageFilterOptions>(DEFAULT_FILTERS);

  // Split view toggle (before vs after preview)
  const [showOriginal, setShowOriginal] = useState(false);

  // Processing & result
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    blob: Blob;
    dataUrl: string;
    width: number;
    height: number;
  } | null>(null);

  const handleImageSelected = (files: File[]) => {
    if (files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(URL.createObjectURL(selected));
    setFilters(DEFAULT_FILTERS);
    setResult(null);
  };

  const applyPreset = (presetName: string) => {
    setResult(null);
    switch (presetName) {
      case 'vibrant':
        setFilters({ ...DEFAULT_FILTERS, contrast: 115, saturation: 140, brightness: 105 });
        break;
      case 'vintage':
        setFilters({ ...DEFAULT_FILTERS, sepia: 60, contrast: 110, brightness: 95, saturation: 85 });
        break;
      case 'bw':
        setFilters({ ...DEFAULT_FILTERS, grayscale: 100, contrast: 125 });
        break;
      case 'cool':
        setFilters({ ...DEFAULT_FILTERS, hueRotate: 190, saturation: 110, brightness: 102 });
        break;
      case 'warm':
        setFilters({ ...DEFAULT_FILTERS, sepia: 30, saturation: 120, brightness: 105 });
        break;
      case 'dramatic':
        setFilters({ ...DEFAULT_FILTERS, contrast: 150, brightness: 90, saturation: 120 });
        break;
      case 'invert':
        setFilters({ ...DEFAULT_FILTERS, invert: 100 });
        break;
      default:
        setFilters(DEFAULT_FILTERS);
    }
  };

  const handleExport = async () => {
    if (!file || !imagePreviewUrl) return;
    setIsProcessing(true);

    try {
      const res = await applyImageFilters(imagePreviewUrl, {
        ...filters,
        format: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
      });
      setResult(res);
    } catch (err) {
      console.error('Failed to export image with filters:', err);
      alert('Error applying filters.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result || !file) return;
    const base = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const ext = file.type === 'image/png' ? 'png' : 'jpg';
    downloadBlob(result.blob, `${base}_adjusted.${ext}`);
  };

  // Build live CSS filter string for instantaneous real-time preview
  const liveFilterString = [
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-6 h-6 text-brand-500" />
            Image Color Adjustments &amp; Filters
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tune brightness, contrast, saturation, and apply vintage, B&amp;W, and vibrant presets with real-time hardware-accelerated preview.
          </p>
        </div>

        {file && (
          <button
            onClick={() => {
              setFile(null);
              if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
              setImagePreviewUrl(null);
              setResult(null);
            }}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Change Image
          </button>
        )}
      </div>

      {!file || !imagePreviewUrl ? (
        <DropZone
          onFilesSelected={handleImageSelected}
          accept="image/*"
          multiple={false}
          title="Upload or Drag &amp; Drop an Image to Edit Colors"
          subtitle="Supports JPG, PNG, WEBP, BMP"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Col: Live Preview Canvas */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900/90 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[460px] relative overflow-hidden select-none border border-slate-800 shadow-inner">
              <img
                src={imagePreviewUrl}
                alt="Filter preview"
                className="max-h-[500px] w-auto max-w-full object-contain rounded-lg transition-all duration-75"
                style={{
                  filter: showOriginal ? 'none' : liveFilterString,
                }}
              />

              {/* Hold to compare button */}
              <button
                type="button"
                onMouseDown={() => setShowOriginal(true)}
                onMouseUp={() => setShowOriginal(false)}
                onTouchStart={() => setShowOriginal(true)}
                onTouchEnd={() => setShowOriginal(false)}
                className="absolute top-4 right-4 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-950/80 text-white backdrop-blur border border-slate-700 hover:bg-slate-900"
              >
                {showOriginal ? 'Showing Original' : 'Hold to View Original'}
              </button>

              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-slate-300 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800">
                <span>{file.name}</span>
                <span className="text-slate-400 font-mono">
                  {showOriginal ? 'Original Colors' : 'Adjusted Preview'}
                </span>
              </div>
            </div>

            {/* Ready to Download Bar */}
            {result && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-4 flex items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Enhanced Image Ready ({formatFileSize(result.blob.size)})</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Image
                </button>
              </div>
            )}
          </div>

          {/* Right Col: Preset Buttons & Sliders */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              {/* Presets Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                    <span>Quick Filter Presets</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
                  >
                    <ResetIcon className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {[
                    { id: 'vibrant', label: 'Vibrant' },
                    { id: 'vintage', label: 'Vintage' },
                    { id: 'bw', label: 'B&W Film' },
                    { id: 'cool', label: 'Cool Tone' },
                    { id: 'warm', label: 'Warm Tone' },
                    { id: 'dramatic', label: 'Dramatic' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p.id)}
                      className="py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-brand-500 hover:text-brand-600 font-semibold text-center transition-colors text-slate-700 dark:text-slate-300"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-3.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                {/* Brightness */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <span>Brightness</span>
                    <span className="font-bold">{filters.brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={filters.brightness}
                    onChange={(e) => {
                      setFilters({ ...filters, brightness: parseInt(e.target.value) });
                      setResult(null);
                    }}
                    className="w-full accent-brand-500 cursor-pointer"
                  />
                </div>

                {/* Contrast */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <span>Contrast</span>
                    <span className="font-bold">{filters.contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={filters.contrast}
                    onChange={(e) => {
                      setFilters({ ...filters, contrast: parseInt(e.target.value) });
                      setResult(null);
                    }}
                    className="w-full accent-brand-500 cursor-pointer"
                  />
                </div>

                {/* Saturation */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <span>Saturation</span>
                    <span className="font-bold">{filters.saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={filters.saturation}
                    onChange={(e) => {
                      setFilters({ ...filters, saturation: parseInt(e.target.value) });
                      setResult(null);
                    }}
                    className="w-full accent-brand-500 cursor-pointer"
                  />
                </div>

                {/* Grayscale */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <span>Grayscale</span>
                    <span className="font-bold">{filters.grayscale}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.grayscale}
                    onChange={(e) => {
                      setFilters({ ...filters, grayscale: parseInt(e.target.value) });
                      setResult(null);
                    }}
                    className="w-full accent-brand-500 cursor-pointer"
                  />
                </div>

                {/* Sepia */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <span>Sepia Tone</span>
                    <span className="font-bold">{filters.sepia}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.sepia}
                    onChange={(e) => {
                      setFilters({ ...filters, sepia: parseInt(e.target.value) });
                      setResult(null);
                    }}
                    className="w-full accent-brand-500 cursor-pointer"
                  />
                </div>

                {/* Hue Rotate */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <span>Hue Rotation</span>
                    <span className="font-bold">{filters.hueRotate}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={filters.hueRotate}
                    onChange={(e) => {
                      setFilters({ ...filters, hueRotate: parseInt(e.target.value) });
                      setResult(null);
                    }}
                    className="w-full accent-brand-500 cursor-pointer"
                  />
                </div>

                {/* Blur */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <span>Soft Blur</span>
                    <span className="font-bold">{filters.blur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    value={filters.blur}
                    onChange={(e) => {
                      setFilters({ ...filters, blur: parseInt(e.target.value) });
                      setResult(null);
                    }}
                    className="w-full accent-brand-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleExport}
                disabled={isProcessing}
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Applying Adjustments...</span>
                  </>
                ) : (
                  <>
                    <Palette className="w-4 h-4" />
                    <span>Apply &amp; Export Image</span>
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
