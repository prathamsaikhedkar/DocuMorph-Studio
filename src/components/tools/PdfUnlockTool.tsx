import React, { useState } from 'react';
import {
  Unlock,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import { DropZone } from '../DropZone';
import {
  checkPdfPasswordProtection,
  decryptAndUnlockPdf,
} from '../../utils/pdfUtils';
import { downloadBlob } from '../../utils/canvasUtils';
import { formatFileSize } from '../../utils/imageCompressor';

export const PdfUnlockTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProtected, setIsProtected] = useState<boolean | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);

  // Password state
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Settings
  const [fidelity, setFidelity] = useState<number>(2.5); // 2.5x standard crisp
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  // Unlocked Result
  const [unlockedResult, setUnlockedResult] = useState<{
    bytes: Uint8Array;
    blobUrl: string;
    size: number;
    filename: string;
    pageCount: number;
  } | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setPassword('');
    setPasswordError(null);
    setUnlockedResult(null);

    try {
      const buf = await selected.arrayBuffer();
      const check = await checkPdfPasswordProtection(buf);
      setIsProtected(check.isProtected);
      setPageCount(check.pageCount || null);
    } catch (err: any) {
      console.warn('PDF check notice:', err);
      // If error occurred during check, assume it might be password protected
      setIsProtected(true);
    }
  };

  const handleUnlock = async () => {
    if (!file) return;
    setPasswordError(null);
    setIsProcessing(true);
    setProgress(null);

    try {
      const freshBuffer = await file.arrayBuffer();
      const result = await decryptAndUnlockPdf(
        freshBuffer,
        password,
        {
          resolutionMultiplier: fidelity,
          quality: 0.93,
        },
        (current, total) => {
          setProgress({ current, total });
        }
      );

      const blob = new Blob([result.unlockedBytes.buffer as ArrayBuffer], {
        type: 'application/pdf',
      });
      const blobUrl = URL.createObjectURL(blob);
      const baseName = file.name.replace(/\.pdf$/i, '');
      const filename = `${baseName}_unlocked.pdf`;

      setUnlockedResult({
        bytes: result.unlockedBytes,
        blobUrl,
        size: result.unlockedBytes.length,
        filename,
        pageCount: result.pageCount,
      });
    } catch (err: any) {
      console.error('Failed to unlock PDF:', err);
      if (
        err?.name === 'PasswordException' ||
        err?.message?.toLowerCase().includes('password') ||
        err?.code === 2 // INCORRECT_PASSWORD
      ) {
        setPasswordError('Incorrect password. Please verify and try again.');
      } else {
        setPasswordError('Failed to decrypt document. Please verify the password and try again.');
      }
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const handleDownload = () => {
    if (!unlockedResult) return;
    downloadBlob(unlockedResult.bytes, unlockedResult.filename, 'application/pdf');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Unlock className="w-6 h-6 text-brand-500" />
            PDF Password Remover &amp; Unlocker
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Permanently remove passwords from protected PDFs (bank statements, payslips, tax forms) so they open instantly without asking for passwords.
          </p>
        </div>

        {file && (
          <button
            onClick={() => {
              setFile(null);
              setIsProtected(null);
              setPassword('');
              setUnlockedResult(null);
              setPasswordError(null);
            }}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
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
          title="Upload or Drag &amp; Drop a Password-Protected PDF"
          subtitle="Supports bank statements, salary slips, encrypted PDFs • 100% Private, never uploaded to server"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Col: File Info & Security Reassurance */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-start gap-4">
                <div
                  className={`p-3.5 rounded-2xl shrink-0 ${
                    isProtected
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                  }`}
                >
                  {isProtected ? <Lock className="w-8 h-8" /> : <Unlock className="w-8 h-8" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base truncate">
                      {file.name}
                    </h3>
                    {isProtected && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200">
                        Password Encrypted
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    File Size: {formatFileSize(file.size)}
                    {pageCount ? ` • ${pageCount} pages` : ''}
                  </p>
                </div>
              </div>

              {/* Status Banner */}
              {isProtected ? (
                <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold">
                    <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>This PDF is encrypted with a password</span>
                  </div>
                  <p className="text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                    Enter the document password once on the right. DocuMorph will decrypt and export an unlocked version that you can open freely anytime without prompting for a password.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>This PDF does not have an open password!</span>
                  </div>
                  <p className="text-emerald-700 dark:text-emerald-300">
                    It is already viewable without a password. If it had print or copy permissions restrictions, unlocking will strip those restrictions.
                  </p>
                </div>
              )}

              {/* Confidentiality card */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                    Your password never leaves this device
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Decryption is handled entirely in your web browser memory. No passwords, decrypted data, or document contents are ever transmitted over the network.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Password Entry & Decryption Actions */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-brand-500" />
                Enter Password
              </h3>

              {/* Password Input Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Document Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUnlock();
                    }}
                    placeholder="Enter document password"
                    className={`w-full pl-3 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono ${
                      passwordError
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {passwordError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{passwordError}</span>
                  </p>
                )}
              </div>

              {/* Quality Fidelity Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  <span>Output Clarity</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 2.0, label: 'Standard (Compact)' },
                    { val: 3.0, label: 'Ultra Crisp (300 DPI)' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setFidelity(item.val)}
                      className={`py-1.5 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                        fidelity === item.val
                          ? 'bg-brand-50 dark:bg-brand-950 border-brand-500 text-brand-600 dark:text-brand-300 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Unlock Action Button */}
              <button
                onClick={handleUnlock}
                disabled={isProcessing}
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {progress
                        ? `Unlocking page ${progress.current} of ${progress.total}...`
                        : 'Decrypting PDF...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Unlock &amp; Remove Password</span>
                  </>
                )}
              </button>
            </div>

            {/* Unlocked Success Result */}
            {unlockedResult && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-5 space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  PDF Successfully Unlocked!
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div>
                    File size: <span className="font-semibold text-slate-800 dark:text-slate-200">{formatFileSize(unlockedResult.size)}</span>
                  </div>
                  <div>
                    Pages: <span className="font-semibold text-slate-800 dark:text-slate-200">{unlockedResult.pageCount}</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium pt-1">
                    Password permanently removed. You can now open this PDF without passwords.
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleDownload}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Unlocked PDF
                  </button>
                  <a
                    href={unlockedResult.blobUrl}
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
