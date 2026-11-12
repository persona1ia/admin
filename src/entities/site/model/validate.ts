import type { SiteLink, SiteContent } from './types'

const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/
const mediaIdPattern = /^[a-f0-9]{64}$/

function isSafeUrl(value: string): boolean {
  if (!value || value.length > 2048) {
    return false
  }
  for (const character of value) {
    const code = character.charCodeAt(0)
    if (code <= 32 || code === 127 || character === '\\') {
      return false
    }
  }
  if (value.startsWith('#')) {
    return value.length > 1
  }
  if (value.startsWith('/')) {
    return !value.startsWith('//')
  }
  try {
    return ['https:', 'http:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

export function validateContent(content: SiteContent): string[] {
  const errors: string[] = []
  const text = (
    value: string,
    max: number,
    label: string,
    required = false,
  ) => {
    if (required && !value.trim()) {
      errors.push(`${label}: заполните поле`)
    }
    if (value.length > max) {
      errors.push(`${label}: не более ${max.toLocaleString('ru-RU')} символов`)
    }
  }
  const image = (id: string | null, label: string) => {
    if (id !== null && !mediaIdPattern.test(id)) {
      errors.push(`${label}: выберите загруженное изображение`)
    }
  }
  const link = (value: SiteLink, label: string) => {
    text(value.label, 200, `${label}, подпись`, true)
    if (!isSafeUrl(value.url)) {
      errors.push(
        `${label}: укажите HTTP(S)-адрес, путь с / или якорь с # без пробелов`,
      )
    }
  }
  const length = (items: unknown[], max: number, label: string) => {
    if (items.length > max) {
      errors.push(`${label}: не более ${max} элементов`)
    }
  }

  if (content.schemaVersion !== 1) {
    errors.push('Версия документа не поддерживается')
  }
  if (
    new TextEncoder().encode(JSON.stringify(content)).byteLength >
    1024 * 1024
  ) {
    errors.push('Размер настроек не должен превышать 1 МБ')
  }
  text(content.site.title, 200, 'Название сайта')
  text(content.site.description, 2000, 'Описание сайта')
  text(content.site.contacts.phone, 100, 'Телефон')
  text(content.site.contacts.address, 1000, 'Адрес')
  const email = content.site.contacts.email
  if (
    email &&
    (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    errors.push('Email: укажите корректный адрес электронной почты')
  }
  length(content.site.contacts.links, 50, 'Ссылки в контактах')
  content.site.contacts.links.forEach((value, index) =>
    link(value, `Ссылка ${index + 1}`),
  )

  length(content.courses, 500, 'Курсы')
  const courseIds = new Set<string>()
  content.courses.forEach((course, index) => {
    const label = `Курс ${index + 1}`
    if (!idPattern.test(course.id) || courseIds.has(course.id)) {
      errors.push(
        `${label}: идентификатор должен быть уникальным, содержать только латинские буквы, цифры, дефис и подчёркивание (до 100 символов)`,
      )
    }
    courseIds.add(course.id)
    text(course.title, 200, `${label}, название`, true)
    text(course.description, 20_000, `${label}, описание`)
    image(course.imageId, `${label}, обложка`)
    if (!Number.isSafeInteger(course.priceMinor) || course.priceMinor < 0) {
      errors.push(
        `${label}: укажите неотрицательную цену с точностью до копеек`,
      )
    }
    if (!/^[A-Z]{3}$/.test(course.currency)) {
      errors.push(
        `${label}: валюта должна содержать три заглавные латинские буквы, например RUB`,
      )
    }
  })

  length(content.blocks, 200, 'Блоки страницы')
  const blockIds = new Set<string>()
  content.blocks.forEach((block, index) => {
    const label = `Блок ${index + 1}`
    if (!idPattern.test(block.id) || blockIds.has(block.id)) {
      errors.push(
        `${label}: идентификатор должен быть уникальным, содержать только латинские буквы, цифры, дефис и подчёркивание (до 100 символов)`,
      )
    }
    blockIds.add(block.id)
    text(block.title, 200, `${label}, заголовок`)
    if ('text' in block) {
      text(block.text, 20_000, `${label}, текст`)
    }
    if ('imageId' in block) {
      image(block.imageId, `${label}, изображение`)
    }
    if (block.type === 'hero' && block.action) {
      link(block.action, `${label}, кнопка`)
    }
    if (block.type === 'courses') {
      length(block.courseIds, 500, `${label}, курсы`)
      const references = new Set<string>()
      block.courseIds.forEach(id => {
        if (!courseIds.has(id) || references.has(id)) {
          errors.push(
            `${label}: выбранные курсы должны существовать и не повторяться`,
          )
        }
        references.add(id)
      })
    }
    if (block.type === 'gallery') {
      length(block.images, 200, `${label}, изображения`)
      block.images.forEach((item, itemIndex) => {
        image(item.imageId, `${label}, изображение ${itemIndex + 1}`)
        text(item.alt, 200, `${label}, описание изображения ${itemIndex + 1}`)
      })
    }
    if (block.type === 'testimonials') {
      length(block.items, 200, `${label}, отзывы`)
      block.items.forEach((item, itemIndex) => {
        text(item.author, 200, `${label}, автор отзыва ${itemIndex + 1}`, true)
        text(item.text, 20_000, `${label}, отзыв ${itemIndex + 1}`)
        image(item.imageId, `${label}, фото автора ${itemIndex + 1}`)
      })
    }
    if (block.type === 'faq') {
      length(block.items, 200, `${label}, вопросы`)
      block.items.forEach((item, itemIndex) => {
        text(item.question, 200, `${label}, вопрос ${itemIndex + 1}`, true)
        text(item.answer, 20_000, `${label}, ответ ${itemIndex + 1}`)
      })
    }
  })
  return [...new Set(errors)]
}
