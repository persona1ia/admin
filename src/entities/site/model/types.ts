export interface SiteLink {
  url: string
  label: string
}

export interface SiteContacts {
  email: string
  phone: string
  address: string
  links: SiteLink[]
}

export interface Course {
  id: string
  title: string
  currency: string
  visible: boolean
  priceMinor: number
  description: string
  imageId: string | null
}

interface BlockBase {
  id: string
  title: string
  visible: boolean
}

export type Block = BlockBase &
  (
    | {
        type: 'hero'
        text: string
        imageId: string | null
        action: SiteLink | null
      }
    | { text: string; type: 'about'; imageId: string | null }
    | { type: 'text'; text: string }
    | { type: 'courses'; courseIds: string[] }
    | { type: 'gallery'; images: { alt: string; imageId: string }[] }
    | {
        type: 'testimonials'
        items: { text: string; author: string; imageId: string | null }[]
      }
    | { type: 'faq'; items: { answer: string; question: string }[] }
    | { text: string; type: 'contacts' }
  )

export interface SiteContent {
  blocks: Block[]
  schemaVersion: 1
  courses: Course[]
  site: {
    title: string
    description: string
    contacts: SiteContacts
  }
}

export interface RevisionSummary {
  savedAt: string
  revision: number
}

export interface SavedContent extends RevisionSummary {
  content: SiteContent
}
