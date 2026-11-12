import type { SiteContent } from './types'

export function collectImageIds(content: SiteContent): string[] {
  const ids = new Set<string>()
  for (const course of content.courses) {
    if (course.imageId) {
      ids.add(course.imageId)
    }
  }
  for (const block of content.blocks) {
    if ('imageId' in block && block.imageId) {
      ids.add(block.imageId)
    }
    if (block.type === 'gallery') {
      block.images.forEach(image => ids.add(image.imageId))
    }
    if (block.type === 'testimonials') {
      block.items.forEach(item => {
        if (item.imageId) {
          ids.add(item.imageId)
        }
      })
    }
  }
  return [...ids]
}
