/** Longest edge an uploaded photo is scaled down to before being stored. */
const MAX_EDGE = 1024
const MAX_INPUT_BYTES = 12 * 1024 * 1024

export class ImageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageError'
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new ImageError('That file could not be read. Try another photo.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () =>
      reject(new ImageError('That image could not be opened. It may be damaged or unsupported.'))
    image.src = dataUrl
  })
}

/**
 * Turns a picked file into a stored data URL, scaled down so a phone photo
 * does not eat the whole storage quota. Aspect ratio is always preserved.
 */
export async function fileToStoredImage(
  file: File,
): Promise<{ dataUrl: string; name: string; width: number; height: number }> {
  if (!file.type.startsWith('image/')) {
    throw new ImageError('That file is not an image. Choose a JPG, PNG, WebP or HEIC photo.')
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageError('That image is larger than 12MB. Choose a smaller photo.')
  }

  const original = await readAsDataUrl(file)
  const image = await loadImage(original)
  const { naturalWidth: width, naturalHeight: height } = image
  if (!width || !height) {
    throw new ImageError('That image has no usable dimensions.')
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  const targetWidth = Math.max(1, Math.round(width * scale))
  const targetHeight = Math.max(1, Math.round(height * scale))

  // An SVG has no meaningful raster size — keep the original markup instead.
  if (file.type === 'image/svg+xml') {
    return { dataUrl: original, name: file.name, width, height }
  }

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const context = canvas.getContext('2d')
  if (!context) {
    // No canvas (rare, but possible): keep the original rather than failing.
    return { dataUrl: original, name: file.name, width, height }
  }
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, targetWidth, targetHeight)

  const encoded =
    tryEncode(canvas, 'image/webp', 0.86) ?? tryEncode(canvas, 'image/jpeg', 0.86) ?? original

  return { dataUrl: encoded, name: file.name, width: targetWidth, height: targetHeight }
}

function tryEncode(canvas: HTMLCanvasElement, type: string, quality: number): string | null {
  try {
    const url = canvas.toDataURL(type, quality)
    return url.startsWith(`data:${type}`) ? url : null
  } catch {
    return null
  }
}
