import { useRef, useState, useEffect, useCallback } from 'react'

import { getContent } from '@/entities/site'
import { request, ApiError } from '@/shared/api'
import type { SavedContent, RevisionSummary } from '@/entities/site'

import type { HistoryPageProps } from '../model/types'

const date = new Intl.DateTimeFormat('ru-RU', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
const pageSize = 20

function errorMessage(cause: unknown) {
  if (cause instanceof ApiError && cause.status === 409) {
    return 'На сервере уже есть новая версия. Загрузите актуальные данные перед повторным восстановлением.'
  }
  return cause instanceof Error
    ? cause.message
    : 'Не удалось выполнить действие'
}

export function HistoryPage({
  revision,
  onRestored,
  onBusyChange,
  hasUnsavedChanges,
}: HistoryPageProps) {
  const [revisions, setRevisions] = useState<RevisionSummary[]>([])
  const [more, setMore] = useState(false)
  const [listState, setListState] = useState({ revision, loading: true })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [conflict, setConflict] = useState(false)
  const [selected, setSelected] = useState<SavedContent | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const listRequest = useRef<AbortController | null>(null)
  const loading = listState.loading || listState.revision !== revision

  const load = useCallback(
    (before?: number) => {
      listRequest.current?.abort()
      const controller = new AbortController()
      listRequest.current = controller
      const { signal } = controller
      return request<{ revisions: RevisionSummary[] }>(
        `/api/admin/revisions?limit=${pageSize}${before ? `&before=${before}` : ''}`,
        { signal },
      )
        .then(result => {
          if (signal.aborted) {
            return
          }
          setRevisions(previous =>
            before ? [...previous, ...result.revisions] : result.revisions,
          )
          setMore(result.revisions.length === pageSize)
        })
        .catch((cause: unknown) => {
          if (!signal.aborted) {
            setError(errorMessage(cause))
          }
        })
        .finally(() => {
          if (!signal.aborted) {
            setListState({ revision, loading: false })
          }
        })
    },
    [revision],
  )

  function refresh(before?: number) {
    setListState({ revision, loading: true })
    setError('')
    return load(before)
  }

  useEffect(() => {
    void load()
    return () => listRequest.current?.abort()
  }, [load])

  useEffect(() => {
    if (selected && !dialog.current?.open) {
      dialog.current?.showModal()
    }
  }, [selected])

  async function inspect(id: number) {
    setBusy(true)
    setError('')
    try {
      setSelected(await request<SavedContent>(`/api/admin/revisions/${id}`))
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  async function restore(id: number) {
    const warning = hasUnsavedChanges
      ? ' Несохранённые изменения будут потеряны.'
      : ''
    if (
      !window.confirm(
        `Восстановить версию ${id}? Она сразу появится на лендинге, а текущая версия останется в истории.${warning}`,
      )
    ) {
      return
    }
    setBusy(true)
    onBusyChange?.(true)
    setError('')
    setNotice('')
    try {
      const result = await request<SavedContent>(
        `/api/admin/revisions/${id}/restore`,
        { method: 'POST', body: JSON.stringify({ baseRevision: revision }) },
      )
      onRestored(result)
      setSelected(null)
      setNotice(
        `Версия ${id} восстановлена и опубликована как версия ${result.revision}`,
      )
    } catch (cause) {
      setError(errorMessage(cause))
      setConflict(cause instanceof ApiError && cause.status === 409)
      setSelected(null)
    } finally {
      setBusy(false)
      onBusyChange?.(false)
    }
  }

  async function download(id: number | 'current') {
    setBusy(true)
    setError('')
    try {
      const backup = await request<unknown>(`/api/admin/backups/${id}`)
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup)], { type: 'application/json' }),
      )
      const link = document.createElement('a')
      link.href = url
      link.download = `persona1ia-revision-${id}.json`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  async function importBackup(file?: File) {
    if (fileInput.current) {
      fileInput.current.value = ''
    }
    if (!file) {
      return
    }
    setError('')
    setNotice('')
    if (file.size > 64 * 1024 * 1024) {
      setError('Файл резервной копии превышает 64 МиБ')
      return
    }
    setBusy(true)
    onBusyChange?.(true)
    try {
      const backup: unknown = JSON.parse(await file.text())
      if (
        !backup ||
        typeof backup !== 'object' ||
        !('format' in backup) ||
        backup.format !== 'persona1ia-backup' ||
        !('version' in backup) ||
        backup.version !== 1
      ) {
        throw new Error('Выберите резервную копию Persona1ia версии 1')
      }
      const body = JSON.stringify({ backup, baseRevision: revision })
      if (new Blob([body]).size > 64 * 1024 * 1024) {
        throw new Error('Размер запроса импорта превышает 64 МиБ')
      }
      if (
        !window.confirm(
          `Импортировать «${file.name}»? Настройки и изображения из копии сразу появятся на лендинге.${hasUnsavedChanges ? ' Несохранённые изменения будут потеряны.' : ''}`,
        )
      ) {
        return
      }
      const result = await request<SavedContent>('/api/admin/backups/restore', {
        body,
        method: 'POST',
      })
      onRestored(result)
      setNotice(
        `Резервная копия импортирована и опубликована как версия ${result.revision}`,
      )
    } catch (cause) {
      setConflict(cause instanceof ApiError && cause.status === 409)
      setError(
        cause instanceof SyntaxError
          ? 'Файл не содержит корректный JSON'
          : errorMessage(cause),
      )
    } finally {
      setBusy(false)
      onBusyChange?.(false)
    }
  }

  async function reloadCurrent() {
    if (
      hasUnsavedChanges &&
      !window.confirm(
        'Загрузить актуальную версию с сервера? Несохранённые изменения в этой вкладке будут потеряны.',
      )
    ) {
      return
    }
    setBusy(true)
    onBusyChange?.(true)
    try {
      onRestored(await getContent())
      setConflict(false)
      setError('')
      setNotice('Актуальная версия загружена')
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setBusy(false)
      onBusyChange?.(false)
    }
  }

  return (
    <section className="history-page">
      <header className="history-heading">
        <div>
          <p className="history-eyebrow">СОХРАНЕНИЯ / 05</p>
          <h1>История и копии</h1>
          <p>Каждая публикация остаётся в истории</p>
        </div>
        <span className="history-current">
          Текущая версия <b>№ {revision}</b>
        </span>
      </header>
      {error && (
        <div role="alert" className="history-error">
          {error}
          {conflict && (
            <button disabled={busy} onClick={() => void reloadCurrent()}>
              Загрузить актуальную версию
            </button>
          )}
        </div>
      )}
      {notice && (
        <div role="status" className="history-notice">
          {notice}
        </div>
      )}
      <div className="history-backups">
        <div aria-hidden="true" className="history-backup-icon">
          ↓
        </div>
        <div>
          <h2>Резервная копия</h2>
          <p>Настройки лендинга и все его изображения в одном файле</p>
          <span>Без заказов, пароля и истории версий</span>
        </div>
        <div className="history-backup-actions">
          <button
            disabled={busy}
            className="history-primary"
            onClick={() => void download('current')}
          >
            Скачать копию
          </button>
          <button disabled={busy} onClick={() => fileInput.current?.click()}>
            Импортировать
          </button>
        </div>
        <input
          hidden
          type="file"
          ref={fileInput}
          accept="application/json,.json"
          onChange={event => void importBackup(event.target.files?.[0])}
        />
      </div>
      <div className="history-list-heading">
        <h2>История публикаций</h2>
        <button disabled={busy || loading} onClick={() => void refresh()}>
          ↻ Обновить
        </button>
      </div>
      <div className="history-list">
        {revisions.map(item => (
          <article
            key={item.revision}
            className={`history-row ${item.revision === revision ? 'is-current' : ''}`}
          >
            <div aria-hidden="true" className="history-dot" />
            <div className="history-revision">
              <h3>
                Версия {item.revision}{' '}
                {item.revision === revision && <span>Опубликована</span>}
              </h3>
              <p>{date.format(new Date(item.savedAt))}</p>
            </div>
            <div className="history-row-actions">
              <button
                disabled={busy}
                onClick={() => void inspect(item.revision)}
              >
                Посмотреть
              </button>
              <button
                disabled={busy}
                onClick={() => void download(item.revision)}
                aria-label={`Скачать копию версии ${item.revision}`}
              >
                ↓ Копия
              </button>
              {item.revision !== revision && (
                <button
                  disabled={busy}
                  onClick={() => void restore(item.revision)}
                >
                  Восстановить
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {loading && (
        <p role="status" className="history-loading">
          Загружаем историю…
        </p>
      )}
      {!loading && !revisions.length && (
        <p className="history-loading">
          {error ? 'История пока недоступна' : 'Сохранённых версий пока нет'}
        </p>
      )}
      {more && (
        <button
          className="history-more"
          disabled={busy || loading}
          onClick={() => void refresh(revisions.at(-1)?.revision)}
        >
          Более ранние версии
        </button>
      )}
      <p className="history-note">
        Восстановление создаёт новую публикацию. Предыдущие версии сохраняются.
      </p>
      {selected && (
        <dialog
          ref={dialog}
          className="history-dialog"
          onClose={() => setSelected(null)}
          onCancel={() => setSelected(null)}
        >
          <header>
            <div>
              <p>ПРЕДПРОСМОТР</p>
              <h2>Версия {selected.revision}</h2>
            </div>
            <button
              autoFocus
              onClick={() => setSelected(null)}
              aria-label="Закрыть просмотр версии"
            >
              ×
            </button>
          </header>
          <p className="history-dialog-date">
            {date.format(new Date(selected.savedAt))}
          </p>
          {error && (
            <div role="alert" className="history-error">
              {error}
            </div>
          )}
          <div className="history-preview-summary">
            <div>
              <span>Название сайта</span>
              <strong>{selected.content.site.title || 'Не задано'}</strong>
            </div>
            <div>
              <span>Блоки</span>
              <strong>{selected.content.blocks.length}</strong>
            </div>
            <div>
              <span>Курсы</span>
              <strong>{selected.content.courses.length}</strong>
            </div>
          </div>
          <h3>Содержимое версии</h3>
          <pre>{JSON.stringify(selected.content, null, 2)}</pre>
          <footer>
            <button
              disabled={busy}
              onClick={() => void download(selected.revision)}
            >
              Скачать копию
            </button>
            {selected.revision !== revision && (
              <button
                disabled={busy}
                className="history-primary"
                onClick={() => void restore(selected.revision)}
              >
                {busy ? 'Подождите…' : 'Восстановить и опубликовать'}
              </button>
            )}
          </footer>
        </dialog>
      )}
    </section>
  )
}
