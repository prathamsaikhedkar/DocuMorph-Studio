import React, { useState, useEffect } from 'react';
import {
  FileText,
  Crop,
  Printer,
  Minimize2,
  RefreshCw,
  Combine,
  Scissors,
  Image as ImageIcon,
  Zap,
  Lock,
  Unlock,
  TrendingDown,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { TOOLS } from './types';
import type { ToolId } from './types';
import { JpgToPdfTool } from './components/tools/JpgToPdfTool';
import { ImageCropTool } from './components/tools/ImageCropTool';
import { ImageDpiTool } from './components/tools/ImageDpiTool';
import { ImageCompressTool } from './components/tools/ImageCompressTool';
import { ImageResizeConvertTool } from './components/tools/ImageResizeConvertTool';
import { PdfPageCompressTool } from './components/tools/PdfPageCompressTool';
import { PdfUnlockTool } from './components/tools/PdfUnlockTool';
import { PdfMergeTool } from './components/tools/PdfMergeTool';
import { PdfSplitTool } from './components/tools/PdfSplitTool';
import { PdfToImageTool } from './components/tools/PdfToImageTool';

export const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolId>('jpg-to-pdf');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'image' | 'pdf'>('all');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const filteredTools = TOOLS.filter((tool) => {
    if (categoryFilter === 'all') return true;
    return tool.category === categoryFilter;
  });

  const getToolIcon = (id: ToolId) => {
    switch (id) {
      case 'jpg-to-pdf':
        return <FileText className="w-4 h-4 text-brand-500" />;
      case 'image-crop':
        return <Crop className="w-4 h-4 text-emerald-500" />;
      case 'image-dpi':
        return <Printer className="w-4 h-4 text-indigo-500" />;
      case 'image-compress':
        return <Minimize2 className="w-4 h-4 text-purple-500" />;
      case 'image-convert':
        return <RefreshCw className="w-4 h-4 text-blue-500" />;
      case 'pdf-compress':
        return <TrendingDown className="w-4 h-4 text-emerald-500" />;
      case 'pdf-unlock':
        return <Unlock className="w-4 h-4 text-amber-500" />;
      case 'pdf-merge':
        return <Combine className="w-4 h-4 text-rose-500" />;
      case 'pdf-split':
        return <Scissors className="w-4 h-4 text-amber-500" />;
      case 'pdf-to-image':
        return <ImageIcon className="w-4 h-4 text-teal-500" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const renderActiveTool = () => {
    switch (activeTool) {
      case 'jpg-to-pdf':
        return <JpgToPdfTool />;
      case 'image-crop':
        return <ImageCropTool />;
      case 'image-dpi':
        return <ImageDpiTool />;
      case 'image-compress':
        return <ImageCompressTool />;
      case 'image-convert':
        return <ImageResizeConvertTool />;
      case 'pdf-compress':
        return <PdfPageCompressTool />;
      case 'pdf-unlock':
        return <PdfUnlockTool />;
      case 'pdf-merge':
        return <PdfMergeTool />;
      case 'pdf-split':
        return <PdfSplitTool />;
      case 'pdf-to-image':
        return <PdfToImageTool />;
      default:
        return <JpgToPdfTool />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-brand-500 selection:text-white transition-colors duration-200">
      <Navbar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        categoryFilter={categoryFilter}
        onSelectCategory={setCategoryFilter}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Security Assurance Banner */}
        <div className="bg-gradient-to-r from-emerald-500/10 via-brand-500/10 to-indigo-500/10 dark:from-emerald-950/40 dark:via-brand-950/40 dark:to-indigo-950/40 border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>100% Client-Side Privacy</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Your images &amp; PDFs are processed directly in your browser memory. No files are ever uploaded to any server.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Instant &amp; Offline Ready</span>
          </div>
        </div>

        {/* Tool Navigation Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {filteredTools.map((tool) => {
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 border-brand-500 text-brand-600 dark:text-brand-300 shadow-sm ring-2 ring-brand-500/20 font-bold'
                    : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {getToolIcon(tool.id)}
                <span>{tool.name}</span>
                {tool.badge && (
                  <span
                    className={`text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {tool.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Tool Viewport */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800/80 shadow-xl shadow-slate-200/40 dark:shadow-none min-h-[520px]">
          {renderActiveTool()}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">DocuMorph Studio</span>
            <span>•</span>
            <span>Zero Server Footprint</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">GDPR &amp; HIPAA Friendly</span>
          </div>
          <div className="flex items-center gap-1">
            <span>Built completely client-side for maximum speed and confidentiality</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default App;
