import test from 'node:test'
import assert from 'node:assert/strict'

import { request, ApiError } from '../src/shared/api/request.ts'
import { formatMoney } from '../src/shared/lib/money/format-money.ts'
import { validateContent } from '../src/entities/site/model/validate.ts'
import {
  createBlock,
  createCourse,
  emptyContent,
} from '../src/entities/site/model/defaults.ts'

test('money formatting respects currency minor units and incomplete input', () => {
  assert.match(formatMoney(99000, 'RUB'), /^990\D/)
  assert.match(formatMoney(990, 'JPY'), /^990\D/)
  assert.match(formatMoney(99001, 'KWD'), /^99,001\D/)
  assert.match(formatMoney(199, 'R'), /^1,99 R$/)
})

test('valid content includes all supported block types', () => {
  const content = emptyContent()
  assert.deepEqual(validateContent(content), [])
  for (const type of [
    'hero',
    'about',
    'text',
    'courses',
    'gallery',
    'testimonials',
    'faq',
    'contacts',
  ]) {
    content.blocks.push(createBlock(type))
  }
  content.courses.push(createCourse())
  assert.deepEqual(validateContent(content), [])
})

test('links reject script URLs, protocol-relative URLs and control characters', () => {
  const content = emptyContent()
  for (const url of [
    'javascript:alert(1)',
    '//evil.test',
    '/\\evil.test',
    '#',
    'https://example.com/a b',
    '/\nadmin',
  ]) {
    content.site.contacts.links = [{ url, label: 'Ссылка' }]
    assert.ok(validateContent(content).length, url)
  }
  for (const url of [
    'https://example.com',
    'http://example.com/a',
    '/courses',
    '#courses',
  ]) {
    content.site.contacts.links = [{ url, label: 'Ссылка' }]
    assert.deepEqual(validateContent(content), [], url)
  }
})

test('publishing rejects dangling course references and duplicated IDs', () => {
  const content = emptyContent()
  const course = createCourse()
  content.courses.push(course)
  const block = createBlock('courses')
  block.courseIds = ['missing']
  content.blocks.push(block)
  assert.ok(
    validateContent(content).some(message =>
      message.includes('должны существовать'),
    ),
  )
  block.courseIds = [course.id, course.id]
  assert.ok(validateContent(content).length)
  block.courseIds = [course.id]
  assert.deepEqual(validateContent(content), [])
  content.courses.push({ ...course })
  assert.ok(
    validateContent(content).some(message => message.includes('уникальным')),
  )
})

test('publishing validates minor-unit prices and required content', () => {
  const content = emptyContent()
  const course = createCourse()
  content.courses.push(course)
  for (const priceMinor of [
    -1,
    0.1,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    course.priceMinor = priceMinor
    assert.ok(validateContent(content).length)
  }
  course.priceMinor = 99000
  course.title = ' '
  assert.ok(
    validateContent(content).some(message => message.includes('заполните')),
  )
  course.title = 'Курс'
  course.description = 'а'.repeat(20_001)
  assert.ok(
    validateContent(content).some(message => message.includes('символов')),
  )
})

test('client preserves binary uploads, cookies and cancellation', async t => {
  const originalFetch = globalThis.fetch
  t.after(() => {
    globalThis.fetch = originalFetch
  })
  const upload = new Blob(['image-bytes'], { type: 'image/png' })
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.body, upload)
    assert.equal(options.credentials, 'same-origin')
    assert.equal(options.headers.get('Content-Type'), 'image/png')
    return new Response(null, { status: 204 })
  }
  assert.equal(
    await request('/api/admin/media', {
      body: upload,
      method: 'POST',
      headers: { 'Content-Type': upload.type },
    }),
    undefined,
  )
  globalThis.fetch = async () => {
    throw new DOMException('Cancelled', 'AbortError')
  }
  await assert.rejects(request('/api/admin/content'), { name: 'AbortError' })
})

test('client reports proxy and network errors without losing HTTP status', async t => {
  const originalFetch = globalThis.fetch
  t.after(() => {
    globalThis.fetch = originalFetch
  })
  globalThis.fetch = async () =>
    new Response('<html>Bad gateway</html>', { status: 502 })
  await assert.rejects(
    request('/api/admin/content'),
    error => error instanceof ApiError && error.status === 502,
  )
  globalThis.fetch = async () => {
    throw new TypeError('fetch failed')
  }
  await assert.rejects(
    request('/api/admin/content'),
    error => error instanceof ApiError && error.code === 'NETWORK_ERROR',
  )
})

test('only an expired session asks the application to sign in again', async t => {
  const originalFetch = globalThis.fetch
  const originalWindow = globalThis.window
  t.after(() => {
    globalThis.fetch = originalFetch
    globalThis.window = originalWindow
  })
  globalThis.window = new EventTarget()
  let expired = 0
  globalThis.window.addEventListener('session-expired', () => {
    expired += 1
  })
  globalThis.fetch = async () =>
    Response.json({ error: 'invalid_credentials' }, { status: 401 })
  await assert.rejects(
    request('/api/admin/password', { body: '{}', method: 'PUT' }),
  )
  await assert.rejects(
    request('/api/auth/login', { body: '{}', method: 'POST' }),
  )
  assert.equal(expired, 0)
  globalThis.fetch = async () =>
    Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  await assert.rejects(request('/api/admin/content'))
  assert.equal(expired, 1)
})
