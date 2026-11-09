declare module 'piexifjs' {
  export function load(jpegData: string): any;
  export function dump(exifObj: any): string;
  export function insert(exifStr: string, jpegData: string): string;
  export function remove(jpegData: string): string;
  export const TagValues: any;
  export const ImageIFD: any;
  export const ExifIFD: any;
  export const GPSIFD: any;
}
