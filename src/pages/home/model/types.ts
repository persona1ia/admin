import type { Block, SiteContent } from '@/entities/site'

export interface HomePageProps {
  content: SiteContent
  onChange: (content: SiteContent) => void
  onUploadingChange?: (uploading: boolean) => void
}
export interface LandingPreviewProps {
  content: SiteContent
}
export interface BlockEditorProps {
  block: Block
  uploading: boolean
  content: SiteContent
  onChange: (block: Block) => void
  onUploadingChange: (uploading: boolean) => void
}
export interface MediaChoice {
  id: string
  url: string
}
export interface ImageFieldProps {
  label?: string
  value: string | null
  onChange: (value: string | null) => void
  onUploadingChange: (uploading: boolean) => void
}
