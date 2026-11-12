import type { IconProps } from '@/shared/ui/icon'

export type Section =
  'landing' | 'courses' | 'media' | 'orders' | 'history' | 'settings'
export interface NavigationItem {
  id: Section
  label: string
  icon: IconProps['name']
}
export interface Session {
  authenticated: boolean
  passwordConfigured: boolean
}
