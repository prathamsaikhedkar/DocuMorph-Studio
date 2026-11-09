import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Download,
  Loader2,
  Archive,
  Sliders,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import { renderPdfToImages } from '../../utils/pdfUtils';
import { downloadBlob, downloadZip } from '../../utils/canvasUtils';
import { formatFileSize } from '../../utils/imageCompressor';

interface RenderedImagePage {
  pageNumber: number;
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

export const PdfToImageTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [format, setFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg');
  const [scale, setScale] = useState<number>(2.0); // 2x default for crisp quality

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [renderedPages, setRenderedPages] = useState<RenderedImagePage[]>([]);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    const buf = await selected.arrayBuffer();
    setArrayBuffer(buf);
    setRenderedPages([]);
  };

  const handleConvert = async () => {
    if (!arrayBuffer) return;
    setIsProcessing(true);
    setProgress({ current: 0, total: 0 });

    try {
      const pages = await renderPdfToImages(
        arrayBuffer,
        scale,
        format,
        (current, total) => setProgress({ current, total })
      );
      setRenderedPages(pages);
    } catch (err) {
      console.error('PDF to Image conversion error:', err);
      alert('Failed to render PDF to images. Check if file is valid.');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const handleDownloadSingle = (page: RenderedImagePage) => {
    const baseName = file?.name.replace(/\.pdf$/i, '') || 'page';
    const ext = format === 'image/jpeg' ? 'jpg' : 'png';
    downloadBlob(page.blob, `${baseName}_page_${page.pageNumber}.${ext}`, format);
  };

  const handleDownloadAllZip = async () => {
    if (renderedPages.length === 0) return;
    const baseName = file?.name.replace(/\.pdf$/i, '') || 'document';
    const ext = format === 'image/jpeg' ? 'jpg' : 'png';

    const zipFiles = renderedPages.map((p) => ({
      name: `${baseName}_page_${p.pageNumber}.${ext}`,
      content: p.blob,
    }));

    await downloadZip(zipFiles, `${baseName}_images.zip`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-brand-500" />
            PDF to Images Converter
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Convert each page of a PDF file into high-definition JPG or PNG images directly in your browser.
          </p>
        </div>

        {file && (
          <button
            onClick={() => {
              setFile(null);
              setArrayBuffer(null);
              setRenderedPages([]);
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
          title="Upload or Drag &amp; Drop a PDF to Convert to Images"
          subtitle="Supports single or multi-page PDF documents"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Col: Rendered Results Gallery or Action Card */}
          <div className="lg:col-span-2 space-y-4">
            {renderedPages.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Rendered Pages ({renderedPages.length})
                  </span>
                  <button
                    onClick={handleDownloadAllZip}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    Download All as ZIP
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[580px] overflow-y-auto pr-1">
                  {renderedPages.map((page) => (
                    <div
                      key={page.pageNumber}
                      className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span>Page {page.pageNumber}</span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {page.width} × {page.height} px
                        </span>
                      </div>

                      <div className="h-56 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center border">
                        <img
                          src={page.dataUrl}
                          alt={`Page ${page.pageNumber}`}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-500">
                          {formatFileSize(page.blob.size)}
                        </span>
                        <button
                          onClick={() => handleDownloadSingle(page)}
                          className="py-1.5 px-3 bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-300 font-semibold rounded-lg text-xs hover:bg-brand-100 flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-3">
                <div className="p-3 bg-brand-50 dark:bg-brand-950 text-brand-600 rounded-xl w-fit mx-auto">
                  <ImageIcon className="w-8 h-8" />
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">
                  Ready to Render: {file.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Choose your desired resolution quality and image format on the right, then click Convert to Images.
                </p>
              </div>
            )}
          </div>

          {/* Right Col: Settings & Action */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-brand-500" />
                Render Settings
              </h3>

              {/* Format */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Image Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFormat('image/jpeg')}
                    className={`py-1.5 text-xs font-semibold rounded-lg border ${
                      format === 'image/jpeg'
                        ? 'bg-brand-50 dark:bg-brand-950 border-brand-500 text-brand-600 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600'
                    }`}
                  >
                    JPG (Smaller file)
                  </button>
                  <button
                    onClick={() => setFormat('image/png')}
                    className={`py-1.5 text-xs font-semibold rounded-lg border ${
                      format === 'image/png'
                        ? 'bg-brand-50 dark:bg-brand-950 border-brand-500 text-brand-600 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600'
                    }`}
                  >
                    PNG (Lossless)
                  </button>
                </div>
              </div>

              {/* Resolution / DPI Scale */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Resolution Multiplier
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 1.0, label: '1x (72 DPI)' },
                    { val: 2.0, label: '2x (150 DPI)' },
                    { val: 3.0, label: '3x (300 DPI)' },
                  ].map((s) => (
                    <button
                      key={s.label}
                      onClick={() => setScale(s.val)}
                      className={`py-1.5 text-xs font-semibold rounded-lg border text-center ${
                        scale === s.val
                          ? 'bg-brand-50 dark:bg-brand-950 border-brand-500 text-brand-600 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleConvert}
                disabled={isProcessing}
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      Converting ({progress?.current || 0}/{progress?.total || '?'})...
                    </span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4" />
                    <span>Convert to Images</span>
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
