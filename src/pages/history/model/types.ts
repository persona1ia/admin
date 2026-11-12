import type { SavedContent } from '@/entities/site'

export interface HistoryPageProps {
  revision: number
  hasUnsavedChanges: boolean
  onBusyChange?: (busy: boolean) => void
  onRestored: (value: SavedContent) => void
}
