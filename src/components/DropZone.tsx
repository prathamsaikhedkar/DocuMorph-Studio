import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, FileImage, FileText, Plus } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept: string;
  multiple?: boolean;
  title?: string;
  subtitle?: string;
  compact?: boolean;
  className?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  accept,
  multiple = false,
  title = 'Drag & drop your files here',
  subtitle = 'or click to browse from device (paste Ctrl+V supported)',
  compact = false,
  className = '',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    onFilesSelected(files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  // Listen for clipboard paste events (e.g. screenshot pasted via Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        handleFiles(e.clipboardData.files);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const isPdf = accept.includes('pdf');

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative group cursor-pointer border-2 border-dashed rounded-2xl transition-all duration-200 text-center select-none ${
        isDragOver
          ? 'border-brand-500 bg-brand-50/70 dark:bg-brand-950/30 scale-[1.01]'
          : 'border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 hover:border-brand-400 dark:hover:border-brand-500 hover:bg-slate-50/80 dark:hover:bg-slate-850/80'
      } ${compact ? 'p-5' : 'p-8 sm:p-12'} ${className}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          // Reset value so identical file can be selected again if needed
          e.target.value = '';
        }}
      />

      <div className="flex flex-col items-center justify-center gap-3">
        <div
          className={`p-3.5 rounded-2xl transition-transform duration-200 group-hover:scale-110 shadow-sm ${
            isPdf
              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60'
              : 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900/60'
          }`}
        >
          {compact ? (
            <Plus className="w-5 h-5" />
          ) : isPdf ? (
            <FileText className="w-8 h-8" />
          ) : (
            <FileImage className="w-8 h-8" />
          )}
        </div>

        <div>
          <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
            {title}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {subtitle}
          </p>
        </div>

        {!compact && (
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Select Files</span>
          </div>
        )}
      </div>
    </div>
  );
};
