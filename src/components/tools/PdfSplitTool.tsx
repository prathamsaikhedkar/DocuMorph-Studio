import React, { useState } from 'react';
import {
  Scissors,
  Download,
  CheckCircle2,
  Loader2,
  CheckSquare,
  Square,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import { getPdfThumbnails, extractPdfPages } from '../../utils/pdfUtils';
import { downloadBlob, downloadZip } from '../../utils/canvasUtils';
import { formatFileSize } from '../../utils/imageCompressor';

interface PageThumbnail {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

export const PdfSplitTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [rangeInput, setRangeInput] = useState<string>('');
  const [splitMode, setSplitMode] = useState<'single' | 'individual'>('single');

  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setIsLoadingPages(true);

    try {
      const buf = await selected.arrayBuffer();
      const thumbs = await getPdfThumbnails(buf);
      setThumbnails(thumbs);
      // Select all by default
      const all = new Set(thumbs.map((t) => t.pageNumber));
      setSelectedPages(all);
      setRangeInput(`1-${thumbs.length}`);
      setResultBytes(null);
    } catch (err) {
      console.error('Failed to parse PDF pages:', err);
      alert('Could not render PDF pages. The file might be password protected or corrupted.');
    } finally {
      setIsLoadingPages(false);
    }
  };

  const togglePage = (pageNum: number) => {
    const updated = new Set(selectedPages);
    if (updated.has(pageNum)) {
      updated.delete(pageNum);
    } else {
      updated.add(pageNum);
    }
    setSelectedPages(updated);
    setResultBytes(null);
  };

  const selectAll = () => {
    setSelectedPages(new Set(thumbnails.map((t) => t.pageNumber)));
    setResultBytes(null);
  };

  const selectNone = () => {
    setSelectedPages(new Set());
    setResultBytes(null);
  };

  const parseRanges = (str: string, maxPages: number): Set<number> => {
    const result = new Set<number>();
    const parts = str.split(',').map((p) => p.trim());
    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
            result.add(i);
          }
        }
      } else {
        const val = parseInt(part, 10);
        if (!isNaN(val) && val >= 1 && val <= maxPages) {
          result.add(val);
        }
      }
    }
    return result;
  };

  const applyRangeInput = () => {
    const pages = parseRanges(rangeInput, thumbnails.length);
    setSelectedPages(pages);
    setResultBytes(null);
  };

  const handleExtract = async () => {
    if (!file || selectedPages.size === 0) {
      alert('Please select at least 1 page to extract.');
      return;
    }
    setIsProcessing(true);

    try {
      const freshBuffer = await file.arrayBuffer();
      const sortedPages = Array.from(selectedPages).sort((a, b) => a - b);
      const pageIndices = sortedPages.map((p) => p - 1); // 0-based for pdf-lib

      if (splitMode === 'single') {
        const extractedBytes = await extractPdfPages(freshBuffer, pageIndices);
        setResultBytes(extractedBytes);
      } else {
        // Individual pages into ZIP
        const zipFiles: Array<{ name: string; content: Uint8Array }> = [];
        const baseName = file?.name.replace(/\.pdf$/i, '') || 'document';

        for (const pageNum of sortedPages) {
          const singlePageBytes = await extractPdfPages(freshBuffer, [pageNum - 1]);
          zipFiles.push({
            name: `${baseName}_page_${pageNum}.pdf`,
            content: singlePageBytes,
          });
        }

        await downloadZip(zipFiles, `${baseName}_extracted_pages.zip`);
      }
    } catch (err) {
      console.error('Extraction error:', err);
      alert('Error extracting pages.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSingle = () => {
    if (!resultBytes || !file) return;
    const baseName = file.name.replace(/\.pdf$/i, '') || 'document';
    downloadBlob(resultBytes, `${baseName}_extracted.pdf`, 'application/pdf');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Scissors className="w-6 h-6 text-brand-500" />
            PDF Split &amp; Page Extractor
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Visually select pages, enter page ranges, and extract into a new PDF or download each page separately.
          </p>
        </div>

        {file && (
          <button
            onClick={() => {
              setFile(null);
              setThumbnails([]);
              setSelectedPages(new Set());
              setResultBytes(null);
            }}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
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
          title="Upload or Drag &amp; Drop a PDF to Split"
          subtitle="Renders page previews directly in your browser"
        />
      ) : isLoadingPages ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <p className="text-sm font-medium">Rendering PDF page previews client-side...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Col: Visual Pages Grid */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200"
                >
                  Select All ({thumbnails.length})
                </button>
                <button
                  onClick={selectNone}
                  className="px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200"
                >
                  Clear Selection
                </button>
              </div>

              <span className="text-xs text-brand-600 dark:text-brand-400 font-semibold">
                {selectedPages.size} of {thumbnails.length} pages selected
              </span>
            </div>

            {/* Thumbnail Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[560px] overflow-y-auto p-1">
              {thumbnails.map((t) => {
                const isSelected = selectedPages.has(t.pageNumber);
                return (
                  <div
                    key={t.pageNumber}
                    onClick={() => togglePage(t.pageNumber)}
                    className={`relative group rounded-xl p-2.5 border cursor-pointer transition-all flex flex-col items-center justify-between text-center ${
                      isSelected
                        ? 'bg-brand-50/70 dark:bg-brand-950/40 border-brand-500 shadow-sm ring-2 ring-brand-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="absolute top-2 right-2">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-brand-600 dark:text-brand-400 fill-brand-100 dark:fill-brand-900" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    <div className="w-full h-36 flex items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 border my-1">
                      <img
                        src={t.dataUrl}
                        alt={`Page ${t.pageNumber}`}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>

                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                      Page {t.pageNumber}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Col: Range Input & Extraction Options */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm pb-2 border-b border-slate-100 dark:border-slate-800">
                Extraction Mode
              </h3>

              {/* Mode */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSplitMode('single')}
                  className={`p-2.5 text-xs font-semibold rounded-xl border text-center ${
                    splitMode === 'single'
                      ? 'bg-brand-50 dark:bg-brand-950 border-brand-500 text-brand-600 font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600'
                  }`}
                >
                  Single Combined PDF
                </button>
                <button
                  onClick={() => setSplitMode('individual')}
                  className={`p-2.5 text-xs font-semibold rounded-xl border text-center ${
                    splitMode === 'individual'
                      ? 'bg-brand-50 dark:bg-brand-950 border-brand-500 text-brand-600 font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600'
                  }`}
                >
                  Separate Pages (.ZIP)
                </button>
              </div>

              {/* Quick Range Input */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Custom Page Range (e.g. 1-3, 5, 8-10)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={rangeInput}
                    onChange={(e) => setRangeInput(e.target.value)}
                    placeholder="1-3, 5"
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border rounded-lg font-mono"
                  />
                  <button
                    onClick={applyRangeInput}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-xs font-semibold rounded-lg hover:bg-slate-200"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleExtract}
                disabled={isProcessing || selectedPages.size === 0}
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting pages...</span>
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4" />
                    <span>Extract {selectedPages.size} Selected {selectedPages.size === 1 ? 'Page' : 'Pages'}</span>
                  </>
                )}
              </button>
            </div>

            {resultBytes && splitMode === 'single' && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Pages Extracted Successfully!
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Total Size: <span className="font-semibold">{formatFileSize(resultBytes.length)}</span>
                </div>
                <button
                  onClick={handleDownloadSingle}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Extracted PDF
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
