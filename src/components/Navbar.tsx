import React from 'react';
import {
  Sparkles,
  Sun,
  Moon,
  Layers,
  FileText,
  FileImage,
} from 'lucide-react';
import { PrivacyBadge } from './PrivacyBadge';
import type { ToolId } from '../types';

interface NavbarProps {
  activeTool?: ToolId;
  onSelectTool: (id: ToolId) => void;
  categoryFilter: 'all' | 'image' | 'pdf';
  onSelectCategory: (cat: 'all' | 'image' | 'pdf') => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSelectTool,
  categoryFilter,
  onSelectCategory,
  darkMode,
  onToggleDarkMode,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onSelectTool('jpg-to-pdf')}
            className="cursor-pointer flex items-center gap-2.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  DocuMorph
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  Studio
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block -mt-0.5 font-medium">
                Client-Side Image &amp; PDF Utils
              </span>
            </div>
          </div>
        </div>

        {/* Center Categories */}
        <div className="hidden md:flex items-center gap-1 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          <button
            onClick={() => onSelectCategory('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              categoryFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Tools</span>
          </button>
          <button
            onClick={() => onSelectCategory('image')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              categoryFilter === 'image'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FileImage className="w-3.5 h-3.5 text-brand-500" />
            <span>Image Tools</span>
          </button>
          <button
            onClick={() => onSelectCategory('pdf')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              categoryFilter === 'pdf'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-rose-500" />
            <span>PDF Tools</span>
          </button>
        </div>

        {/* Right Actions: Privacy Badge & Theme Toggle */}
        <div className="flex items-center gap-2.5">
          <PrivacyBadge />

          <button
            onClick={onToggleDarkMode}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
