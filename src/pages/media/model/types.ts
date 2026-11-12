export interface MediaItem {
  id: string
  url: string
  size: number
  kind: 'image'
  mimeType: string
  createdAt: string
}

export interface MediaPageProps {
  usedImageIds?: string[]
}
