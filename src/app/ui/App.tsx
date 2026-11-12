import { useState, useEffect } from 'react'

import { HomePage } from '@/pages/home'
import { Icon } from '@/shared/ui/icon'
import { MediaPage } from '@/pages/media'
import { OrdersPage } from '@/pages/orders'
import { CoursesPage } from '@/pages/courses'
import { HistoryPage } from '@/pages/history'
import { SettingsPage } from '@/pages/settings'
import { request, ApiError } from '@/shared/api'
import type { SiteContent, SavedContent } from '@/entities/site'
import {
  getContent,
  saveContent,
  collectImageIds,
  validateContent,
} from '@/entities/site'

import type { Section, Session, NavigationItem } from './app.types'

const navigation: NavigationItem[] = [
  { id: 'landing', icon: 'layout', label: 'Лендинг' },
  { icon: 'book', id: 'courses', label: 'Курсы' },
  { id: 'media', icon: 'image', label: 'Медиатека' },
  { id: 'orders', icon: 'orders', label: 'Заказы' },
  { id: 'history', icon: 'history', label: 'История версий' },
  { id: 'settings', icon: 'settings', label: 'Настройки' },
]

function currentSection(): Section {
  const id = location.hash.slice(1)
  return navigation.find(item => item.id === id)?.id ?? 'landing'
}

export function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [saved, setSaved] = useState<SavedContent | null>(null)
  const [draft, setDraft] = useState<SiteContent | null>(null)
  const [section, setSection] = useState<Section>(currentSection)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [conflict, setConflict] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [connectionAttempt, setConnectionAttempt] = useState(0)
  const dirty = Boolean(
    saved && draft && JSON.stringify(saved.content) !== JSON.stringify(draft),
  )

  function initialize() {
    setLoading(true)
    setError('')
    setConnectionAttempt(attempt => attempt + 1)
  }

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    async function connect() {
      try {
        const next = await request<Session>('/api/auth/session', {
          signal: controller.signal,
        })
        if (next.authenticated) {
          const value = await request<SavedContent>('/api/admin/content', {
            signal: controller.signal,
          })
          if (!active) {
            return
          }
          setSaved(value)
          setDraft(value.content)
        }
        if (active) {
          setSession(next)
        }
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Не удалось подключиться к серверу',
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }
    void connect()
    return () => {
      active = false
      controller.abort()
    }
  }, [connectionAttempt])
  useEffect(() => {
    const change = () => {
      setSection(currentSection())
      setMobileNav(false)
    }
    const expired = () => {
      setSession({ authenticated: false, passwordConfigured: true })
      setError(
        'Сеанс завершён. Войдите снова — ваши несохранённые правки останутся в этой вкладке',
      )
    }
    window.addEventListener('hashchange', change)
    window.addEventListener('session-expired', expired)
    return () => {
      window.removeEventListener('hashchange', change)
      window.removeEventListener('session-expired', expired)
    }
  }, [])
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', leave)
    return () => window.removeEventListener('beforeunload', leave)
  }, [dirty])
  useEffect(() => {
    if (!notice) {
      return
    }
    const timeout = window.setTimeout(() => setNotice(''), 6000)
    return () => window.clearTimeout(timeout)
  }, [notice])

  async function login(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      })
      const value = await getContent()
      // Keep an expired session's draft and its original base revision for conflict detection
      if (!draft || !saved) {
        setSaved(value)
        setDraft(value.content)
      }
      setSession({ authenticated: true, passwordConfigured: true })
      setPassword('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось войти')
    } finally {
      setBusy(false)
    }
  }

  async function publish() {
    if (!draft || !saved || busy || uploading) {
      return
    }
    const issues = validateContent(draft)
    if (issues.length) {
      setError(issues.join('\n'))
      return
    }
    setBusy(true)
    setError('')
    setConflict(false)
    try {
      const value = await saveContent(saved.revision, draft)
      setSaved(value)
      setDraft(value.content)
      setNotice(`Изменения опубликованы · версия ${value.revision}`)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Не удалось опубликовать',
      )
      if (cause instanceof ApiError && cause.status === 409) {
        setConflict(true)
      }
    } finally {
      setBusy(false)
    }
  }

  async function reload() {
    if (busy || uploading) {
      return
    }
    if (
      dirty &&
      !window.confirm(
        'Загрузить опубликованную версию? Несохранённые правки в этой вкладке будут потеряны',
      )
    ) {
      return
    }
    setBusy(true)
    try {
      const value = await getContent()
      setSaved(value)
      setDraft(value.content)
      setConflict(false)
      setError('')
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Не удалось загрузить данные',
      )
    } finally {
      setBusy(false)
    }
  }

  function downloadDraft() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' }),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = 'persona1ia-unsaved-content.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function logout() {
    if (
      dirty &&
      !window.confirm('Выйти и удалить несохранённые правки в этой вкладке?')
    ) {
      return
    }
    setBusy(true)
    try {
      await request('/api/auth/logout', { method: 'POST' })
      setSession({ authenticated: false, passwordConfigured: true })
      setDraft(null)
      setSaved(null)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось выйти')
    } finally {
      setBusy(false)
    }
  }

  if (!session?.authenticated || !draft || !saved) {
    return (
      <main className="studio-login">
        <section aria-label="Persona1ia" className="studio-login-art">
          <a href="#landing" className="studio-brand">
            <span className="studio-monogram">
              p<span>1</span>
            </span>
            <span>
              persona1ia<small>СТУДИЯ УПРАВЛЕНИЯ</small>
            </span>
          </a>
          <div aria-hidden="true" className="studio-login-composition">
            <span className="studio-orbit orbit-one" />
            <span className="studio-orbit orbit-two" />
            <span className="studio-orbit orbit-three" />
            <span className="studio-art-p">
              p<span>1</span>
            </span>
            <span className="studio-art-label">ЛЕНДИНГ / КУРСЫ / КОНТЕНТ</span>
          </div>
          <div className="studio-login-caption">
            <span>Содержание · Курсы · Настройки</span>
            <span>PERSONA1IA / ADMIN</span>
          </div>
        </section>
        <section className="studio-login-form">
          <span className="studio-eyebrow">РАБОЧЕЕ ПРОСТРАНСТВО</span>
          <h1>Вход в студию</h1>
          <p>
            Управление вашим лендингом
            <br />и образовательными продуктами
          </p>
          {loading ? (
            <div role="status" className="studio-notice">
              Подключаемся к серверу…
            </div>
          ) : (
            <>
              {error && (
                <div role="alert" className="studio-error">
                  {error}
                </div>
              )}
              {session?.passwordConfigured === false ? (
                <div className="studio-notice">
                  <h2>Настройте доступ</h2>
                  <p>На сервере ещё не установлен пароль владельца</p>
                  <details>
                    <summary>Первый запуск сервера</summary>
                    <p>
                      В репозитории сервера выполните{' '}
                      <code>npm run password:reset</code>. Для Docker:{' '}
                      <code>
                        docker compose exec server node
                        dist/auth/reset-password.js
                      </code>
                    </p>
                  </details>
                  <button
                    className="studio-button"
                    onClick={() => void initialize()}
                  >
                    Проверить снова
                  </button>
                </div>
              ) : (
                <form onSubmit={event => void login(event)}>
                  <label htmlFor="password">Пароль владельца</label>
                  <div className="studio-password">
                    <input
                      required
                      id="password"
                      disabled={busy}
                      maxLength={1024}
                      value={password}
                      placeholder="Введите пароль"
                      autoComplete="current-password"
                      type={showPassword ? 'text' : 'password'}
                      onChange={event => setPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? 'Скрыть пароль' : 'Показать пароль'
                      }
                    >
                      <Icon name={showPassword ? 'hidden' : 'eye'} />
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={busy || !session}
                    className="studio-button primary studio-login-submit"
                  >
                    {busy ? 'Входим…' : 'Войти в студию'}
                    <Icon name="arrow" />
                  </button>
                  {!session && (
                    <button
                      type="button"
                      className="studio-button"
                      onClick={() => void initialize()}
                    >
                      Повторить подключение
                    </button>
                  )}
                </form>
              )}
              <details className="studio-login-help">
                <summary>Не получается войти</summary>
                <p>
                  Для восстановления доступа установите новый пароль командой
                  сброса в репозитории сервера. Если сервер недоступен,
                  проверьте его запуск и прокси /api
                </p>
              </details>
            </>
          )}
          <span className="studio-login-footer">Закрытая часть Persona1ia</span>
        </section>
      </main>
    )
  }

  return (
    <div className="studio-app">
      <a
        href="#workspace"
        className="studio-skip"
        onClick={event => {
          event.preventDefault()
          document.getElementById('workspace')?.focus()
        }}
      >
        Перейти к содержимому
      </a>
      <aside className={`studio-sidebar ${mobileNav ? 'is-open' : ''}`}>
        <a href="#landing" className="studio-brand">
          <span className="studio-monogram">
            p<span>1</span>
          </span>
          <span>
            persona1ia<small>СТУДИЯ УПРАВЛЕНИЯ</small>
          </span>
        </a>
        <div className="studio-workspace-label">
          <span className="studio-site-mark">P</span>
          <div>
            <strong>{draft.site.title || 'Мой проект'}</strong>
            <small>Личное пространство</small>
          </div>
        </div>
        <span className="studio-nav-caption">УПРАВЛЕНИЕ</span>
        <nav aria-label="Основная навигация">
          {navigation.map((item, i) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={() => setMobileNav(false)}
              className={section === item.id ? 'active' : ''}
              aria-current={section === item.id ? 'page' : undefined}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              <small>{String(i + 1).padStart(2, '0')}</small>
            </a>
          ))}
        </nav>
        <div className="studio-sidebar-bottom">
          <div className="studio-edition">
            <span className="studio-edition-star">✳</span>
            <span>
              История изменений
              <br />
              <small>Версии сохраняются при публикации</small>
            </span>
          </div>
          <button disabled={busy} onClick={() => void logout()}>
            <span className="studio-owner">В</span>
            <span>
              Владелец<small>Выйти из аккаунта</small>
            </span>
            <Icon size={18} name="logout" />
          </button>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="studio-overlay"
          aria-label="Закрыть навигацию"
          onClick={() => setMobileNav(false)}
        />
      )}
      <div className="studio-main">
        <header className="studio-topbar">
          <div className="studio-breadcrumb">
            <button
              aria-label="Открыть меню"
              aria-expanded={mobileNav}
              className="studio-mobile-toggle"
              onClick={() => setMobileNav(!mobileNav)}
            >
              <Icon name="menu" />
            </button>
            <span>Пространство</span>
            <span>/</span>
            <strong>
              {navigation.find(item => item.id === section)?.label}
            </strong>
          </div>
          <div className="studio-topbar-actions">
            <span className={`studio-save-state ${dirty ? 'is-dirty' : ''}`}>
              <i />
              {dirty ? 'Есть изменения' : `Версия ${saved.revision}`}
            </span>
            <button
              onClick={() => void publish()}
              className="studio-button primary"
              disabled={!dirty || busy || uploading}
            >
              {busy ? 'Подождите…' : 'Опубликовать'}
              <Icon size={17} name="arrow" />
            </button>
          </div>
        </header>
        <main tabIndex={-1} id="workspace" className="studio-content">
          {error && (
            <div role="alert" className="studio-error">
              <span>{error}</span>
              <button
                onClick={() => setError('')}
                aria-label="Закрыть сообщение"
              >
                <Icon size={18} name="close" />
              </button>
              {conflict && (
                <div className="studio-conflict-actions">
                  <p>
                    Ваши правки сохранены в этой вкладке. Скачайте их перед
                    загрузкой актуальной версии
                  </p>
                  <button onClick={downloadDraft} className="studio-button">
                    Скачать свои правки
                  </button>
                  <button
                    className="studio-button"
                    disabled={busy || uploading}
                    onClick={() => void reload()}
                  >
                    Загрузить с сервера
                  </button>
                </div>
              )}
            </div>
          )}
          <fieldset disabled={busy} className="studio-work-area">
            {section === 'landing' && (
              <HomePage
                content={draft}
                onChange={setDraft}
                onUploadingChange={setUploading}
              />
            )}
            {section === 'courses' && (
              <CoursesPage
                content={draft}
                onChange={setDraft}
                onUploadingChange={setUploading}
              />
            )}
            {section === 'media' && (
              <MediaPage usedImageIds={collectImageIds(draft)} />
            )}
            {section === 'orders' && <OrdersPage />}
            {section === 'history' && (
              <HistoryPage
                onBusyChange={setBusy}
                revision={saved.revision}
                hasUnsavedChanges={dirty}
                onRestored={value => {
                  setSaved(value)
                  setDraft(value.content)
                  setError('')
                  setConflict(false)
                  setNotice(`Восстановлена версия · ${value.revision}`)
                }}
              />
            )}
            {section === 'settings' && (
              <SettingsPage
                site={draft.site}
                onChange={site => setDraft({ ...draft, site })}
              />
            )}
          </fieldset>
          <footer className="studio-footer">
            <span>
              PERSONA1IA <span className="studio-footer-slash">/</span> СТУДИЯ
              УПРАВЛЕНИЯ
            </span>
            <span>
              {dirty
                ? 'Изменения пока видны только вам'
                : `Сохранено ${new Date(saved.savedAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}`}
            </span>
          </footer>
        </main>
      </div>
      {notice && (
        <div role="status" className="studio-toast">
          <Icon name="check" />
          {notice}
          <button
            onClick={() => setNotice('')}
            aria-label="Закрыть уведомление"
          >
            <Icon size={16} name="close" />
          </button>
        </div>
      )}
    </div>
  )
}
