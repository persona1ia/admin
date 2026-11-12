import test from 'node:test'
import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'

import { request, ApiError } from '../src/shared/api/request.ts'
import { validateContent } from '../src/entities/site/model/validate.ts'
import {
  createBlock,
  createCourse,
  emptyContent,
} from '../src/entities/site/model/defaults.ts'

const serverModule = new URL('../../server/dist/http/index.js', import.meta.url)
const available = await access(serverModule).then(
  () => true,
  () => false,
)

test(
  'contact email validation agrees with the server schema',
  { skip: available ? false : 'Build ../server first' },
  async () => {
    const { siteContentSchema } =
      await import('../../server/dist/content/index.js')
    const content = emptyContent()
    for (const email of [
      '',
      'name@example.com',
      'name+tag@example.com',
      'name.surname@sub.example.org',
      "o'hara@example.com",
      'UPPER_CASE@example.com',
      '.name@example.com',
      'name..surname@example.com',
      'name.@example.com',
      'name@-example.com',
      'name@example.c',
      'name@exam_ple.com',
      'name@example..com',
      'name surname@example.com',
      'name@example.com ',
      'имя@example.com',
      'name@пример.рф',
      `${'a'.repeat(243)}@example.com`,
    ]) {
      content.site.contacts.email = email
      assert.equal(
        validateContent(content).length === 0,
        siteContentSchema.safeParse(content).success,
        email,
      )
    }
  },
)

test(
  'admin client works with the neighboring server using an isolated in-memory database',
  { skip: available ? false : 'Build ../server first' },
  async t => {
    const { createHttpServer } = await import(serverModule.href)
    const { openDatabase } = await import('../../server/dist/storage/index.js')
    const { resetPassword } = await import('../../server/dist/auth/service.js')
    const db = openDatabase(':memory:')
    const password = await resetPassword(db)
    const server = createHttpServer({ database: db, secureCookies: false })
    const address = await server.listen({ port: 0, host: '127.0.0.1' })
    const originalFetch = globalThis.fetch
    const originalWindow = globalThis.window
    let cookie = ''
    globalThis.window = new EventTarget()
    globalThis.fetch = async (url, options = {}) => {
      const headers = new Headers(options.headers)
      headers.set('Origin', address)
      if (cookie) {
        headers.set('Cookie', cookie)
      }
      const response = await originalFetch(new URL(url, address), {
        ...options,
        headers,
      })
      const nextCookie = response.headers.get('Set-Cookie')
      if (nextCookie) {
        cookie = nextCookie.split(';')[0]
      }
      return response
    }
    t.after(async () => {
      globalThis.fetch = originalFetch
      globalThis.window = originalWindow
      await server.close()
      db.close()
    })

    assert.deepEqual(await request('/api/auth/session'), {
      authenticated: false,
      passwordConfigured: true,
    })
    await assert.rejects(request('/api/admin/content'), { status: 401 })
    await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
    const initial = await request('/api/admin/content')
    assert.equal(initial.revision, 1)
    assert.deepEqual(initial.content, emptyContent())

    const bytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3XcAAAAASUVORK5CYII=',
      'base64',
    )
    const media = await request('/api/admin/media', {
      body: bytes,
      method: 'POST',
      headers: { 'Content-Type': 'image/png' },
    })
    const content = emptyContent()
    content.site.title = 'Интеграционная проверка'
    const course = createCourse()
    course.title = 'Проверочный курс'
    course.priceMinor = 99000
    course.imageId = media.id
    content.courses.push(course)
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
      const block = createBlock(type)
      if (type === 'courses') {
        block.courseIds = [course.id]
      }
      if (type === 'gallery') {
        block.images = [{ alt: 'Проверка', imageId: media.id }]
      }
      if (type === 'testimonials') {
        block.items = [{ text: 'Текст', author: 'Автор', imageId: media.id }]
      }
      if (type === 'faq') {
        block.items = [{ answer: 'Ответ', question: 'Вопрос' }]
      }
      content.blocks.push(block)
    }
    assert.deepEqual(validateContent(content), [])
    const saved = await request('/api/admin/content', {
      method: 'PUT',
      body: JSON.stringify({ content, baseRevision: initial.revision }),
    })
    assert.deepEqual(saved.content, content)
    assert.equal(saved.revision, initial.revision + 1)
    assert.deepEqual((await request('/api/site')).content, content)
    await assert.rejects(
      request('/api/admin/content', {
        method: 'PUT',
        body: JSON.stringify({ content, baseRevision: initial.revision }),
      }),
      error => error instanceof ApiError && error.code === 'REVISION_CONFLICT',
    )
    await assert.rejects(
      request(`/api/admin/media/${media.id}`, { method: 'DELETE' }),
      { code: 'MEDIA_IN_USE' },
    )

    const backup = await request('/api/admin/backups/current')
    assert.equal(backup.format, 'persona1ia-backup')
    assert.equal(backup.media.length, 1)
    const cleared = await request('/api/admin/content', {
      method: 'PUT',
      body: JSON.stringify({
        content: emptyContent(),
        baseRevision: saved.revision,
      }),
    })
    const restored = await request('/api/admin/backups/restore', {
      method: 'POST',
      body: JSON.stringify({ backup, baseRevision: cleared.revision }),
    })
    assert.deepEqual(restored.content, content)
    assert.equal((await request('/api/admin/revisions')).revisions.length, 4)

    await assert.rejects(
      request('/api/admin/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: 'wrong-password',
          newPassword: 'new-isolated-password',
        }),
      }),
      { code: 'invalid_credentials' },
    )
    assert.equal((await request('/api/auth/session')).authenticated, true)
    await request('/api/admin/password', {
      method: 'PUT',
      body: JSON.stringify({
        currentPassword: password,
        newPassword: 'new-isolated-password',
      }),
    })
    assert.equal((await request('/api/auth/session')).authenticated, true)
    assert.equal(
      await request('/api/auth/logout', { method: 'POST' }),
      undefined,
    )
    await assert.rejects(request('/api/admin/content'), {
      code: 'UNAUTHORIZED',
    })
  },
)
