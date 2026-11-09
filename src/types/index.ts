export type ToolId =
  | 'jpg-to-pdf'
  | 'image-crop'
  | 'image-dpi'
  | 'image-compress'
  | 'image-convert'
  | 'pdf-compress'
  | 'pdf-unlock'
  | 'pdf-merge'
  | 'pdf-split'
  | 'pdf-to-image';

export interface ToolDefinition {
  id: ToolId;
  name: string;
  category: 'image' | 'pdf';
  shortDesc: string;
  badge?: string;
  icon: string;
}

export const TOOLS: ToolDefinition[] = [
  {
    id: 'jpg-to-pdf',
    name: 'JPG to PDF',
    category: 'image',
    shortDesc: 'Convert JPG, PNG, WebP images to customized PDF documents.',
    badge: 'Popular',
    icon: 'FileText',
  },
  {
    id: 'image-crop',
    name: 'Custom Crop',
    category: 'image',
    shortDesc: 'Crop with freeform or custom aspect ratios, rotate & flip.',
    badge: 'Interactive',
    icon: 'Crop',
  },
  {
    id: 'image-dpi',
    name: 'DPI Changer',
    category: 'image',
    shortDesc: 'Change image DPI (300, 600, custom) for printing & documents.',
    badge: 'Lossless',
    icon: 'Printer',
  },
  {
    id: 'image-compress',
    name: 'Size Compressor',
    category: 'image',
    shortDesc: 'Compress to exact target KB/MB or adjust quality slider.',
    badge: 'Smart Target',
    icon: 'Minimize2',
  },
  {
    id: 'image-convert',
    name: 'Convert & Resize',
    category: 'image',
    shortDesc: 'Batch convert between PNG, JPG, WebP and resize dimensions.',
    icon: 'RefreshCw',
  },
  {
    id: 'pdf-compress',
    name: 'Compress PDF',
    category: 'pdf',
    shortDesc: 'Compress PDF documents with per-page quality controls.',
    badge: 'Per-Page',
    icon: 'TrendingDown',
  },
  {
    id: 'pdf-unlock',
    name: 'Unlock PDF',
    category: 'pdf',
    shortDesc: 'Permanently remove passwords from protected PDF files.',
    badge: 'New',
    icon: 'Unlock',
  },
  {
    id: 'pdf-merge',
    name: 'Merge PDF',
    category: 'pdf',
    shortDesc: 'Combine multiple PDF files into one clean document.',
    icon: 'Combine',
  },
  {
    id: 'pdf-split',
    name: 'Split & Extract PDF',
    category: 'pdf',
    shortDesc: 'Extract specific pages or separate all pages visually.',
    icon: 'Scissors',
  },
  {
    id: 'pdf-to-image',
    name: 'PDF to Image',
    category: 'pdf',
    shortDesc: 'Render PDF pages into high-res JPG or PNG images.',
    icon: 'Image',
  },
];
