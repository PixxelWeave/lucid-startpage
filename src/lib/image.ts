/**
 * 把用户上传的图片裁成正方形并缩放，返回 data URL。
 * 缩小体积以便存进 chrome.storage。
 */
export async function imageFileToDataUrl(file: File, size = 128): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - side) / 2
  const sy = (bitmap.height - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is not supported')

  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size)
  bitmap.close()

  return canvas.toDataURL('image/webp', 0.9)
}

/** 等比缩小到长边不超过 maxSide（不放大），绘制到新的 canvas。 */
function drawScaled(bitmap: ImageBitmap, maxSide: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is not supported')

  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode image'))), type, quality)
  })
}

export interface CompressedImage {
  /** 压缩后的图片（WebP） */
  blob: Blob
  /** 极小的缩略图 data URL，放大后即为模糊占位图 */
  placeholder: string
}

/**
 * 压缩大图（如背景图片）：按 EXIF 方向摆正，长边不超过 maxSide，转为 WebP；
 * 同时生成长边 placeholderSide 像素的占位图。
 */
export async function compressImage(
  file: Blob,
  maxSide: number,
  placeholderSide = 32,
): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const blob = await canvasToBlob(drawScaled(bitmap, maxSide), 'image/webp', 0.88)
    const placeholder = drawScaled(bitmap, placeholderSide).toDataURL('image/webp', 0.6)
    return { blob, placeholder }
  } finally {
    bitmap.close()
  }
}
