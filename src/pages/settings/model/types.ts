import type { SiteContent } from '@/entities/site'

export interface SettingsPageProps {
  site: SiteContent['site']
  onChange: (site: SiteContent['site']) => void
}
