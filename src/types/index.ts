export type ToolId =
  | 'jpg-to-pdf'
  | 'image-crop'
  | 'image-dpi'
  | 'image-compress'
  | 'image-convert'
  | 'image-watermark'
  | 'image-filters'
  | 'pdf-compress'
  | 'pdf-unlock'
  | 'pdf-watermark'
  | 'pdf-organize'
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
    id: 'image-watermark',
    name: 'Watermark Image',
    category: 'image',
    shortDesc: 'Stamp custom text or logo watermark with opacity & tiling.',
    badge: 'New',
    icon: 'Stamp',
  },
  {
    id: 'image-filters',
    name: 'Filters & Adjust',
    category: 'image',
    shortDesc: 'Fine-tune brightness, contrast, saturation, and vintage presets.',
    badge: 'New',
    icon: 'Sliders',
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
    icon: 'Unlock',
  },
  {
    id: 'pdf-watermark',
    name: 'Watermark PDF',
    category: 'pdf',
    shortDesc: 'Add text or logo watermarks across pages with custom opacity.',
    badge: 'New',
    icon: 'Stamp',
  },
  {
    id: 'pdf-organize',
    name: 'Organize PDF',
    category: 'pdf',
    shortDesc: 'Rotate, reorder, and delete individual PDF pages visually.',
    badge: 'New',
    icon: 'RotateCw',
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
