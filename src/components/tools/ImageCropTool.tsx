import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Download,
  RotateCcw as ResetIcon,
  Check,
  Maximize2,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import type { CropRect } from '../../utils/canvasUtils';
import { processImageTransform, downloadBlob } from '../../utils/canvasUtils';
import { formatFileSize } from '../../utils/imageCompressor';

type AspectPreset = 'free' | '1:1' | '4:3' | '16:9' | '9:16' | '3:2' | 'custom';

export const ImageCropTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Transform states
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  // Aspect ratio
  const [aspectPreset, setAspectPreset] = useState<AspectPreset>('free');
  const [customRatioW, setCustomRatioW] = useState<number>(16);
  const [customRatioH, setCustomRatioH] = useState<number>(9);

  // Normalized crop box in percentage (0 to 100)
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 10,
    y: 10,
    w: 80,
    h: 80,
  });

  // Output settings
  const [outputFormat, setOutputFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');
  const [outputQuality, setOutputQuality] = useState<number>(0.92);

  // Result state
  const [processedResult, setProcessedResult] = useState<{
    blob: Blob;
    dataUrl: string;
    width: number;
    height: number;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Container refs for mouse / touch dragging
  const containerRef = useRef<HTMLDivElement>(null);
  const dragInfoRef = useRef<{
    isDragging: boolean;
    dragType: 'move' | 'tl' | 'tr' | 'bl' | 'br' | null;
    startX: number;
    startY: number;
    initialBox: { x: number; y: number; w: number; h: number };
  }>({
    isDragging: false,
    dragType: null,
    startX: 0,
    startY: 0,
    initialBox: { x: 10, y: 10, w: 80, h: 80 },
  });

  const handleFileSelected = (files: File[]) => {
    if (files.length === 0) return;
    const selected = files[0];
    setFile(selected);

    const url = URL.createObjectURL(selected);
    const img = new Image();
    img.onload = () => {
      setNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setImgSrc(url);
      setCropBox({ x: 5, y: 5, w: 90, h: 90 });
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setAspectPreset('free');
      setProcessedResult(null);
    };
    img.src = url;
  };

  const resetAll = () => {
    setCropBox({ x: 5, y: 5, w: 90, h: 90 });
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setAspectPreset('free');
    setProcessedResult(null);
  };

  // Get active ratio value (width / height) or null if free
  const getActiveRatio = useCallback((): number | null => {
    if (aspectPreset === 'free') return null;
    if (aspectPreset === '1:1') return 1;
    if (aspectPreset === '4:3') return 4 / 3;
    if (aspectPreset === '16:9') return 16 / 9;
    if (aspectPreset === '9:16') return 9 / 16;
    if (aspectPreset === '3:2') return 3 / 2;
    if (aspectPreset === 'custom') {
      const w = Number(customRatioW);
      const h = Number(customRatioH);
      return w > 0 && h > 0 ? w / h : 1;
    }
    return null;
  }, [aspectPreset, customRatioW, customRatioH]);

  // Apply ratio constraint to crop box
  const applyRatioToBox = useCallback((ratio: number | null) => {
    if (!ratio || naturalDimensions.width === 0) return;

    setCropBox((prev) => {
      const imgAspect = naturalDimensions.width / naturalDimensions.height;
      // In percentage terms: (boxW / 100 * natW) / (boxH / 100 * natH) = ratio
      // => boxW / boxH = ratio / imgAspect
      const targetPercentRatio = ratio / imgAspect;

      let newW = prev.w;
      let newH = newW / targetPercentRatio;

      if (newH > 90) {
        newH = 90;
        newW = newH * targetPercentRatio;
      }
      if (newW > 90) {
        newW = 90;
        newH = newW / targetPercentRatio;
      }

      const newX = Math.max(0, Math.min(prev.x, 100 - newW));
      const newY = Math.max(0, Math.min(prev.y, 100 - newH));

      return {
        x: Number(newX.toFixed(2)),
        y: Number(newY.toFixed(2)),
        w: Number(newW.toFixed(2)),
        h: Number(newH.toFixed(2)),
      };
    });
  }, [naturalDimensions]);

  // Handle aspect preset change
  const handlePresetChange = (preset: AspectPreset) => {
    setAspectPreset(preset);
    let ratio: number | null = null;
    if (preset === '1:1') ratio = 1;
    if (preset === '4:3') ratio = 4 / 3;
    if (preset === '16:9') ratio = 16 / 9;
    if (preset === '9:16') ratio = 9 / 16;
    if (preset === '3:2') ratio = 3 / 2;
    if (preset === 'custom') {
      const w = Number(customRatioW);
      const h = Number(customRatioH);
      ratio = w > 0 && h > 0 ? w / h : 1;
    }
    applyRatioToBox(ratio);
    setProcessedResult(null);
  };

  // Mouse / Touch handlers for dragging crop box & handles
  const handleStartDrag = (
    e: React.MouseEvent | React.TouchEvent,
    dragType: 'move' | 'tl' | 'tr' | 'bl' | 'br'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragInfoRef.current = {
      isDragging: true,
      dragType,
      startX: clientX,
      startY: clientY,
      initialBox: { ...cropBox },
    };
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const info = dragInfoRef.current;
      if (!info.isDragging || !info.dragType || !containerRef.current) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaXPercent = ((clientX - info.startX) / rect.width) * 100;
      const deltaYPercent = ((clientY - info.startY) / rect.height) * 100;

      const init = info.initialBox;
      const ratio = getActiveRatio();
      const imgAspect = naturalDimensions.width / naturalDimensions.height;
      const targetPercentRatio = ratio ? ratio / imgAspect : null;

      let newBox = { ...init };

      if (info.dragType === 'move') {
        newBox.x = Math.max(0, Math.min(init.x + deltaXPercent, 100 - init.w));
        newBox.y = Math.max(0, Math.min(init.y + deltaYPercent, 100 - init.h));
      } else if (info.dragType === 'br') {
        let newW = Math.max(10, Math.min(init.w + deltaXPercent, 100 - init.x));
        let newH = Math.max(10, Math.min(init.h + deltaYPercent, 100 - init.y));
        if (targetPercentRatio) {
          newH = newW / targetPercentRatio;
          if (init.y + newH > 100) {
            newH = 100 - init.y;
            newW = newH * targetPercentRatio;
          }
        }
        newBox.w = newW;
        newBox.h = newH;
      } else if (info.dragType === 'tl') {
        let newX = Math.max(0, Math.min(init.x + deltaXPercent, init.x + init.w - 10));
        let newY = Math.max(0, Math.min(init.y + deltaYPercent, init.y + init.h - 10));
        let newW = init.w - (newX - init.x);
        let newH = init.h - (newY - init.y);

        if (targetPercentRatio) {
          newH = newW / targetPercentRatio;
          newY = init.y + (init.h - newH);
          if (newY < 0) {
            newY = 0;
            newH = init.y + init.h;
            newW = newH * targetPercentRatio;
            newX = init.x + (init.w - newW);
          }
        }
        newBox.x = newX;
        newBox.y = newY;
        newBox.w = newW;
        newBox.h = newH;
      } else if (info.dragType === 'tr') {
        let newY = Math.max(0, Math.min(init.y + deltaYPercent, init.y + init.h - 10));
        let newW = Math.max(10, Math.min(init.w + deltaXPercent, 100 - init.x));
        let newH = init.h - (newY - init.y);

        if (targetPercentRatio) {
          newH = newW / targetPercentRatio;
          newY = init.y + (init.h - newH);
        }
        newBox.y = Math.max(0, newY);
        newBox.w = newW;
        newBox.h = newH;
      } else if (info.dragType === 'bl') {
        let newX = Math.max(0, Math.min(init.x + deltaXPercent, init.x + init.w - 10));
        let newW = init.w - (newX - init.x);
        let newH = Math.max(10, Math.min(init.h + deltaYPercent, 100 - init.y));

        if (targetPercentRatio) {
          newH = newW / targetPercentRatio;
        }
        newBox.x = newX;
        newBox.w = newW;
        newBox.h = Math.min(100 - init.y, newH);
      }

      setCropBox(newBox);
      setProcessedResult(null);
    };

    const handleEnd = () => {
      dragInfoRef.current.isDragging = false;
      dragInfoRef.current.dragType = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [cropBox, naturalDimensions, getActiveRatio]);

  // Compute selected pixel rectangle
  const currentPixelCrop: CropRect = {
    x: Math.round((cropBox.x / 100) * naturalDimensions.width),
    y: Math.round((cropBox.y / 100) * naturalDimensions.height),
    width: Math.max(1, Math.round((cropBox.w / 100) * naturalDimensions.width)),
    height: Math.max(1, Math.round((cropBox.h / 100) * naturalDimensions.height)),
  };

  // Execute crop & transform
  const handleApplyCrop = async () => {
    if (!imgSrc || !file) return;
    setIsProcessing(true);

    try {
      const res = await processImageTransform(imgSrc, {
        crop: currentPixelCrop,
        rotation,
        flipH,
        flipV,
        format: outputFormat,
        quality: outputQuality,
      });
      setProcessedResult(res);
    } catch (err) {
      console.error('Crop processing failed:', err);
      alert('Error while processing crop.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedResult || !file) return;
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const ext = outputFormat === 'image/jpeg' ? 'jpg' : outputFormat === 'image/png' ? 'png' : 'webp';
    downloadBlob(processedResult.blob, `${baseName}_cropped.${ext}`, outputFormat);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Crop className="w-6 h-6 text-brand-500" />
            Custom Ratio Image Cropper
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Crop images with precision using interactive aspect ratios, custom presets, rotation, and flipping.
          </p>
        </div>

        {file && (
          <button
            onClick={() => {
              setFile(null);
              setImgSrc(null);
              setProcessedResult(null);
            }}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Choose Another Image
          </button>
        )}
      </div>

      {!file || !imgSrc ? (
        <DropZone
          onFilesSelected={handleFileSelected}
          accept="image/*"
          multiple={false}
          title="Upload or Drag &amp; Drop an Image to Crop"
          subtitle="Supports JPG, PNG, WEBP, GIF, SVG, BMP"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Visual Cropping Canvas / Preview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900/90 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[460px] relative overflow-hidden select-none border border-slate-800 shadow-inner">
              {/* Image & Interactive Crop Overlay */}
              <div
                ref={containerRef}
                className="relative max-w-full max-h-[500px] inline-block touch-none"
              >
                <img
                  src={imgSrc}
                  alt="Source"
                  className="max-h-[500px] w-auto max-w-full object-contain pointer-events-none rounded-lg"
                  style={{
                    transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                    transition: 'transform 0.15s ease-out',
                  }}
                />

                {/* Darkened Mask outside the crop area */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(transparent, rgba(0,0,0,0.5))`,
                  }}
                />

                {/* Interactive Crop Box */}
                <div
                  onMouseDown={(e) => handleStartDrag(e, 'move')}
                  onTouchStart={(e) => handleStartDrag(e, 'move')}
                  className="absolute border-2 border-brand-400 bg-brand-500/10 cursor-move shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] backdrop-brightness-110"
                  style={{
                    left: `${cropBox.x}%`,
                    top: `${cropBox.y}%`,
                    width: `${cropBox.w}%`,
                    height: `${cropBox.h}%`,
                  }}
                >
                  {/* Grid Lines (Rule of Thirds) */}
                  <div className="w-full h-full grid grid-cols-3 grid-rows-3 pointer-events-none">
                    <div className="border-r border-b border-brand-300/30" />
                    <div className="border-r border-b border-brand-300/30" />
                    <div className="border-b border-brand-300/30" />
                    <div className="border-r border-b border-brand-300/30" />
                    <div className="border-r border-b border-brand-300/30" />
                    <div className="border-b border-brand-300/30" />
                    <div className="border-r border-brand-300/30" />
                    <div className="border-r border-brand-300/30" />
                    <div />
                  </div>

                  {/* Corner Handles */}
                  {/* Top Left */}
                  <div
                    onMouseDown={(e) => handleStartDrag(e, 'tl')}
                    onTouchStart={(e) => handleStartDrag(e, 'tl')}
                    className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-brand-500 border-2 border-white rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                  />
                  {/* Top Right */}
                  <div
                    onMouseDown={(e) => handleStartDrag(e, 'tr')}
                    onTouchStart={(e) => handleStartDrag(e, 'tr')}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-500 border-2 border-white rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                  />
                  {/* Bottom Left */}
                  <div
                    onMouseDown={(e) => handleStartDrag(e, 'bl')}
                    onTouchStart={(e) => handleStartDrag(e, 'bl')}
                    className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-brand-500 border-2 border-white rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                  />
                  {/* Bottom Right */}
                  <div
                    onMouseDown={(e) => handleStartDrag(e, 'br')}
                    onTouchStart={(e) => handleStartDrag(e, 'br')}
                    className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-brand-500 border-2 border-white rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                  />
                </div>
              </div>

              {/* Bottom Quick Info Badge */}
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-slate-300 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800">
                <span>
                  Original: {naturalDimensions.width} × {naturalDimensions.height} px
                </span>
                <span className="font-semibold text-brand-400">
                  Crop Box: {currentPixelCrop.width} × {currentPixelCrop.height} px
                </span>
                <span>
                  Rotation: {rotation}°
                </span>
              </div>
            </div>

            {/* Quick Action Toolbar (Rotate / Flip / Reset) */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                  className="p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                  title="Rotate -90°"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>-90°</span>
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                  title="Rotate +90°"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>+90°</span>
                </button>
                <div className="w-[1px] h-5 bg-slate-200 dark:border-slate-800 mx-1" />
                <button
                  onClick={() => setFlipH((f) => !f)}
                  className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                    flipH
                      ? 'bg-brand-50 dark:bg-brand-950 text-brand-600 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Flip Horizontal"
                >
                  <FlipHorizontal className="w-4 h-4" />
                  <span>Flip H</span>
                </button>
                <button
                  onClick={() => setFlipV((f) => !f)}
                  className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                    flipV
                      ? 'bg-brand-50 dark:bg-brand-950 text-brand-600 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Flip Vertical"
                >
                  <FlipVertical className="w-4 h-4" />
                  <span>Flip V</span>
                </button>
              </div>

              <button
                onClick={resetAll}
                className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <ResetIcon className="w-3.5 h-3.5" />
                <span>Reset All</span>
              </button>
            </div>
          </div>

          {/* Right Col: Aspect Ratio Presets & Export */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-brand-500" />
                Crop Aspect Ratio
              </h3>

              {/* Preset Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'free', label: 'Freeform' },
                  { id: '1:1', label: '1:1 (Square)' },
                  { id: '16:9', label: '16:9 (Wide)' },
                  { id: '9:16', label: '9:16 (Story)' },
                  { id: '4:3', label: '4:3 (Photo)' },
                  { id: '3:2', label: '3:2 (35mm)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handlePresetChange(item.id as AspectPreset)}
                    className={`py-2 px-2 text-xs font-medium rounded-xl border text-center transition-all ${
                      aspectPreset === item.id
                        ? 'bg-brand-50 dark:bg-brand-950/80 border-brand-500 text-brand-600 dark:text-brand-300 font-bold shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Custom Ratio Input */}
              <div
                onClick={() => handlePresetChange('custom')}
                className={`p-3 rounded-xl border transition-all ${
                  aspectPreset === 'custom'
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850'
                }`}
              >
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Custom Ratio (Width : Height)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={customRatioW}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 1;
                      setCustomRatioW(val);
                      setAspectPreset('custom');
                      const r = val / (customRatioH || 1);
                      applyRatioToBox(r);
                    }}
                    placeholder="W"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-mono"
                  />
                  <span className="text-slate-400 font-bold">:</span>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={customRatioH}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 1;
                      setCustomRatioH(val);
                      setAspectPreset('custom');
                      const r = (customRatioW || 1) / val;
                      applyRatioToBox(r);
                    }}
                    placeholder="H"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-mono"
                  />
                </div>
              </div>

              {/* Output Format and Quality */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Export Format
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'image/jpeg', label: 'JPG' },
                      { id: 'image/png', label: 'PNG' },
                      { id: 'image/webp', label: 'WebP' },
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        onClick={() => {
                          setOutputFormat(fmt.id as any);
                          setProcessedResult(null);
                        }}
                        className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                          outputFormat === fmt.id
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {outputFormat !== 'image/png' && (
                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      <span>Quality</span>
                      <span>{Math.round(outputQuality * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="1.0"
                      step="0.02"
                      value={outputQuality}
                      onChange={(e) => {
                        setOutputQuality(parseFloat(e.target.value));
                        setProcessedResult(null);
                      }}
                      className="w-full accent-brand-500 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Crop Action Button */}
              <button
                onClick={handleApplyCrop}
                disabled={isProcessing}
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Crop className="w-4 h-4" />
                <span>Crop &amp; Process Image</span>
              </button>
            </div>

            {/* Cropped Result Card */}
            {processedResult && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-5 space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Image Cropped Successfully!
                </div>

                <div className="flex items-center gap-3">
                  <img
                    src={processedResult.dataUrl}
                    alt="Cropped Preview"
                    className="w-16 h-16 object-cover rounded-lg border border-emerald-300 dark:border-emerald-700"
                  />
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                    <div>
                      Resolution: <span className="font-semibold text-slate-900 dark:text-white">{processedResult.width} × {processedResult.height} px</span>
                    </div>
                    <div>
                      File Size: <span className="font-semibold text-slate-900 dark:text-white">{formatFileSize(processedResult.blob.size)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Cropped Image
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
