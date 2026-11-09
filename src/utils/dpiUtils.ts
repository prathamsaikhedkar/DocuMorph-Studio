import piexif from 'piexifjs';

export interface DpiInfo {
  dpiX: number;
  dpiY: number;
  source: 'jfif' | 'exif' | 'phys' | 'default';
  unit: 'inch' | 'cm';
  widthInches: number;
  heightInches: number;
  widthCm: number;
  heightCm: number;
}

// CRC32 calculation table for PNG chunks
const makeCrcTable = (): Uint32Array => {
  let c: number;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
};

const crcTable = makeCrcTable();

const crc32 = (buf: Uint8Array, offset: number, length: number): number => {
  let c = 0xffffffff;
  for (let i = 0; i < length; i++) {
    c = crcTable[(c ^ buf[offset + i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
};

/**
 * Detect DPI from JPEG or PNG ArrayBuffer
 */
export function detectDpi(buffer: ArrayBuffer, width: number, height: number): DpiInfo {
  const bytes = new Uint8Array(buffer);
  
  // Default values
  let dpiX = 72;
  let dpiY = 72;
  let source: DpiInfo['source'] = 'default';
  let unit: 'inch' | 'cm' = 'inch';

  // Check if JPEG (0xFF 0xD8)
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset < bytes.length) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      const length = (bytes[offset + 2] << 8) | bytes[offset + 3];

      // JFIF APP0 Marker (0xFF 0xE0)
      if (marker === 0xe0) {
        // Identifier 'JFIF\0'
        if (
          bytes[offset + 4] === 0x4a && // J
          bytes[offset + 5] === 0x46 && // F
          bytes[offset + 6] === 0x49 && // I
          bytes[offset + 7] === 0x46 && // F
          bytes[offset + 8] === 0x00
        ) {
          const densityUnit = bytes[offset + 11];
          const xDens = (bytes[offset + 12] << 8) | bytes[offset + 13];
          const yDens = (bytes[offset + 14] << 8) | bytes[offset + 15];

          if (xDens > 0 && yDens > 0) {
            if (densityUnit === 1) { // dots per inch
              dpiX = xDens;
              dpiY = yDens;
              source = 'jfif';
              unit = 'inch';
              break;
            } else if (densityUnit === 2) { // dots per cm
              dpiX = Math.round(xDens * 2.54);
              dpiY = Math.round(yDens * 2.54);
              source = 'jfif';
              unit = 'cm';
              break;
            }
          }
        }
      }

      // Check EXIF APP1 Marker (0xFF 0xE1)
      if (marker === 0xe1) {
        try {
          const binaryStr = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
          const exifData = piexif.load(binaryStr);
          if (exifData && exifData['0th']) {
            const xRes = exifData['0th'][piexif.ImageIFD.XResolution];
            const yRes = exifData['0th'][piexif.ImageIFD.YResolution];
            const resUnit = exifData['0th'][piexif.ImageIFD.ResolutionUnit] || 2;

            if (xRes && Array.isArray(xRes)) {
              const valX = Math.round(xRes[0] / xRes[1]);
              const valY = yRes && Array.isArray(yRes) ? Math.round(yRes[0] / yRes[1]) : valX;
              if (valX > 0) {
                if (resUnit === 3) { // cm
                  dpiX = Math.round(valX * 2.54);
                  dpiY = Math.round(valY * 2.54);
                  unit = 'cm';
                } else {
                  dpiX = valX;
                  dpiY = valY;
                  unit = 'inch';
                }
                source = 'exif';
                break;
              }
            }
          }
        } catch {
          // EXIF parsing fallback
        }
      }

      offset += 2 + length;
    }
  }

  // Check if PNG (0x89 'PNG' 0x0D 0x0A 0x1A 0x0A)
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    let offset = 8;
    while (offset < bytes.length) {
      const length = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
      const type = String.fromCharCode(
        bytes[offset + 4],
        bytes[offset + 5],
        bytes[offset + 6],
        bytes[offset + 7]
      );

      if (type === 'pHYs') {
        const ppuX = (bytes[offset + 8] << 24) | (bytes[offset + 9] << 16) | (bytes[offset + 10] << 8) | bytes[offset + 11];
        const ppuY = (bytes[offset + 12] << 24) | (bytes[offset + 13] << 16) | (bytes[offset + 14] << 8) | bytes[offset + 15];
        const unitSpecifier = bytes[offset + 16];

        if (unitSpecifier === 1) { // 1 = meters
          dpiX = Math.round(ppuX / 39.37007874);
          dpiY = Math.round(ppuY / 39.37007874);
          source = 'phys';
        }
        break;
      }

      offset += 12 + length;
    }
  }

  const widthInches = width > 0 ? Number((width / dpiX).toFixed(2)) : 0;
  const heightInches = height > 0 ? Number((height / dpiY).toFixed(2)) : 0;
  const widthCm = Number((widthInches * 2.54).toFixed(2));
  const heightCm = Number((heightInches * 2.54).toFixed(2));

  return {
    dpiX,
    dpiY,
    source,
    unit,
    widthInches,
    heightInches,
    widthCm,
    heightCm,
  };
}

/**
 * Changes DPI for JPEG by modifying/injecting JFIF APP0 and EXIF segments
 */
export function changeJpegDpi(buffer: ArrayBuffer, targetDpi: number): Uint8Array {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error('Not a valid JPEG image');
  }

  // First check if there is an existing JFIF APP0 marker
  let hasJfif = false;
  let jfifOffset = -1;

  if (bytes[2] === 0xff && bytes[3] === 0xe0) {
    if (
      bytes[6] === 0x4a && // J
      bytes[7] === 0x46 && // F
      bytes[8] === 0x49 && // I
      bytes[9] === 0x46 && // F
      bytes[10] === 0x00
    ) {
      hasJfif = true;
      jfifOffset = 2;
    }
  }

  let workingBytes: Uint8Array;

  if (hasJfif && jfifOffset >= 0) {
    // Clone and overwrite JFIF density units (1 = inch) and X/Y density
    workingBytes = new Uint8Array(bytes);
    workingBytes[jfifOffset + 11] = 1; // Units: 1 = dots per inch
    workingBytes[jfifOffset + 12] = (targetDpi >> 8) & 0xff;
    workingBytes[jfifOffset + 13] = targetDpi & 0xff;
    workingBytes[jfifOffset + 14] = (targetDpi >> 8) & 0xff;
    workingBytes[jfifOffset + 15] = targetDpi & 0xff;
  } else {
    // Inject standard 18-byte JFIF APP0 segment right after SOI marker (bytes 0,1)
    // APP0 marker: FF E0, length: 00 10 (16 bytes), 'JFIF\0', ver 1.2, units 1 (dpi), targetDpi (2 bytes), targetDpi (2 bytes), 0, 0
    const jfifSegment = new Uint8Array([
      0xff, 0xe0, // APP0
      0x00, 0x10, // length = 16 bytes
      0x4a, 0x46, 0x49, 0x46, 0x00, // 'JFIF\0'
      0x01, 0x02, // version 1.2
      0x01,       // units: 1 = dots per inch
      (targetDpi >> 8) & 0xff, targetDpi & 0xff, // Xdensity
      (targetDpi >> 8) & 0xff, targetDpi & 0xff, // Ydensity
      0x00, 0x00  // thumbnail dimensions 0,0
    ]);

    workingBytes = new Uint8Array(bytes.length + jfifSegment.length);
    workingBytes.set(bytes.subarray(0, 2), 0);
    workingBytes.set(jfifSegment, 2);
    workingBytes.set(bytes.subarray(2), 2 + jfifSegment.length);
  }

  // Also update / insert EXIF XResolution, YResolution, and ResolutionUnit
  try {
    const binaryStr = Array.from(workingBytes).map(b => String.fromCharCode(b)).join('');
    let exifObj: any;
    try {
      exifObj = piexif.load(binaryStr);
    } catch {
      exifObj = { '0th': {}, 'Exif': {}, 'GPS': {}, 'Interop': {}, '1st': {}, 'thumbnail': null };
    }

    if (!exifObj['0th']) exifObj['0th'] = {};
    exifObj['0th'][piexif.ImageIFD.XResolution] = [targetDpi, 1];
    exifObj['0th'][piexif.ImageIFD.YResolution] = [targetDpi, 1];
    exifObj['0th'][piexif.ImageIFD.ResolutionUnit] = 2; // 2 = inches

    const exifBytes = piexif.dump(exifObj);
    const newBinaryStr = piexif.insert(exifBytes, binaryStr);
    const resultBytes = new Uint8Array(newBinaryStr.length);
    for (let i = 0; i < newBinaryStr.length; i++) {
      resultBytes[i] = newBinaryStr.charCodeAt(i);
    }
    return resultBytes;
  } catch (err) {
    console.warn('EXIF injection failed, falling back to JFIF-only patch:', err);
    return workingBytes;
  }
}

/**
 * Changes DPI for PNG by inserting or modifying pHYs chunk
 */
export function changePngDpi(buffer: ArrayBuffer, targetDpi: number): Uint8Array {
  const bytes = new Uint8Array(buffer);
  if (
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47
  ) {
    throw new Error('Not a valid PNG image');
  }

  // 1 meter = 39.37007874 inches
  const ppm = Math.round(targetDpi * 39.37007874);

  // Build the 21-byte pHYs chunk (4 bytes length + 4 bytes 'pHYs' + 9 bytes data + 4 bytes CRC)
  const physChunk = new Uint8Array(21);
  const view = new DataView(physChunk.buffer);
  view.setUint32(0, 9); // data length = 9
  physChunk[4] = 0x70; // 'p'
  physChunk[5] = 0x48; // 'H'
  physChunk[6] = 0x79; // 'y'
  physChunk[7] = 0x73; // 's'

  view.setUint32(8, ppm);  // X pixels per meter
  view.setUint32(12, ppm); // Y pixels per meter
  physChunk[16] = 1;       // Unit specifier: 1 = meter

  // CRC is calculated over chunk type + data (from index 4 to 16, length 13)
  const crcVal = crc32(physChunk, 4, 13);
  view.setUint32(17, crcVal);

  // Search for existing pHYs chunk
  let offset = 8;
  let physStart = -1;
  let physEnd = -1;
  let firstIdatOffset = -1;

  while (offset < bytes.length) {
    const chunkLen = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7]
    );

    if (type === 'pHYs') {
      physStart = offset;
      physEnd = offset + 12 + chunkLen;
      break;
    }

    if (type === 'IDAT' && firstIdatOffset === -1) {
      firstIdatOffset = offset;
    }

    offset += 12 + chunkLen;
  }

  if (physStart !== -1) {
    // Replace existing pHYs chunk
    const before = bytes.subarray(0, physStart);
    const after = bytes.subarray(physEnd);
    const result = new Uint8Array(before.length + physChunk.length + after.length);
    result.set(before, 0);
    result.set(physChunk, before.length);
    result.set(after, before.length + physChunk.length);
    return result;
  } else {
    // Insert pHYs chunk right before the first IDAT or after IHDR
    const insertPos = firstIdatOffset !== -1 ? firstIdatOffset : (8 + 12 + 13); // after IHDR
    const before = bytes.subarray(0, insertPos);
    const after = bytes.subarray(insertPos);
    const result = new Uint8Array(before.length + physChunk.length + after.length);
    result.set(before, 0);
    result.set(physChunk, before.length);
    result.set(after, before.length + physChunk.length);
    return result;
  }
}
