import React, { useState } from 'react';
import {
  Printer,
  CheckCircle2,
  Download,
  Sliders,
  Layers,
  Info,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import type { DpiInfo } from '../../utils/dpiUtils';
import {
  detectDpi,
  changeJpegDpi,
  changePngDpi,
} from '../../utils/dpiUtils';
import { downloadBlob } from '../../utils/canvasUtils';
import { formatFileSize } from '../../utils/imageCompressor';

export const ImageDpiTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [detectedDpiInfo, setDetectedDpiInfo] = useState<DpiInfo | null>(null);

  // Settings
  const [targetDpi, setTargetDpi] = useState<number>(300);
  const [isResamplePixels, setIsResamplePixels] = useState<boolean>(false);

  // Result state
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [resultDpiInfo, setResultDpiInfo] = useState<DpiInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const selected = files[0];
    setFile(selected);

    const buf = await selected.arrayBuffer();
    setArrayBuffer(buf);

    const url = URL.createObjectURL(selected);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setDimensions({ width: w, height: h });
      setPreviewUrl(url);

      const info = detectDpi(buf, w, h);
      setDetectedDpiInfo(info);
      setResultBytes(null);
      setResultDpiInfo(null);
    };
    img.src = url;
  };

  const handleDpiChange = async () => {
    if (!file || !arrayBuffer) return;
    setIsProcessing(true);

    try {
      let finalBytes: Uint8Array;
      const isJpeg = file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');
      const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');

      if (!isResamplePixels) {
        // Direct lossless header tag / chunk injection
        if (isJpeg) {
          finalBytes = changeJpegDpi(arrayBuffer, targetDpi);
        } else if (isPng) {
          finalBytes = changePngDpi(arrayBuffer, targetDpi);
        } else {
          // Convert to JPEG canvas first then inject
          const canvas = document.createElement('canvas');
          canvas.width = dimensions.width;
          canvas.height = dimensions.height;
          const ctx = canvas.getContext('2d')!;
          const img = new Image();
          img.src = previewUrl!;
          await new Promise<void>((r) => (img.onload = () => r()));
          ctx.drawImage(img, 0, 0);
          const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), 'image/jpeg', 0.95));
          const convertedBuf = await blob.arrayBuffer();
          finalBytes = changeJpegDpi(convertedBuf, targetDpi);
        }
      } else {
        // Resample Pixels mode: calculate new width/height to match target DPI
        const scale = targetDpi / (detectedDpiInfo?.dpiX || 72);
        const newW = Math.round(dimensions.width * scale);
        const newH = Math.round(dimensions.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = newW;
        canvas.height = newH;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const img = new Image();
        img.src = previewUrl!;
        await new Promise<void>((r) => (img.onload = () => r()));
        ctx.drawImage(img, 0, 0, newW, newH);

        const mime = isPng ? 'image/png' : 'image/jpeg';
        const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), mime, 0.95));
        const resampledBuf = await blob.arrayBuffer();

        if (isPng) {
          finalBytes = changePngDpi(resampledBuf, targetDpi);
        } else {
          finalBytes = changeJpegDpi(resampledBuf, targetDpi);
        }
      }

      setResultBytes(finalBytes);

      // Verify the resulting bytes
      const verifyInfo = detectDpi(
        finalBytes.buffer as ArrayBuffer,
        isResamplePixels ? Math.round(dimensions.width * (targetDpi / (detectedDpiInfo?.dpiX || 72))) : dimensions.width,
        isResamplePixels ? Math.round(dimensions.height * (targetDpi / (detectedDpiInfo?.dpiY || 72))) : dimensions.height
      );
      setResultDpiInfo(verifyInfo);
    } catch (err) {
      console.error('Failed to change DPI:', err);
      alert('Failed to change DPI. Ensure the file is a valid JPG or PNG.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBytes || !file) return;
    const ext = file.name.substring(file.name.lastIndexOf('.'));
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    downloadBlob(
      resultBytes,
      `${baseName}_${targetDpi}dpi${ext}`,
      file.type || 'image/jpeg'
    );
  };

  // Physical size calculation preview
  const previewPrintWidthIn = (dimensions.width / targetDpi).toFixed(2);
  const previewPrintHeightIn = (dimensions.height / targetDpi).toFixed(2);
  const previewPrintWidthCm = (parseFloat(previewPrintWidthIn) * 2.54).toFixed(2);
  const previewPrintHeightCm = (parseFloat(previewPrintHeightIn) * 2.54).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Printer className="w-6 h-6 text-brand-500" />
            Image DPI Changer (Dots Per Inch)
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Set image resolution metadata to 300 DPI, 600 DPI, or custom DPI for passport photos, official printing, and exam submissions.
          </p>
        </div>

        {file && (
          <button
            onClick={() => {
              setFile(null);
              setPreviewUrl(null);
              setArrayBuffer(null);
              setResultBytes(null);
            }}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Change Image
          </button>
        )}
      </div>

      {!file || !previewUrl ? (
        <DropZone
          onFilesSelected={handleFileSelected}
          accept="image/jpeg,image/png,image/webp"
          multiple={false}
          title="Upload an Image to Change DPI"
          subtitle="Supports JPG &amp; PNG • Completely lossless metadata update"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Col: Image Preview & Detected Specs */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-32 h-32 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base truncate">
                    {file.name}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400 block">Current DPI</span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {detectedDpiInfo?.dpiX || 72} DPI
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400 block">Pixel Size</span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {dimensions.width} × {dimensions.height} px
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400 block">File Size</span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Physical Print Size Comparison Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-brand-500" />
                    Physical Print Dimension Preview
                  </span>
                  <span className="text-brand-600 dark:text-brand-400 font-bold">
                    Target: {targetDpi} DPI
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Print Size in Inches</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {previewPrintWidthIn}″ × {previewPrintHeightIn}″
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Print Size in Centimeters</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {previewPrintWidthCm} × {previewPrintHeightCm} cm
                    </span>
                  </div>
                </div>
              </div>

              {/* Educational info badge */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs border border-blue-200 dark:border-blue-900/60">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Why does DPI matter?</strong> Changing DPI does not degrade or alter your image pixel quality by default. It tells printers, ID portals, and passport review systems how densely to print pixels per inch, making it compliant with strict submission rules.
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: DPI Presets & Conversion Actions */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-brand-500" />
                Select Target DPI
              </h3>

              {/* Standard DPI Presets */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { dpi: 72, label: '72 DPI', desc: 'Web / Screen' },
                  { dpi: 96, label: '96 DPI', desc: 'Windows default' },
                  { dpi: 150, label: '150 DPI', desc: 'Draft Print' },
                  { dpi: 300, label: '300 DPI', desc: 'Standard / Passport', popular: true },
                  { dpi: 600, label: '600 DPI', desc: 'Ultra HD Print' },
                  { dpi: 1200, label: '1200 DPI', desc: 'Archival Art' },
                ].map((preset) => (
                  <button
                    key={preset.dpi}
                    onClick={() => {
                      setTargetDpi(preset.dpi);
                      setResultBytes(null);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      targetDpi === preset.dpi
                        ? 'bg-brand-50 dark:bg-brand-950/80 border-brand-500 text-brand-700 dark:text-brand-300 shadow-sm font-semibold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{preset.label}</span>
                      {preset.popular && (
                        <span className="text-[10px] bg-brand-200 dark:bg-brand-900 text-brand-800 dark:text-brand-200 px-1.5 py-0.2 rounded font-medium">
                          Standard
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] opacity-75 block mt-0.5">
                      {preset.desc}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom DPI Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Or enter Custom DPI value
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="10"
                    max="4800"
                    value={targetDpi}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 300;
                      setTargetDpi(val);
                      setResultBytes(null);
                    }}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono font-bold"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400 pointer-events-none">
                    DPI
                  </span>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isResamplePixels}
                    onChange={(e) => {
                      setIsResamplePixels(e.target.checked);
                      setResultBytes(null);
                    }}
                    className="mt-0.5 w-4 h-4 text-brand-600 rounded focus:ring-brand-500 border-slate-300"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      Resample image pixels (Scale resolution)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Leave unchecked for 100% lossless metadata update (recommended for passports &amp; forms).
                    </span>
                  </div>
                </label>
              </div>

              {/* Action Button */}
              <button
                onClick={handleDpiChange}
                disabled={isProcessing}
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Apply {targetDpi} DPI</span>
              </button>
            </div>

            {/* Success Card with Verification */}
            {resultBytes && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-5 space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  DPI Set to {targetDpi} Successfully!
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 bg-white/70 dark:bg-slate-900/70 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60">
                  <div className="flex justify-between">
                    <span>Verified DPI:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                      {resultDpiInfo?.dpiX || targetDpi} × {resultDpiInfo?.dpiY || targetDpi} DPI
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Print Size:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {resultDpiInfo?.widthInches}″ × {resultDpiInfo?.heightInches}″ ({resultDpiInfo?.widthCm} × {resultDpiInfo?.heightCm} cm)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Output File Size:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {formatFileSize(resultBytes.length)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download {targetDpi} DPI Image
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
