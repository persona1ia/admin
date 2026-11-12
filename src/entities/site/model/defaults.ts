import type { Block, Course, SiteContent } from './types'

export function emptyContent(): SiteContent {
  return {
    blocks: [],
    courses: [],
    schemaVersion: 1,
    site: {
      title: '',
      description: '',
      contacts: { email: '', phone: '', links: [], address: '' },
    },
  }
}

export function createCourse(): Course {
  return {
    priceMinor: 0,
    imageId: null,
    visible: true,
    description: '',
    currency: 'RUB',
    title: 'Новый курс',
    id: `course-${crypto.randomUUID()}`,
  }
}

export function createBlock(type: Block['type']): Block {
  const base = { visible: true, id: `${type}-${crypto.randomUUID()}` }
  switch (type) {
    case 'hero':
      return {
        ...base,
        type,
        text: '',
        action: null,
        imageId: null,
        title: 'Первый экран',
      }
    case 'about':
      return { ...base, type, text: '', imageId: null, title: 'Об авторе' }
    case 'text':
      return { ...base, type, text: '', title: 'Текстовый блок' }
    case 'courses':
      return { ...base, type, courseIds: [], title: 'Курсы' }
    case 'gallery':
      return { ...base, type, images: [], title: 'Галерея' }
    case 'testimonials':
      return { ...base, type, items: [], title: 'Отзывы' }
    case 'faq':
      return { ...base, type, items: [], title: 'Вопросы и ответы' }
    case 'contacts':
      return { ...base, type, text: '', title: 'Контакты' }
  }
}
