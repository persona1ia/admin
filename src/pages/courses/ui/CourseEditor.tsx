import { useRef, useState, useEffect } from 'react'

import { request } from '@/shared/api'
import { Icon } from '@/shared/ui/icon'
import { currencyFractionDigits } from '@/shared/lib/money'

import type { MediaChoice, CourseEditorProps } from '../model/types'

export function CourseEditor({
  course,
  onChange,
  onDelete,
  onUploadingChange,
}: CourseEditorProps) {
  const [media, setMedia] = useState<MediaChoice[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const current = useRef({ course, onChange, onUploadingChange })
  const controller = useRef<AbortController | null>(null)
  const digits = currencyFractionDigits(course.currency)
  const factor = 10 ** digits
  const [price, setPrice] = useState(
    (course.priceMinor / factor).toFixed(digits),
  )
  const [priceError, setPriceError] = useState('')

  useEffect(() => {
    current.current = { course, onChange, onUploadingChange }
  }, [course, onChange, onUploadingChange])
  useEffect(
    () => () => {
      controller.current?.abort()
      current.current.onUploadingChange(false)
    },
    [],
  )

  async function loadMedia(append = false) {
    controller.current?.abort()
    const pending = new AbortController()
    controller.current = pending
    setPickerOpen(true)
    setBusy(true)
    setError('')
    try {
      const result = await request<{ media: MediaChoice[] }>(
        `/api/admin/media?limit=24&offset=${append ? media.length : 0}`,
        { signal: pending.signal },
      )
      if (pending.signal.aborted) {
        return
      }
      setMedia(append ? [...media, ...result.media] : result.media)
      setMore(result.media.length === 24)
    } catch (cause) {
      if (!pending.signal.aborted) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Не удалось загрузить медиатеку',
        )
      }
    } finally {
      if (!pending.signal.aborted) {
        setBusy(false)
      }
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
      setError('Выберите PNG, JPG, WebP или GIF размером до 10 МиБ')
      return
    }
    controller.current?.abort()
    const pending = new AbortController()
    controller.current = pending
    setBusy(true)
    onUploadingChange(true)
    try {
      const image = await request<MediaChoice>('/api/admin/media', {
        body: file,
        method: 'POST',
        signal: pending.signal,
        headers: { 'Content-Type': file.type },
      })
      if (pending.signal.aborted) {
        return
      }
      current.current.onChange({ ...current.current.course, imageId: image.id })
      setPickerOpen(false)
    } catch (cause) {
      if (!pending.signal.aborted) {
        setError(
          cause instanceof Error ? cause.message : 'Не удалось загрузить файл',
        )
      }
    } finally {
      if (!pending.signal.aborted) {
        setBusy(false)
        current.current.onUploadingChange(false)
      }
    }
  }

  function changePrice(value: string) {
    setPrice(value)
    const normalized = value.replace(',', '.')
    const parsed = Number(normalized)
    const minor = Math.round(parsed * factor)
    if (
      !normalized.trim() ||
      !/^\d+(?:\.\d*)?$/.test(normalized) ||
      normalized.split('.')[1]?.length > digits ||
      !Number.isSafeInteger(minor) ||
      minor < 0
    ) {
      setPriceError(
        `Укажите неотрицательную цену${digits ? `, не более ${digits} знаков после запятой` : ' без дробной части'}`,
      )
      onChange({ ...course, priceMinor: Number.NaN })
      return
    }
    setPriceError('')
    onChange({ ...course, priceMinor: minor })
  }

  return (
    <article className="courses-editor">
      <header className="courses-editor-heading">
        <div>
          <span className="courses-eyebrow">КАРТОЧКА КУРСА</span>
          <h2>{course.title || 'Без названия'}</h2>
        </div>
        <label className="courses-visibility">
          <input
            type="checkbox"
            disabled={busy}
            checked={course.visible}
            onChange={event =>
              onChange({ ...course, visible: event.target.checked })
            }
          />
          Показывать на лендинге
        </label>
      </header>
      <fieldset disabled={busy} className="courses-fields">
        <label>
          Название курса
          <input
            maxLength={200}
            value={course.title}
            onChange={event =>
              onChange({ ...course, title: event.target.value })
            }
          />
        </label>
        <label>
          Описание
          <textarea
            rows={5}
            maxLength={20000}
            value={course.description}
            onChange={event =>
              onChange({ ...course, description: event.target.value })
            }
          />
        </label>
        <div className="courses-price-row">
          <label>
            Цена
            <input
              value={price}
              inputMode="decimal"
              aria-invalid={!!priceError}
              onChange={event => changePrice(event.target.value)}
              aria-describedby={
                priceError ? 'course-price-error' : 'course-price-hint'
              }
            />
            <small id="course-price-hint">0 — бесплатный курс</small>
          </label>
          <label>
            Валюта
            <input
              maxLength={3}
              placeholder="RUB"
              value={course.currency}
              onChange={event => {
                const currency = event.target.value
                  .toUpperCase()
                  .replace(/[^A-Z]/g, '')
                const nextDigits = currencyFractionDigits(currency)
                const amount = Number(price.replace(',', '.'))
                const minor = Math.round(amount * 10 ** nextDigits)
                const valid =
                  price.trim() &&
                  Number.isFinite(amount) &&
                  Number.isSafeInteger(minor) &&
                  minor >= 0
                onChange({
                  ...course,
                  currency,
                  priceMinor: valid ? minor : Number.NaN,
                })
                if (valid) {
                  setPrice((minor / 10 ** nextDigits).toFixed(nextDigits))
                  setPriceError('')
                }
              }}
            />
            <small>Три буквы: RUB, USD, EUR</small>
          </label>
        </div>
        {priceError && (
          <p role="alert" id="course-price-error" className="courses-error">
            {priceError}
          </p>
        )}
        <div className="courses-cover">
          <h3>Обложка</h3>
          <div className="courses-cover-row">
            {course.imageId ? (
              <img
                src={`/api/media/${course.imageId}`}
                alt={`Обложка курса ${course.title}`}
              />
            ) : (
              <div className="courses-cover-empty">
                <Icon size={30} name="image" />
              </div>
            )}
            <div className="courses-cover-actions">
              <button
                type="button"
                className="courses-button"
                onClick={() => void loadMedia()}
              >
                Выбрать из медиатеки
              </button>
              <label className="courses-upload">
                Загрузить обложку
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={event => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    if (file) {
                      void upload(file)
                    }
                  }}
                />
              </label>
              <small>PNG, JPG, WebP, GIF · до 10 МиБ</small>
              {course.imageId && (
                <button
                  type="button"
                  className="courses-text-button"
                  onClick={() => onChange({ ...course, imageId: null })}
                >
                  Убрать обложку
                </button>
              )}
            </div>
          </div>
        </div>
        {error && (
          <p role="alert" className="courses-error">
            {error}
          </p>
        )}
        {pickerOpen && (
          <div className="courses-picker">
            <div className="courses-picker-heading">
              <h3>Медиатека</h3>
              <button
                type="button"
                className="courses-text-button"
                aria-label="Закрыть выбор обложки"
                onClick={() => setPickerOpen(false)}
              >
                <Icon size={18} name="close" />
              </button>
            </div>
            <div className="courses-media-grid">
              {media.map(item => (
                <button
                  type="button"
                  key={item.id}
                  aria-label={`Выбрать обложку ${item.id.slice(0, 8)}`}
                  onClick={() => {
                    onChange({ ...course, imageId: item.id })
                    setPickerOpen(false)
                  }}
                >
                  <img alt="" loading="lazy" src={item.url} />
                </button>
              ))}
            </div>
            {!busy && !media.length && (
              <p>Изображений пока нет. Загрузите обложку курса</p>
            )}
            {more && (
              <button
                type="button"
                className="courses-button"
                onClick={() => void loadMedia(true)}
              >
                Показать ещё
              </button>
            )}
          </div>
        )}
        <div className="courses-editor-footer">
          <span>Удаление курса также уберёт его из блоков лендинга</span>
          <button type="button" onClick={onDelete} className="courses-delete">
            <Icon size={16} name="trash" />
            Удалить курс
          </button>
        </div>
      </fieldset>
      {busy && (
        <p role="status" className="courses-loading">
          Загрузка…
        </p>
      )}
    </article>
  )
}
