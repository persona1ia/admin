import { useRef, useState, useEffect, useCallback } from 'react'

import { request, ApiError } from '@/shared/api'

import type { MediaItem, MediaPageProps } from '../model/types'

const pageSize = 24
const date = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function MediaPage({ usedImageIds = [] }: MediaPageProps) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [offset, setOffset] = useState(0)
  const [more, setMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [zoom, setZoom] = useState<MediaItem | null>(null)
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const lightbox = useRef<HTMLDialogElement>(null)
  const listRequest = useRef<AbortController | null>(null)

  const load = useCallback((nextOffset = 0) => {
    listRequest.current?.abort()
    const controller = new AbortController()
    listRequest.current = controller
    const { signal } = controller
    return request<{ media: MediaItem[] }>(
      `/api/admin/media?limit=${pageSize}&offset=${nextOffset}`,
      { signal },
    )
      .then(result => {
        if (signal.aborted) {
          return
        }
        setItems(previous =>
          nextOffset
            ? [
                ...new Map(
                  [...previous, ...result.media].map(item => [item.id, item]),
                ).values(),
              ]
            : result.media,
        )
        setOffset(nextOffset)
        setMore(result.media.length === pageSize)
      })
      .catch((cause: unknown) => {
        if (!signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Не удалось загрузить изображения',
          )
        }
      })
      .finally(() => {
        if (!signal.aborted) {
          setLoading(false)
        }
      })
  }, [])

  function refresh(nextOffset = 0) {
    setLoading(true)
    setError('')
    return load(nextOffset)
  }

  useEffect(() => {
    void load()
    return () => listRequest.current?.abort()
  }, [load])

  useEffect(() => {
    if (zoom && !lightbox.current?.open) {
      lightbox.current?.showModal()
    }
  }, [zoom])

  async function upload(files: FileList | null) {
    if (!files?.length || busy) {
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    let completed = 0
    const failures: string[] = []
    for (const file of Array.from(files)) {
      try {
        if (
          !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(
            file.type,
          )
        ) {
          throw new Error('поддерживаются PNG, JPEG, WebP и GIF')
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('размер файла больше 10 МиБ')
        }
        await request<MediaItem>('/api/admin/media', {
          body: file,
          method: 'POST',
          headers: { 'Content-Type': file.type },
        })
        completed += 1
      } catch (cause) {
        failures.push(
          `${file.name}: ${cause instanceof Error ? cause.message : 'ошибка загрузки'}`,
        )
      }
    }
    if (input.current) {
      input.current.value = ''
    }
    await refresh()
    if (completed) {
      setNotice(`Загружено файлов: ${completed}`)
    }
    if (failures.length) {
      setError(failures.join('\n'))
    }
    setBusy(false)
  }

  async function remove(item: MediaItem) {
    if (busy || usedImageIds.includes(item.id)) {
      return
    }
    if (
      !window.confirm(
        'Удалить изображение из медиатеки? Это действие нельзя отменить.',
      )
    ) {
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await request<void>(`/api/admin/media/${item.id}`, { method: 'DELETE' })
      await refresh()
      setNotice('Изображение удалено')
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.code === 'MEDIA_IN_USE'
          ? 'Изображение используется в сохранённой версии. Оно нужно для восстановления истории, поэтому удалить его нельзя.'
          : cause instanceof Error
            ? cause.message
            : 'Не удалось удалить изображение',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="media-page">
      <header className="media-heading">
        <div>
          <p className="media-eyebrow">РЕСУРСЫ / 03</p>
          <h1>Медиатека</h1>
          <p>Изображения для обложек, блоков и отзывов</p>
        </div>
        <button
          disabled={busy}
          className="media-primary"
          onClick={() => input.current?.click()}
        >
          ＋ {busy ? 'Подождите…' : 'Загрузить изображения'}
        </button>
      </header>
      <input
        hidden
        multiple
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={event => void upload(event.target.files)}
      />
      {error && (
        <div role="alert" className="media-error">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="media-notice">
          {notice}
        </div>
      )}
      <div
        onDragLeave={() => setDragging(false)}
        className={`media-dropzone ${dragging ? 'is-dragging' : ''}`}
        onDragOver={event => {
          event.preventDefault()
          setDragging(true)
        }}
        onDrop={event => {
          event.preventDefault()
          setDragging(false)
          void upload(event.dataTransfer.files)
        }}
      >
        <span aria-hidden="true" className="media-drop-icon">
          ↑
        </span>
        <div>
          <strong>Перетащите изображения сюда</strong>
          <p>PNG, JPEG, WebP или GIF · до 10 МиБ каждый</p>
        </div>
        <button disabled={busy} onClick={() => input.current?.click()}>
          Выбрать файлы
        </button>
      </div>
      <div className="media-section-heading">
        <h2>
          Все изображения{' '}
          <span>
            {items.length}
            {more ? '+' : ''}
          </span>
        </h2>
        <span>Новые сверху</span>
      </div>
      {!loading && !items.length && !error && (
        <div className="media-empty">
          <span aria-hidden="true">▧</span>
          <h2>Здесь будут ваши изображения</h2>
          <p>Загрузите первый файл, чтобы использовать его на лендинге</p>
        </div>
      )}
      <div className="media-grid">
        {items.map(item => (
          <article key={item.id} className="media-card">
            <button
              className="media-image"
              onClick={() => setZoom(item)}
              aria-label={`Открыть изображение ${item.id.slice(0, 8)}`}
            >
              <img
                src={item.url}
                loading="lazy"
                alt={`Изображение ${item.id.slice(0, 8)}`}
              />
            </button>
            <div className="media-card-meta">
              <strong>
                {item.mimeType.split('/')[1].toUpperCase()}{' '}
                <span>
                  {item.size < 1024 * 1024
                    ? `${Math.ceil(item.size / 1024)} КБ`
                    : `${(item.size / 1024 / 1024).toFixed(1)} МБ`}
                </span>
              </strong>
              <p>{date.format(new Date(item.createdAt))}</p>
              <button
                className="media-remove"
                onClick={() => void remove(item)}
                disabled={busy || usedImageIds.includes(item.id)}
                aria-label={`Удалить изображение ${item.id.slice(0, 8)}`}
                title={
                  usedImageIds.includes(item.id)
                    ? 'Сначала уберите изображение из блоков и курсов'
                    : undefined
                }
              >
                Удалить
              </button>
              {usedImageIds.includes(item.id) && (
                <p className="media-used">Используется в текущем документе</p>
              )}
            </div>
          </article>
        ))}
      </div>
      {loading && (
        <p role="status" className="media-loading">
          Загружаем медиатеку…
        </p>
      )}
      {error && !items.length && (
        <button disabled={loading} onClick={() => void refresh()}>
          Повторить загрузку
        </button>
      )}
      {more && (
        <button
          className="media-more"
          disabled={loading || busy}
          onClick={() => void refresh(offset + pageSize)}
        >
          Показать ещё
        </button>
      )}
      <p className="media-footnote">
        Изображения из сохранённых версий остаются в медиатеке для
        восстановления истории
      </p>
      {zoom && (
        <dialog
          ref={lightbox}
          className="media-lightbox"
          onClose={() => setZoom(null)}
          onClick={() => setZoom(null)}
          onCancel={() => setZoom(null)}
          aria-label="Просмотр изображения"
        >
          <button
            autoFocus
            aria-label="Закрыть просмотр"
            onClick={() => setZoom(null)}
          >
            Закрыть ×
          </button>
          <img
            src={zoom.url}
            alt="Изображение из медиатеки"
            onClick={event => event.stopPropagation()}
          />
        </dialog>
      )}
    </section>
  )
}
