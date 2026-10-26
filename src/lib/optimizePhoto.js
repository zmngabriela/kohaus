import { validatePhotoContent } from './mediaSecurity'

export function photoDimensions(width, height, limit = 2400) {
  const ratio = Math.min(1, limit / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) }
}

// Convert before upload: no originals or duplicate files are added to the repository.
export async function optimizePhoto(file) {
  await validatePhotoContent(file)
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    const size = photoDimensions(image.naturalWidth, image.naturalHeight)
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Não foi possível preparar a imagem.')
    context.drawImage(image, 0, 0, size.width, size.height)
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.84))
    if (!blob) throw new Error('Não foi possível otimizar a imagem.')
    // Small originals are already efficient; never enlarge the downloaded payload.
    if (blob.size >= file.size) return file
    const extension = blob.type === 'image/webp' ? 'webp' : 'png'
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.${extension}`, { type: blob.type })
  } finally {
    URL.revokeObjectURL(url)
  }
}
