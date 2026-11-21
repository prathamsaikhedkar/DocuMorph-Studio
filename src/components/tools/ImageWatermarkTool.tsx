import React, { useState } from 'react';
import {
  Stamp,
  Download,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import type {
  ImageWatermarkOptions,
  WatermarkPosition,
} from '../../utils/canvasUtils';
import {
  applyImageWatermark,
  downloadBlob,
} from '../../utils/canvasUtils';
import { formatFileSize } from '../../utils/imageCompressor';

export const ImageWatermarkTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Watermark parameters
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('CONFIDENTIAL');
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(40);
  const [rotation, setRotation] = useState(-30);
  const [position, setPosition] = useState<WatermarkPosition>('center');

  // Stamp logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoScale, setLogoScale] = useState(25);

  // Result
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    blob: Blob;
    dataUrl: string;
    width: number;
    height: number;
  } | null>(null);

  const handleBaseImageSelected = (files: File[]) => {
    if (files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(URL.createObjectURL(selected));
    setResult(null);
  };

  const handleLogoSelected = (files: File[]) => {
    if (files.length === 0) return;
    const selected = files[0];
    setLogoFile(selected);
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoPreviewUrl(URL.createObjectURL(selected));
  };

  const handleApply = async () => {
    if (!file || !imagePreviewUrl) return;
    setIsProcessing(true);

    try {
      const options: ImageWatermarkOptions = {
        type: mode,
        text,
        textColor,
        fontSize,
        opacity: opacity / 100,
        rotation,
        position,
        watermarkImageSrc: logoPreviewUrl || undefined,
        watermarkScale: logoScale / 100,
        format: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
      };

      const res = await applyImageWatermark(imagePreviewUrl, options);
      setResult(res);
    } catch (err) {
      console.error('Failed to watermark image:', err);
      alert('Error applying watermark to image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result || !file) return;
    const base = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const ext = file.type === 'image/png' ? 'png' : 'jpg';
    downloadBlob(result.blob, `${base}_watermarked.${ext}`);
  };

  const POSITIONS: Array<{ id: WatermarkPosition; label: string }> = [
    { id: 'top-left', label: 'TL' },
    { id: 'top-center', label: 'TC' },
    { id: 'top-right', label: 'TR' },
    { id: 'center-left', label: 'CL' },
    { id: 'center', label: 'Center' },
    { id: 'center-right', label: 'CR' },
    { id: 'bottom-left', label: 'BL' },
    { id: 'bottom-center', label: 'BC' },
    { id: 'bottom-right', label: 'BR' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Stamp className="w-6 h-6 text-brand-500" />
            Image Watermark &amp; Signature Stamper
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Stamp copyright text, signatures, or logos onto photos with custom transparency, position anchor, or repeating tiles.
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
          onFilesSelected={handleBaseImageSelected}
          accept="image/*"
          multiple={false}
          title="Upload or Drag &amp; Drop an Image to Watermark"
          subtitle="Supports JPG, PNG, WEBP, BMP"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Col: Live Preview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900/90 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[460px] relative overflow-hidden select-none border border-slate-800 shadow-inner">
              <img
                src={result ? result.dataUrl : imagePreviewUrl}
                alt="Watermarked Preview"
                className="max-h-[500px] w-auto max-w-full object-contain rounded-lg"
              />

              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-slate-300 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800">
                <span>
                  Original: {file.name} ({formatFileSize(file.size)})
                </span>
                {result && (
                  <span className="font-semibold text-emerald-400">
                    Watermarked Ready ({result.width} × {result.height} px)
                  </span>
                )}
              </div>
            </div>

            {/* Success Card */}
            {result && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-4 flex items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Watermarked Image Ready! ({formatFileSize(result.blob.size)})</span>
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

          {/* Right Col: Controls */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setMode('text')}
                  className={`py-2 text-xs font-bold rounded-lg border text-center transition-all ${
                    mode === 'text'
                      ? 'bg-brand-50 dark:bg-brand-950 border-brand-500 text-brand-600 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600'
                  }`}
                >
                  Text Watermark
                </button>
                <button
                  type="button"
                  onClick={() => setMode('image')}
                  className={`py-2 text-xs font-bold rounded-lg border text-center transition-all ${
                    mode === 'image'
                      ? 'bg-brand-50 dark:bg-brand-950 border-brand-500 text-brand-600 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600'
                  }`}
                >
                  Logo / Stamp
                </button>
              </div>

              {mode === 'text' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Text
                    </label>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="e.g. © 2026 Studio"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        <span>Font Size</span>
                        <span className="font-bold">{fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="16"
                        max="120"
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value))}
                        className="w-full accent-brand-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border"
                        />
                        <span className="text-xs font-mono font-bold">{textColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Select Stamp / Signature PNG
                  </label>
                  {!logoFile ? (
                    <DropZone
                      onFilesSelected={handleLogoSelected}
                      accept="image/png,image/jpeg"
                      compact={true}
                      title="Select Logo/Stamp"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border">
                      {logoPreviewUrl && (
                        <img
                          src={logoPreviewUrl}
                          alt="Logo"
                          className="w-12 h-12 object-contain bg-white rounded border"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{logoFile.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setLogoFile(null);
                          if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
                          setLogoPreviewUrl(null);
                        }}
                        className="text-xs text-rose-500"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      <span>Scale</span>
                      <span className="font-bold">{logoScale}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={logoScale}
                      onChange={(e) => setLogoScale(parseInt(e.target.value))}
                      className="w-full accent-brand-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Position Grid */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Placement Anchor
                  </label>
                  <button
                    type="button"
                    onClick={() => setPosition('tile')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      position === 'tile'
                        ? 'bg-brand-50 border-brand-500 text-brand-600'
                        : 'text-slate-500'
                    }`}
                  >
                    Repeat Tile Pattern
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {POSITIONS.map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setPosition(pos.id)}
                      className={`py-1.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                        position === pos.id
                          ? 'bg-brand-50 dark:bg-brand-950 border-brand-500 text-brand-600 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Opacity & Rotation */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span>Opacity</span>
                    <span className="font-bold">{opacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={opacity}
                    onChange={(e) => setOpacity(parseInt(e.target.value))}
                    className="w-full accent-brand-500 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span>Rotation</span>
                    <span className="font-bold">{rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="-90"
                    max="90"
                    step="5"
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value))}
                    className="w-full accent-brand-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleApply}
                disabled={isProcessing}
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Applying Watermark...</span>
                  </>
                ) : (
                  <>
                    <Stamp className="w-4 h-4" />
                    <span>Stamp Watermark</span>
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
