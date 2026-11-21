# DocuMorph Studio — 100% Client-Side Image & PDF Toolkit

A private, client-sided web application for image and PDF manipulation. All file processing, compression, conversion, metadata injection, and rendering execute entirely within the user's browser using HTML5 Canvas, pure JavaScript, and WebAssembly. **No files or telemetry are ever uploaded to any remote server.**

---

## 🔒 Security & Privacy Architecture

- **Zero Server Uploads**: Files never leave the browser runtime.
- **Offline & Air-gapped Ready**: Operates even without an active internet connection.
- **Sensitive Document Friendly**: Safe for passports, national identity cards, legal contracts, medical reports, and confidential financial statements.

---

## 🛠️ Features & Included Utilities

### 1. JPG & Images to PDF Converter
- Convert individual or multiple JPG, JPEG, PNG, and WebP images into a single formatted PDF document.
- Custom page sizes: **Fit to Image**, **A4**, **US Letter**, and **US Legal**.
- Page orientation: **Auto** (smart detection based on image aspect ratio), **Portrait**, or **Landscape**.
- Customizable margins (None, Small, Normal) and optional page numbering (`1 / N`).
- Drag-and-drop reordering of pages before compilation.

### 2. Custom Ratio Image Cropper
- Visual interactive cropping box with drag handles and rule-of-thirds grid.
- Aspect ratio presets: **Freeform**, **1:1** (Square/Avatar), **16:9** (Widescreen), **9:16** (Stories/Reels), **4:3**, and **3:2**.
- **Custom Ratio Support**: Enter any custom aspect ratio (e.g. `5:7`, `21:9`) or exact dimensions.
- 90° clockwise / counter-clockwise rotation and Horizontal/Vertical flipping.
- Live pixel dimension indicators and lossless canvas export.

### 3. Image DPI (Dots Per Inch) Changer
- Set image resolution metadata to **300 DPI** (standard passport/official print requirement), **600 DPI**, **150 DPI**, **96 DPI**, **72 DPI**, or any custom numerical DPI.
- **Pure Client-Side Metadata Injector**:
  - Updates **JFIF APP0** marker and **EXIF** (XResolution / YResolution / ResolutionUnit) tags for JPEG.
  - Updates / inserts **`pHYs`** chunk for PNG (pixels per meter calculation).
- Two operation modes: **Lossless Metadata Update** or **Resample Pixels**.
- Real-time physical print dimension calculator in inches (`in`) and centimeters (`cm`).

### 4. Image Size Compressor
- **Target File Size Mode**: Compress images down to exact target limits (e.g., `< 50 KB`, `< 100 KB`, `< 200 KB`, or custom KB) using binary search.
- **Quality Slider Mode**: Adjustable compression level from 5% to 98%.
- **Dimension Scaling**: Downscale large camera photos to 1080p, 1920p, 2K, or custom percentages.
- Batch compression with one-click **ZIP** archive download.

### 5. Format Converter & Batch Resizer
- Convert image formats between PNG, JPG, and WebP with custom background handling for transparency.
- Scale dimensions by percentage (25%, 50%, 75%, 100%) or exact pixel dimensions with lock-aspect ratio.

### 6. Per-Page PDF Compressor
- Compress PDF documents page-by-page directly in your browser.
- Global presets: **Extreme** (< 1MB email limit), **Recommended / Balanced** (70% quality, 1.5x scale), and **High Quality** (crisp text).
- **Granular Per-Page Overrides**: Inspect thumbnails of every page and assign custom quality levels (Auto, Low, Medium, High) to individual pages (e.g., keep Page 1 high quality while compressing pages 2-10 aggressively).
- Real-time progress bar reporting current page being rendered and compressed.
- Live space savings statistics (`-85%`, `-92%`) with side-by-side file size metrics.

### 7. PDF Password Remover & Unlocker
- Permanently remove passwords and restrictions from password-protected PDFs (e.g. bank statements, salary slips, Aadhaar / ID docs, tax returns).
- 100% Client-Side Decryption: Password and document contents never leave your device.
- Automatic password detection upon file upload.
- Preserves exact page dimensions, orientation, and layout.

### 8. PDF Merger
- Merge multiple PDF documents into a single document with drag-and-drop order adjustment.

### 9. PDF Split & Page Extractor
- Visual thumbnail gallery of every page in a PDF rendered client-side with PDF.js.
- Select specific pages or define range queries (e.g. `1-3, 5, 8-10`).
- Export to a single combined PDF or package each selected page into individual PDFs inside a ZIP.

### 10. PDF to Images
- Render each page of a PDF document to crisp JPEG or PNG images (1x, 2x, 3x multipliers).
- Individual page download or batch ZIP download.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```
