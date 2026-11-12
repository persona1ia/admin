import type { ApiIssue, ApiErrorBody } from './types'

const messages: Record<string, string> = {
  invalid_credentials: 'Неверный пароль',
  REVISION_NOT_FOUND: 'Эта версия не найдена',
  UNAUTHORIZED: 'Сеанс завершён. Войдите снова',
  VALIDATION_ERROR: 'Проверьте заполнение полей',
  INTERNAL_ERROR: 'Ошибка сервера. Повторите попытку позже',
  UNSUPPORTED_MEDIA_TYPE: 'Этот формат файла не поддерживается',
  MEDIA_NOT_FOUND: 'Изображение не найдено. Выберите его заново',
  IMAGE_TOO_LARGE: 'Размер изображения не должен превышать 10 МБ',
  RATE_LIMITED: 'Слишком много запросов. Подождите немного и повторите попытку',
  password_changed:
    'Пароль изменён в другом сеансе. Войдите с актуальным паролем',
  CONTENT_TOO_LARGE:
    'Объём настроек превышает 1 МБ. Сократите содержимое страницы',
  INVALID_IMAGE:
    'Выберите корректное изображение в формате PNG, JPEG, WebP или GIF',
  INVALID_BACKUP:
    'Файл резервной копии повреждён или не содержит нужные изображения',
  CONTENT_MEDIA_TOO_LARGE:
    'Общий размер изображений в одной версии не должен превышать 32 МБ',
  REVISION_CONFLICT:
    'Настройки уже изменены в другой вкладке. Загрузите актуальную версию перед сохранением',
  CROSS_ORIGIN_REQUEST:
    'Не удалось проверить источник запроса. Откройте админку на том же домене, что и сервер',
  password_not_configured:
    'Пароль администратора ещё не установлен. Выполните команду сброса пароля на сервере',
  MEDIA_IN_USE:
    'Изображение используется в сохранённой версии. Удалить его нельзя, чтобы сохранить возможность восстановления',
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly issues: ApiIssue[]

  constructor(
    status: number,
    code: string,
    message: string,
    issues: ApiIssue[] = [],
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.issues = issues
  }
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  headers.set('Accept', 'application/json')

  let response: Response
  try {
    response = await fetch(path, {
      ...options,
      headers,
      credentials: 'same-origin',
    })
  } catch (error) {
    options.signal?.throwIfAborted()
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Нет соединения с сервером. Проверьте подключение и повторите попытку',
    )
  }

  if (response.status === 204) {
    return undefined as T
  }
  let parsed: unknown
  try {
    parsed = await response.json()
  } catch (error) {
    options.signal?.throwIfAborted()
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    if (response.ok) {
      throw new ApiError(
        response.status,
        'INVALID_RESPONSE',
        'Сервер вернул неожиданный ответ. Проверьте подключение API',
      )
    }
    // An upstream proxy may return an HTML or empty error response.
  }

  if (!response.ok) {
    const body: ApiErrorBody =
      typeof parsed === 'object' && parsed !== null ? parsed : {}
    const code = body.error ?? 'HTTP_ERROR'
    const fallback =
      response.status === 413
        ? 'Файл или документ превышает допустимый размер'
        : response.status >= 500
          ? 'Сервер недоступен. Повторите попытку позже'
          : `Не удалось выполнить запрос (${response.status})`
    if (
      response.status === 401 &&
      path !== '/api/auth/login' &&
      code !== 'invalid_credentials'
    ) {
      window.dispatchEvent(new CustomEvent('session-expired'))
    }
    throw new ApiError(
      response.status,
      code,
      messages[code] ?? body.message ?? fallback,
      body.issues,
    )
  }

  return parsed as T
}
