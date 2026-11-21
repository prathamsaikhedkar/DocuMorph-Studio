import React, { useState } from 'react';
import {
  RotateCw,
  RotateCcw,
  Trash2,
  MoveLeft,
  MoveRight,
  Download,
  Eye,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import type { PageOrganizeAction } from '../../utils/pdfUtils';
import {
  getPdfThumbnails,
  organizePdfPages,
} from '../../utils/pdfUtils';
import { downloadBlob } from '../../utils/canvasUtils';
import { formatFileSize } from '../../utils/imageCompressor';

interface PageItem {
  id: string;
  originalIndex: number; // 0-based
  pageNumber: number;   // 1-based display
  dataUrl: string;
  rotation: number;     // 0, 90, 180, 270 degrees
}

export const PdfOrganizeTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Export / processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);

  const handlePdfSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setIsLoading(true);
    setResultBytes(null);
    if (resultBlobUrl) URL.revokeObjectURL(resultBlobUrl);
    setResultBlobUrl(null);

    try {
      const buffer = await selected.arrayBuffer();
      const thumbs = await getPdfThumbnails(buffer);
      const items: PageItem[] = thumbs.map((t, idx) => ({
        id: Math.random().toString(36).substring(2, 9),
        originalIndex: idx,
        pageNumber: t.pageNumber,
        dataUrl: t.dataUrl,
        rotation: 0,
      }));
      setPages(items);
    } catch (err) {
      console.error('Failed to load PDF pages for organization:', err);
      alert('Failed to load PDF. Check if it is encrypted or corrupted.');
    } finally {
      setIsLoading(false);
    }
  };

  const rotatePage = (id: string, delta: number) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          rotation: (p.rotation + delta + 360) % 360,
        };
      })
    );
    setResultBytes(null);
  };

  const rotateAllPages = (delta: number) => {
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        rotation: (p.rotation + delta + 360) % 360,
      }))
    );
    setResultBytes(null);
  };

  const deletePage = (id: string) => {
    if (pages.length <= 1) {
      alert('The PDF must contain at least 1 page.');
      return;
    }
    setPages((prev) => prev.filter((p) => p.id !== id));
    setResultBytes(null);
  };

  const movePage = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= pages.length) return;

    const updated = [...pages];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    setPages(updated);
    setResultBytes(null);
  };

  const handleExport = async () => {
    if (!file || pages.length === 0) return;
    setIsProcessing(true);

    try {
      const freshBuffer = await file.arrayBuffer();
      const actions: PageOrganizeAction[] = pages.map((p) => ({
        originalIndex: p.originalIndex,
        rotation: p.rotation,
      }));

      const organized = await organizePdfPages(freshBuffer, actions);
      const blob = new Blob([organized.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setResultBytes(organized);
      setResultBlobUrl(url);
    } catch (err) {
      console.error('Failed to organize PDF:', err);
      alert('Error exporting organized PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBytes || !file) return;
    const base = file.name.replace(/\.pdf$/i, '');
    downloadBlob(resultBytes, `${base}_organized.pdf`, 'application/pdf');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <RotateCw className="w-6 h-6 text-brand-500" />
            PDF Page Organizer &amp; Rotator
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Rotate individual or all pages, delete unwanted pages, and reorder document page layout visually.
          </p>
        </div>

        {file && (
          <button
            onClick={() => {
              setFile(null);
              setPages([]);
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
          title="Upload or Drag &amp; Drop a PDF to Organize"
          subtitle="Renders visual page cards directly in your browser"
        />
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <p className="text-sm font-medium">Extracting PDF pages for organizer...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {pages.length} Pages
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                type="button"
                onClick={() => rotateAllPages(90)}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg flex items-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5 text-brand-500" />
                <span>Rotate All +90°</span>
              </button>
              <button
                type="button"
                onClick={() => rotateAllPages(-90)}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-brand-500" />
                <span>Rotate All -90°</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExport}
                disabled={isProcessing}
                className="py-2 px-5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Save &amp; Export Organized PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result Alert if ready */}
          {resultBytes && resultBlobUrl && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>PDF Successfully Organized! ({pages.length} Pages, {formatFileSize(resultBytes.length)})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <a
                  href={resultBlobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-1.5 px-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </a>
              </div>
            </div>
          )}

          {/* Pages Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {pages.map((p, idx) => (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-sm flex flex-col justify-between group hover:border-brand-400 transition-colors"
              >
                {/* Header: Page badge & Delete */}
                <div className="flex items-center justify-between mb-1 text-xs">
                  <span className="font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    #{idx + 1}
                  </span>
                  {p.rotation !== 0 && (
                    <span className="text-[10px] text-brand-600 font-bold bg-brand-50 dark:bg-brand-950 px-1.5 py-0.2 rounded">
                      +{p.rotation}°
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => deletePage(p.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                    title="Delete page"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Thumbnail image with rotation */}
                <div className="w-full h-40 bg-slate-100 dark:bg-slate-800 rounded-lg border overflow-hidden flex items-center justify-center my-1.5">
                  <img
                    src={p.dataUrl}
                    alt={`Page ${idx + 1}`}
                    className="max-h-full max-w-full object-contain transition-transform duration-200"
                    style={{ transform: `rotate(${p.rotation}deg)` }}
                  />
                </div>

                {/* Bottom Actions: Reorder and Rotate */}
                <div className="grid grid-cols-4 gap-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => movePage(idx, 'left')}
                    className="p-1.5 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-20 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                    title="Move left"
                  >
                    <MoveLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => rotatePage(p.id, -90)}
                    className="p-1.5 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                    title="Rotate -90°"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => rotatePage(p.id, 90)}
                    className="p-1.5 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                    title="Rotate +90°"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === pages.length - 1}
                    onClick={() => movePage(idx, 'right')}
                    className="p-1.5 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-20 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                    title="Move right"
                  >
                    <MoveRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
