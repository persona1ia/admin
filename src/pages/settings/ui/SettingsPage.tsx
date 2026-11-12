import { useState } from 'react'
import type { FormEvent } from 'react'

import { request } from '@/shared/api'

import type { SettingsPageProps } from '../model/types'

export function SettingsPage({ site, onChange }: SettingsPageProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (newPassword !== repeatPassword) {
      setError('Новый пароль и повтор не совпадают')
      return
    }
    setBusy(true)
    try {
      await request('/api/admin/password', {
        method: 'PUT',
        body: JSON.stringify({ newPassword, currentPassword }),
      })
      setCurrentPassword('')
      setNewPassword('')
      setRepeatPassword('')
      setNotice(
        'Пароль изменён. Все остальные сеансы завершены, этот браузер остаётся авторизованным.',
      )
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Не удалось изменить пароль',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="settings-page">
      <header className="settings-heading">
        <p className="settings-eyebrow">ПАРАМЕТРЫ / 06</p>
        <h1>Настройки</h1>
        <p>Информация о сайте, контакты и доступ</p>
      </header>
      <div className="settings-content">
        <div className="settings-section-description">
          <span>01</span>
          <h2>Основное</h2>
          <p>
            Эти данные используются в названии вкладки браузера и описании сайта
          </p>
        </div>
        <div className="settings-card">
          <label>
            Название сайта
            <input
              maxLength={200}
              value={site.title}
              placeholder="Имя эксперта или название проекта"
              onChange={event =>
                onChange({ ...site, title: event.target.value })
              }
            />
          </label>
          <label>
            Описание
            <textarea
              rows={4}
              maxLength={2000}
              value={site.description}
              placeholder="О чём ваш сайт"
              onChange={event =>
                onChange({ ...site, description: event.target.value })
              }
            />
            <span className="settings-field-help">
              Краткое описание для поисковых систем · {site.description.length}
              /2000
            </span>
          </label>
        </div>
        <div className="settings-section-description">
          <span>02</span>
          <h2>Контакты</h2>
          <p>Появятся в контактных блоках лендинга</p>
        </div>
        <div className="settings-card">
          <div className="settings-pair">
            <label>
              Электронная почта
              <input
                type="email"
                maxLength={254}
                value={site.contacts.email}
                placeholder="hello@example.com"
                onChange={event =>
                  onChange({
                    ...site,
                    contacts: { ...site.contacts, email: event.target.value },
                  })
                }
              />
            </label>
            <label>
              Телефон
              <input
                type="tel"
                maxLength={100}
                value={site.contacts.phone}
                placeholder="+7 999 000-00-00"
                onChange={event =>
                  onChange({
                    ...site,
                    contacts: { ...site.contacts, phone: event.target.value },
                  })
                }
              />
            </label>
          </div>
          <label>
            Адрес
            <input
              maxLength={1000}
              value={site.contacts.address}
              placeholder="Город, улица, дом"
              onChange={event =>
                onChange({
                  ...site,
                  contacts: { ...site.contacts, address: event.target.value },
                })
              }
            />
          </label>
          <div className="settings-links-heading">
            <h3>Социальные сети и ссылки</h3>
            <button
              disabled={site.contacts.links.length >= 50}
              onClick={() =>
                onChange({
                  ...site,
                  contacts: {
                    ...site.contacts,
                    links: [...site.contacts.links, { url: '', label: '' }],
                  },
                })
              }
            >
              ＋ Добавить
            </button>
          </div>
          {!site.contacts.links.length && (
            <p className="settings-links-empty">
              Добавьте Telegram, социальную сеть или другую полезную ссылку
            </p>
          )}
          {site.contacts.links.map((link, index) => (
            <div key={index} className="settings-link">
              <label>
                Название
                <input
                  maxLength={200}
                  value={link.label}
                  placeholder="Telegram"
                  onChange={event =>
                    onChange({
                      ...site,
                      contacts: {
                        ...site.contacts,
                        links: site.contacts.links.map((item, position) =>
                          position === index
                            ? { ...item, label: event.target.value }
                            : item,
                        ),
                      },
                    })
                  }
                />
              </label>
              <label>
                Ссылка
                <input
                  value={link.url}
                  maxLength={2048}
                  placeholder="https://t.me/username"
                  onChange={event =>
                    onChange({
                      ...site,
                      contacts: {
                        ...site.contacts,
                        links: site.contacts.links.map((item, position) =>
                          position === index
                            ? { ...item, url: event.target.value }
                            : item,
                        ),
                      },
                    })
                  }
                />
              </label>
              <button
                aria-label={`Удалить ссылку ${link.label || index + 1}`}
                onClick={() =>
                  onChange({
                    ...site,
                    contacts: {
                      ...site.contacts,
                      links: site.contacts.links.filter(
                        (_, position) => position !== index,
                      ),
                    },
                  })
                }
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="settings-section-description">
          <span>03</span>
          <h2>Доступ</h2>
          <p>
            Один владелец, один пароль. После смены пароля другие сеансы будут
            завершены.
          </p>
        </div>
        <form
          className="settings-card"
          onSubmit={event => void changePassword(event)}
        >
          <div className="settings-access-heading">
            <h3>Сменить пароль</h3>
            <button
              type="button"
              onClick={() => setShowPassword(value => !value)}
            >
              {showPassword ? 'Скрыть пароли' : 'Показать пароли'}
            </button>
          </div>
          {error && (
            <div role="alert" className="settings-error">
              {error}
            </div>
          )}
          {notice && (
            <div role="status" className="settings-notice">
              {notice}
            </div>
          )}
          <label>
            Текущий пароль
            <input
              required
              disabled={busy}
              maxLength={1024}
              value={currentPassword}
              autoComplete="current-password"
              type={showPassword ? 'text' : 'password'}
              onChange={event => setCurrentPassword(event.target.value)}
            />
          </label>
          <div className="settings-pair">
            <label>
              Новый пароль
              <input
                required
                minLength={12}
                disabled={busy}
                maxLength={1024}
                value={newPassword}
                autoComplete="new-password"
                type={showPassword ? 'text' : 'password'}
                onChange={event => setNewPassword(event.target.value)}
              />
            </label>
            <label>
              Повторите новый пароль
              <input
                required
                minLength={12}
                disabled={busy}
                maxLength={1024}
                value={repeatPassword}
                autoComplete="new-password"
                type={showPassword ? 'text' : 'password'}
                onChange={event => setRepeatPassword(event.target.value)}
              />
            </label>
          </div>
          <div className="settings-password-footer">
            <span>От 12 символов, можно использовать фразу</span>
            <button type="submit" disabled={busy} className="settings-primary">
              {busy ? 'Сохраняем…' : 'Изменить пароль'}
            </button>
          </div>
        </form>
      </div>
      <p className="settings-note">
        Настройки сайта и контакты сохраняются кнопкой «Опубликовать» в верхней
        панели
      </p>
    </section>
  )
}
