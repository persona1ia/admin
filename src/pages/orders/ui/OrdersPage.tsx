import { useState, useEffect, useCallback } from 'react'

import { request } from '@/shared/api'
import { formatMoney } from '@/shared/lib/money'

import type { Order } from '../model/types'

const pageSize = 25
const date = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function csvCell(value: string | number) {
  const text = String(value)
  return `"${(/^\s*[=+@-]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`
}

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [offset, setOffset] = useState(0)
  const [more, setMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  const load = useCallback(
    (nextOffset = 0, signal?: AbortSignal) =>
      request<{ orders: Order[] }>(
        `/api/admin/orders?limit=${pageSize}&offset=${nextOffset}`,
        { signal },
      )
        .then(result => {
          if (signal?.aborted) {
            return
          }
          setError('')
          setOrders(previous =>
            nextOffset
              ? [
                  ...new Map(
                    [...previous, ...result.orders].map(order => [
                      order.id,
                      order,
                    ]),
                  ).values(),
                ]
              : result.orders,
          )
          setOffset(nextOffset)
          setMore(result.orders.length === pageSize)
        })
        .catch((cause: unknown) => {
          if (!signal?.aborted) {
            setError(
              cause instanceof Error
                ? cause.message
                : 'Не удалось загрузить заказы',
            )
          }
        })
        .finally(() => {
          if (!signal?.aborted) {
            setLoading(false)
          }
        }),
    [],
  )

  function refresh(nextOffset = 0) {
    setLoading(true)
    setError('')
    return load(nextOffset)
  }

  useEffect(() => {
    const controller = new AbortController()
    void load(0, controller.signal)
    return () => controller.abort()
  }, [load])

  const filtered = orders.filter(order =>
    `${order.courseTitle} ${order.id}`
      .toLocaleLowerCase('ru')
      .includes(query.toLocaleLowerCase('ru')),
  )

  function exportCsv() {
    const rows = [
      [
        'Номер заказа',
        'Курс',
        'Цена в минимальных единицах',
        'Валюта',
        'Статус',
        'Дата',
      ],
      ...filtered.map(order => [
        order.id,
        order.courseTitle,
        order.priceMinor,
        order.currency,
        'Тестовая оплата',
        order.createdAt,
      ]),
    ]
    const blob = new Blob(
      ['\uFEFF', rows.map(row => row.map(csvCell).join(';')).join('\r\n')],
      { type: 'text/csv;charset=utf-8' },
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `persona1ia-orders-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <section className="orders-page">
      <header className="orders-heading">
        <div>
          <p className="orders-eyebrow">МАГАЗИН / 04</p>
          <h1>Заказы</h1>
          <p>История тестовых покупок на лендинге</p>
        </div>
        <button onClick={exportCsv} disabled={!filtered.length}>
          ↓ Скачать CSV
        </button>
      </header>
      <div className="orders-simulation">
        <span aria-hidden="true">◌</span>
        <div>
          <strong>Тестовый режим оплаты</strong>
          <p>
            Заказы создаются без списания денег. Данные покупателей и банковских
            карт не собираются.
          </p>
        </div>
        <span className="orders-pill">СИМУЛЯЦИЯ</span>
      </div>
      {error && (
        <div role="alert" className="orders-error">
          {error}{' '}
          <button disabled={loading} onClick={() => void refresh()}>
            Повторить
          </button>
        </div>
      )}
      <div className="orders-panel">
        <div className="orders-toolbar">
          <h2>
            Все заказы{' '}
            <span>
              {orders.length}
              {more ? '+' : ''}
            </span>
          </h2>
          <label>
            <span className="orders-search-label">Поиск среди загруженных</span>
            <input
              type="search"
              value={query}
              placeholder="Название курса или номер"
              onChange={event => setQuery(event.target.value)}
            />
          </label>
          <button
            disabled={loading}
            aria-label="Обновить заказы"
            onClick={() => void refresh()}
          >
            ↻
          </button>
        </div>
        <div className="orders-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Заказ</th>
                <th>Курс</th>
                <th>Стоимость</th>
                <th>Статус</th>
                <th>Создан</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => (
                <tr key={order.id}>
                  <td>
                    <code title={order.id}>#{order.id.slice(0, 8)}</code>
                  </td>
                  <td>
                    <strong>{order.courseTitle}</strong>
                  </td>
                  <td className="orders-price">
                    {formatMoney(order.priceMinor, order.currency)}
                  </td>
                  <td>
                    <span className="orders-status">Тестовая оплата</span>
                  </td>
                  <td>{date.format(new Date(order.createdAt))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && (
          <div role="status" className="orders-empty">
            Загружаем заказы…
          </div>
        )}
        {!loading && !error && !filtered.length && (
          <div className="orders-empty">
            <span aria-hidden="true">↗</span>
            <h2>{query ? 'Ничего не найдено' : 'Пока нет заказов'}</h2>
            <p>
              {query
                ? 'Попробуйте другой запрос или загрузите следующие заказы'
                : 'После тестовой покупки на лендинге заказ появится здесь'}
            </p>
          </div>
        )}
        <footer className="orders-footer">
          <span>
            Показано {filtered.length} из {orders.length} загруженных
          </span>
          {more && (
            <button
              disabled={loading}
              onClick={() => void refresh(offset + pageSize)}
            >
              Загрузить ещё
            </button>
          )}
        </footer>
      </div>
      <p className="orders-note">
        CSV содержит показанные заказы. Название и цена в заказе сохраняются на
        момент покупки.
      </p>
    </section>
  )
}
