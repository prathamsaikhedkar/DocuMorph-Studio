import React, { useState } from 'react';
import {
  FileText,
  Trash2,
  MoveUp,
  MoveDown,
  Download,
  Settings2,
  FileCheck,
  Loader2,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import type {
  ImageToPdfItem,
  ImageToPdfOptions,
} from '../../utils/pdfUtils';
import { convertImagesToPdf } from '../../utils/pdfUtils';
import { downloadBlob } from '../../utils/canvasUtils';
import { formatFileSize } from '../../utils/imageCompressor';

export const JpgToPdfTool: React.FC = () => {
  const [items, setItems] = useState<ImageToPdfItem[]>([]);
  const [options, setOptions] = useState<ImageToPdfOptions>({
    pageSize: 'a4',
    orientation: 'auto',
    margin: 20,
    imageQuality: 0.9,
    addPageNumbers: true,
    documentTitle: 'Converted_Document',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [pdfResult, setPdfResult] = useState<{
    bytes: Uint8Array;
    blobUrl: string;
    size: number;
    filename: string;
  } | null>(null);

  const handleFilesAdded = async (files: File[]) => {
    const validFiles = files.filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    const newItems: ImageToPdfItem[] = [];

    for (const file of validFiles) {
      const previewUrl = URL.createObjectURL(file);
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = previewUrl;
      });

      newItems.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        previewUrl,
        name: file.name,
        size: file.size,
        width: img.naturalWidth || 800,
        height: img.naturalHeight || 600,
      });
    }

    setItems((prev) => [...prev, ...newItems]);
    setPdfResult(null);
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
    setPdfResult(null);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIdx, 0, moved);
    setItems(newItems);
    setPdfResult(null);
  };

  const handleGeneratePdf = async () => {
    if (items.length === 0) return;
    setIsProcessing(true);
    setProgress({ current: 0, total: items.length });

    try {
      const pdfBytes = await convertImagesToPdf(items, options, (current, total) => {
        setProgress({ current, total });
      });

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const filename = `${options.documentTitle || 'converted'}_${Date.now()}.pdf`;

      setPdfResult({
        bytes: pdfBytes,
        blobUrl,
        size: pdfBytes.length,
        filename,
      });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Error creating PDF. Please check your image files and try again.');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-500" />
            JPG &amp; Images to PDF Converter
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Combine multiple JPG, PNG, or WebP images into a single beautifully formatted PDF document.
          </p>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                items.forEach((i) => URL.revokeObjectURL(i.previewUrl));
                setItems([]);
                setPdfResult(null);
              }}
              className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/60"
            >
              Clear All ({items.length})
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <DropZone
          onFilesSelected={handleFilesAdded}
          accept="image/jpeg,image/png,image/webp"
          multiple={true}
          title="Upload or Drag &amp; Drop Images"
          subtitle="Supports JPG, JPEG, PNG, WEBP • Upload multiple files together"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Images List and Ordering */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Images &amp; Page Order ({items.length})
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Use arrows to adjust page ordering
              </span>
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-md shrink-0">
                    {index + 1}
                  </span>

                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-850 shrink-0 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                    <img
                      src={item.previewUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {item.width} × {item.height} px • {formatFileSize(item.size)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Move up"
                    >
                      <MoveUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === items.length - 1}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Move down"
                    >
                      <MoveDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-1"
                      title="Remove image"
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
              title="Add more images"
              subtitle="Drag & drop or click to add more pages"
            />
          </div>

          {/* Right Col: PDF Settings & Output */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Settings2 className="w-4 h-4 text-brand-500" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  Document Settings
                </h3>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Document Name
                </label>
                <input
                  type="text"
                  value={options.documentTitle || ''}
                  onChange={(e) =>
                    setOptions({ ...options, documentTitle: e.target.value })
                  }
                  placeholder="converted_document"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Page Size */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Page Size
                </label>
                <select
                  value={options.pageSize}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      pageSize: e.target.value as ImageToPdfOptions['pageSize'],
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="a4">A4 (Standard Document)</option>
                  <option value="letter">US Letter (8.5 × 11 in)</option>
                  <option value="legal">US Legal (8.5 × 14 in)</option>
                  <option value="fit">Fit to Image Size (No scaling)</option>
                </select>
              </div>

              {/* Orientation */}
              {options.pageSize !== 'fit' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Orientation
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['auto', 'portrait', 'landscape'] as const).map((orient) => (
                      <button
                        key={orient}
                        type="button"
                        onClick={() =>
                          setOptions({ ...options, orientation: orient })
                        }
                        className={`py-1.5 text-xs font-medium capitalize rounded-lg border transition-all ${
                          options.orientation === orient
                            ? 'bg-brand-50 dark:bg-brand-950 border-brand-500 text-brand-600 dark:text-brand-300 font-semibold'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {orient}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Margins */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Margins: {options.margin === 0 ? 'None' : `${options.margin} pt`}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'None', val: 0 },
                    { label: 'Small', val: 20 },
                    { label: 'Normal', val: 40 },
                  ].map((m) => (
                    <button
                      key={m.label}
                      type="button"
                      onClick={() => setOptions({ ...options, margin: m.val })}
                      className={`py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        options.margin === m.val
                          ? 'bg-brand-50 dark:bg-brand-950 border-brand-500 text-brand-600 dark:text-brand-300 font-semibold'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page Numbers */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Include Page Numbers
                </span>
                <input
                  type="checkbox"
                  checked={options.addPageNumbers}
                  onChange={(e) =>
                    setOptions({ ...options, addPageNumbers: e.target.checked })
                  }
                  className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500 border-slate-300"
                />
              </div>

              {/* Action Button */}
              <button
                onClick={handleGeneratePdf}
                disabled={isProcessing || items.length === 0}
                className="w-full mt-2 py-3 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 text-white font-medium text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      Generating PDF ({progress?.current || 0}/{progress?.total || items.length})...
                    </span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>Generate PDF ({items.length} {items.length === 1 ? 'Page' : 'Pages'})</span>
                  </>
                )}
              </button>
            </div>

            {/* Generated PDF Card */}
            {pdfResult && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-5 space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  PDF Ready to Download!
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  File size: <span className="font-semibold">{formatFileSize(pdfResult.size)}</span> • {items.length} pages
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() =>
                      downloadBlob(pdfResult.bytes, pdfResult.filename, 'application/pdf')
                    }
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </button>
                  <a
                    href={pdfResult.blobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
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
