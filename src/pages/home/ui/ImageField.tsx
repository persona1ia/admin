import { useRef, useState, useEffect } from 'react'

import { request } from '@/shared/api'
import { Icon } from '@/shared/ui/icon'

import type { MediaChoice, ImageFieldProps } from '../model/types'

export function ImageField({
  value,
  onChange,
  onUploadingChange,
  label = 'Изображение',
}: ImageFieldProps) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<MediaChoice[]>([])
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const changeRef = useRef(onChange)
  const controllerRef = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    changeRef.current = onChange
  }, [onChange])
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      controllerRef.current?.abort()
    }
  }, [])

  async function load(append = false) {
    setOpen(true)
    setBusy(true)
    setError('')
    try {
      const result = await request<{ media: MediaChoice[] }>(
        `/api/admin/media?limit=24&offset=${append ? items.length : 0}`,
      )
      setItems(append ? [...items, ...result.media] : result.media)
      setMore(result.media.length === 24)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Не удалось загрузить медиатеку',
      )
    } finally {
      setBusy(false)
    }
  }

  async function upload(file: File) {
    setError('')
    if (
      !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(
        file.type,
      ) ||
      file.size > 10 * 1024 * 1024
    ) {
      setError('Выберите PNG, JPG, WebP или GIF размером до 10 МБ')
      return
    }
    setBusy(true)
    onUploadingChange(true)
    const controller = new AbortController()
    controllerRef.current = controller
    try {
      const item = await request<MediaChoice>('/api/admin/media', {
        body: file,
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': file.type },
      })
      if (mounted.current) {
        changeRef.current(item.id)
        setOpen(false)
      }
    } catch (cause) {
      if (mounted.current && !controller.signal.aborted) {
        setError(
          cause instanceof Error ? cause.message : 'Не удалось загрузить файл',
        )
      }
    } finally {
      if (mounted.current) {
        setBusy(false)
        onUploadingChange(false)
      }
      controllerRef.current = null
    }
  }

  return (
    <div className="landing-image-field">
      <span className="landing-field-label">{label}</span>
      <div className="landing-image-input">
        {value ? (
          <img src={`/api/media/${value}`} alt="Выбранное изображение" />
        ) : (
          <div className="landing-image-empty">
            <Icon size={26} name="image" />
          </div>
        )}
        <div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void load()}
            className="landing-link-button"
          >
            Выбрать из медиатеки
          </button>
          <label className="landing-upload-label">
            {busy ? 'Загрузка…' : 'Загрузить файл'}
            <input
              type="file"
              disabled={busy}
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={event => {
                const file = event.target.files?.[0]
                if (file) {
                  void upload(file)
                }
                event.target.value = ''
              }}
            />
          </label>
          <small>PNG, JPG, WebP, GIF · до 10 МБ</small>
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="landing-icon-button"
            aria-label="Убрать изображение"
          >
            <Icon size={16} name="close" />
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="landing-error">
          {error}
        </p>
      )}
      {open && (
        <div className="landing-image-picker">
          <div className="landing-image-picker-head">
            <span>Медиатека</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="landing-icon-button"
              aria-label="Закрыть выбор изображения"
            >
              <Icon size={16} name="close" />
            </button>
          </div>
          <div className="landing-image-choices">
            {items.map(item => (
              <button
                type="button"
                key={item.id}
                aria-label={`Выбрать изображение ${item.id.slice(0, 8)}`}
                onClick={() => {
                  onChange(item.id)
                  setOpen(false)
                }}
              >
                <img alt="" src={item.url} loading="lazy" />
              </button>
            ))}
          </div>
          {!items.length && !busy && (
            <p>Изображений пока нет. Загрузите первый файл</p>
          )}
          {busy && <p role="status">Загрузка…</p>}
          {more && (
            <button
              type="button"
              disabled={busy}
              className="landing-button"
              onClick={() => void load(true)}
            >
              Показать ещё
            </button>
          )}
        </div>
      )}
    </div>
  )
}
