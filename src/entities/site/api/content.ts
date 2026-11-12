import { request } from '@/shared/api'

import type { SiteContent, SavedContent } from '../model/types'

export function getContent(): Promise<SavedContent> {
  return request<SavedContent>('/api/admin/content')
}

export function saveContent(
  baseRevision: number,
  content: SiteContent,
): Promise<SavedContent> {
  return request<SavedContent>('/api/admin/content', {
    method: 'PUT',
    body: JSON.stringify({ content, baseRevision }),
  })
}
