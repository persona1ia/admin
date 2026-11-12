import type { Block } from '@/entities/site'

export const blockTypes: Block['type'][] = [
  'hero',
  'about',
  'text',
  'courses',
  'gallery',
  'testimonials',
  'faq',
  'contacts',
]

export const blockNames: Record<Block['type'], string> = {
  gallery: 'Галерея',
  hero: 'Первый экран',
  about: 'Об эксперте',
  contacts: 'Контакты',
  text: 'Текстовый блок',
  testimonials: 'Отзывы',
  faq: 'Вопросы и ответы',
  courses: 'Каталог курсов',
}
export const blockDescriptions: Record<Block['type'], string> = {
  text: 'Свободный текст',
  about: 'Знакомство и опыт',
  faq: 'Ответы на частые вопросы',
  gallery: 'Изображения с подписями',
  contacts: 'Способы связаться с вами',
  testimonials: 'Истории ваших учеников',
  hero: 'Заголовок, изображение и кнопка',
  courses: 'Выбранные курсы и их порядок',
}
