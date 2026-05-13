export interface CompressResult {
  blob: Blob;
  base64: string;
  mediaType: string;
  width: number;
  height: number;
  originalBytes: number;
  compressedBytes: number;
}

const MAX_EDGE = 2048;
const JPEG_QUALITY = 0.85;
const SUPPORTED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBase64(url: string): string {
  const comma = url.indexOf(',');
  return comma >= 0 ? url.slice(comma + 1) : url;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image'));
    img.src = url;
  });
}

export async function compressImage(file: Blob): Promise<CompressResult> {
  const type = file.type || 'image/png';
  if (!SUPPORTED.has(type)) {
    throw new Error(`Unsupported image type: ${type}`);
  }

  const originalBytes = file.size;
  const dataUrl = await blobToDataUrl(file);

  if (type === 'image/gif') {
    return {
      blob: file,
      base64: dataUrlToBase64(dataUrl),
      mediaType: type,
      width: 0,
      height: 0,
      originalBytes,
      compressedBytes: originalBytes,
    };
  }

  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  if (scale >= 1 && originalBytes <= 1_500_000) {
    return {
      blob: file,
      base64: dataUrlToBase64(dataUrl),
      mediaType: type,
      width: img.width,
      height: img.height,
      originalBytes,
      compressedBytes: originalBytes,
    };
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(img, 0, 0, w, h);

  const targetType = type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      targetType,
      JPEG_QUALITY
    )
  );

  const outUrl = await blobToDataUrl(blob);
  return {
    blob,
    base64: dataUrlToBase64(outUrl),
    mediaType: targetType,
    width: w,
    height: h,
    originalBytes,
    compressedBytes: blob.size,
  };
}
