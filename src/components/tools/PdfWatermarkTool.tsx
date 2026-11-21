import React, { useState } from 'react';
import {
  Stamp,
  Download,
  Eye,
  CheckCircle2,
  Loader2,
  Type,
  FileImage,
  Layers,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import type { PdfWatermarkConfig } from '../../utils/pdfUtils';
import { watermarkPdf } from '../../utils/pdfUtils';
import { downloadBlob } from '../../utils/canvasUtils';
import { formatFileSize } from '../../utils/imageCompressor';

export const PdfWatermarkTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'text' | 'image'>('text');

  // Text settings
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(48);
  const [textColor, setTextColor] = useState('#dc2626'); // Red default
  const [rotation, setRotation] = useState(45); // 45° diagonal
  const [opacity, setOpacity] = useState(30);   // 30% default

  // Image stamp settings
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(35); // 35% default

  // Page Scope
  const [pageScope, setPageScope] = useState<'all' | 'first' | 'odd' | 'even' | 'custom'>('all');
  const [customPagesInput, setCustomPagesInput] = useState('1, 2, 3');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);

  const handlePdfSelected = (files: File[]) => {
    if (files.length === 0) return;
    setFile(files[0]);
    setResultBytes(null);
    if (resultBlobUrl) {
      URL.revokeObjectURL(resultBlobUrl);
      setResultBlobUrl(null);
    }
  };

  const handleImageStampSelected = (files: File[]) => {
    if (files.length === 0) return;
    const img = files[0];
    setImageFile(img);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(URL.createObjectURL(img));
  };

  // Convert hex color to rgb [0, 1]
  const hexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    const r = ((bigint >> 16) & 255) / 255;
    const g = ((bigint >> 8) & 255) / 255;
    const b = (bigint & 255) / 255;
    return { r, g, b };
  };

  const handleApplyWatermark = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();

      let customPages: number[] | undefined = undefined;
      if (pageScope === 'custom') {
        customPages = customPagesInput
          .split(',')
          .map((p) => parseInt(p.trim(), 10))
          .filter((n) => !isNaN(n) && n > 0);
      }

      let config: PdfWatermarkConfig;

      if (mode === 'text') {
        config = {
          type: 'text',
          text: watermarkText || 'CONFIDENTIAL',
          fontSize: fontSize,
          opacity: opacity / 100,
          rotationDegrees: rotation,
          color: hexToRgb(textColor),
          pageScope,
          customPages,
        };
      } else {
        if (!imageFile) {
          alert('Please upload an image/logo for the watermark stamp.');
          setIsProcessing(false);
          return;
        }
        const imgBuffer = await imageFile.arrayBuffer();
        const isPng = imageFile.type === 'image/png' || imageFile.name.toLowerCase().endsWith('.png');

        config = {
          type: 'image',
          imageBytes: imgBuffer,
          imageFormat: isPng ? 'png' : 'jpeg',
          scale: imageScale / 100,
          opacity: opacity / 100,
          rotationDegrees: rotation,
          pageScope,
          customPages,
        };
      }

      const watermarked = await watermarkPdf(buffer, config);
      const blob = new Blob([watermarked.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setResultBytes(watermarked);
      setResultBlobUrl(url);
    } catch (err) {
      console.error('Failed to watermark PDF:', err);
      alert('Error applying watermark. Ensure the PDF is not password-protected.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBytes || !file) return;
    const base = file.name.replace(/\.pdf$/i, '');
    downloadBlob(resultBytes, `${base}_watermarked.pdf`, 'application/pdf');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Stamp className="w-6 h-6 text-brand-500" />
            PDF Watermark &amp; Page Stamper
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Stamp security text or logo watermarks across PDF pages with customizable rotation, opacity, and scope.
          </p>
        </div>

        {file && (
          <button
            onClick={() => {
              setFile(null);
              setResultBytes(null);
              if (resultBlobUrl) URL.revokeObjectURL(resultBlobUrl);
              setResultBlobUrl(null);
            }}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Change PDF
          </button>
        )}
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handlePdfSelected}
          accept="application/pdf"
          multiple={false}
          title="Upload or Drag &amp; Drop a PDF to Watermark"
          subtitle="Supports all standard PDF documents • 100% Client-Side Processing"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Col: Watermark Configuration */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              {/* Mode Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Watermark Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMode('text')}
                    className={`py-2.5 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                      mode === 'text'
                        ? 'bg-brand-50 dark:bg-brand-950 border-brand-500 text-brand-600 dark:text-brand-300 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Type className="w-4 h-4" />
                    <span>Text Watermark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('image')}
                    className={`py-2.5 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                      mode === 'image'
                        ? 'bg-brand-50 dark:bg-brand-950 border-brand-500 text-brand-600 dark:text-brand-300 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <FileImage className="w-4 h-4" />
                    <span>Image / Logo Stamp</span>
                  </button>
                </div>
              </div>

              {/* Text Mode Settings */}
              {mode === 'text' ? (
                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Watermark Text
                    </label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      placeholder="e.g. CONFIDENTIAL, DRAFT, DO NOT COPY"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />

                    {/* Quick Suggestions */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {['CONFIDENTIAL', 'DO NOT COPY', 'DRAFT', 'APPROVED', 'SAMPLE', 'ORIGINAL'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setWatermarkText(preset)}
                          className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-md"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        <span>Font Size</span>
                        <span className="font-bold">{fontSize} pt</span>
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
                        Text Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-9 h-9 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer bg-transparent"
                        />
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                          {textColor.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Image Mode Settings */
                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Upload Stamp Image / Logo (PNG with transparency recommended)
                  </label>
                  {!imageFile ? (
                    <DropZone
                      onFilesSelected={handleImageStampSelected}
                      accept="image/png,image/jpeg"
                      multiple={false}
                      compact={true}
                      title="Select stamp image / signature logo"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                      {imagePreviewUrl && (
                        <img
                          src={imagePreviewUrl}
                          alt="Stamp Preview"
                          className="w-16 h-16 object-contain rounded-lg border bg-white"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {imageFile.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {formatFileSize(imageFile.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                          setImagePreviewUrl(null);
                        }}
                        className="px-2.5 py-1 text-xs text-rose-500 hover:bg-rose-50 rounded-lg"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {imageFile && (
                    <div>
                      <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        <span>Image Stamp Scale</span>
                        <span className="font-bold">{imageScale}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="90"
                        value={imageScale}
                        onChange={(e) => setImageScale(parseInt(e.target.value))}
                        className="w-full accent-brand-500 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Shared Settings: Opacity & Rotation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
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
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>Faint (10%)</span>
                    <span>Subtle (30%)</span>
                    <span>Solid (100%)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <span>Rotation Angle</span>
                    <span className="font-bold">{rotation}°</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="-90"
                      max="90"
                      step="5"
                      value={rotation}
                      onChange={(e) => setRotation(parseInt(e.target.value))}
                      className="flex-1 accent-brand-500 cursor-pointer"
                    />
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setRotation(45)}
                        className={`px-2 py-1 text-[11px] rounded border font-semibold ${
                          rotation === 45 ? 'bg-brand-50 border-brand-500 text-brand-600' : ''
                        }`}
                      >
                        45°
                      </button>
                      <button
                        type="button"
                        onClick={() => setRotation(0)}
                        className={`px-2 py-1 text-[11px] rounded border font-semibold ${
                          rotation === 0 ? 'bg-brand-50 border-brand-500 text-brand-600' : ''
                        }`}
                      >
                        0°
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Scope, Action & Output */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Layers className="w-4 h-4 text-brand-500" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  Page Application Scope
                </h3>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Apply To Pages
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'all', label: 'All Pages' },
                    { id: 'first', label: 'First Page Only' },
                    { id: 'odd', label: 'Odd Pages' },
                    { id: 'even', label: 'Even Pages' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setPageScope(s.id as any)}
                      className={`py-2 px-3 rounded-xl border text-center font-semibold transition-all ${
                        pageScope === s.id
                          ? 'bg-brand-50 dark:bg-brand-950 border-brand-500 text-brand-600 dark:text-brand-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setPageScope('custom')}
                  className={`w-full mt-2 py-1.5 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                    pageScope === 'custom'
                      ? 'bg-brand-50 dark:bg-brand-950 border-brand-500 text-brand-600 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Custom Page List
                </button>

                {pageScope === 'custom' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={customPagesInput}
                      onChange={(e) => setCustomPagesInput(e.target.value)}
                      placeholder="e.g. 1, 3, 5, 8"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border rounded-lg font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Comma separated page numbers
                    </span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleApplyWatermark}
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
                    <span>Stamp &amp; Apply Watermark</span>
                  </>
                )}
              </button>
            </div>

            {/* Success Card */}
            {resultBytes && resultBlobUrl && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-5 space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Watermark Applied Successfully!
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Size: <span className="font-semibold">{formatFileSize(resultBytes.length)}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleDownload}
                    className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
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
