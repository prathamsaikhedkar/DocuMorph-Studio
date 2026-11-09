import React, { useState } from 'react';
import {
  Combine,
  Download,
  Trash2,
  MoveUp,
  MoveDown,
  FileText,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import { mergePdfs } from '../../utils/pdfUtils';
import { downloadBlob } from '../../utils/canvasUtils';
import { formatFileSize } from '../../utils/imageCompressor';

interface PdfFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
}

export const PdfMergeTool: React.FC = () => {
  const [items, setItems] = useState<PdfFileItem[]>([]);
  const [outputTitle, setOutputTitle] = useState('merged_document.pdf');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);

  const handleFilesAdded = (files: File[]) => {
    const valid = files.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (valid.length === 0) return;

    const newItems: PdfFileItem[] = valid.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      size: file.size,
    }));

    setItems((prev) => [...prev, ...newItems]);
    setResultBytes(null);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIdx, 0, moved);
    setItems(newItems);
    setResultBytes(null);
  };

  const handleMerge = async () => {
    if (items.length < 2) {
      alert('Please add at least 2 PDF files to merge.');
      return;
    }
    setIsProcessing(true);

    try {
      const buffers: ArrayBuffer[] = [];
      for (const item of items) {
        const buf = await item.file.arrayBuffer();
        buffers.push(buf);
      }

      const merged = await mergePdfs(buffers);
      setResultBytes(merged);
    } catch (err) {
      console.error('Merge error:', err);
      alert('Failed to merge PDFs. One of the documents may be encrypted or corrupted.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBytes) return;
    downloadBlob(resultBytes, outputTitle || 'merged_document.pdf', 'application/pdf');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Combine className="w-6 h-6 text-brand-500" />
            PDF Merger
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Combine multiple PDF files into one clean document with custom order.
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={() => {
              setItems([]);
              setResultBytes(null);
            }}
            className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/60"
          >
            Clear All
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <DropZone
          onFilesSelected={handleFilesAdded}
          accept="application/pdf"
          multiple={true}
          title="Upload or Drag &amp; Drop PDF Files to Merge"
          subtitle="Select 2 or more PDF files • 100% Client-Side Processing"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                PDF Order ({items.length})
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Top file comes first in the merged document
              </span>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-md shrink-0">
                    {index + 1}
                  </span>

                  <FileText className="w-8 h-8 text-rose-500 shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatFileSize(item.size)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded-md"
                    >
                      <MoveUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === items.length - 1}
                      className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded-md"
                    >
                      <MoveDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                      className="p-1.5 text-rose-500 hover:text-rose-700 rounded-md ml-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <DropZone
              onFilesSelected={handleFilesAdded}
              accept="application/pdf"
              multiple={true}
              compact={true}
              title="Add more PDFs to merge"
            />
          </div>

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm pb-2 border-b border-slate-100 dark:border-slate-800">
                Merge Settings
              </h3>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Merged Filename
                </label>
                <input
                  type="text"
                  value={outputTitle}
                  onChange={(e) => setOutputTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>

              <button
                onClick={handleMerge}
                disabled={isProcessing || items.length < 2}
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Merging documents...</span>
                  </>
                ) : (
                  <>
                    <Combine className="w-4 h-4" />
                    <span>Merge {items.length} Files</span>
                  </>
                )}
              </button>
            </div>

            {resultBytes && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  PDFs Merged Successfully!
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Total Size: <span className="font-semibold">{formatFileSize(resultBytes.length)}</span>
                </div>
                <button
                  onClick={handleDownload}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Merged PDF
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
