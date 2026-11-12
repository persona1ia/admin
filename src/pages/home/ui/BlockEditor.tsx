import { ImageField } from './ImageField'
import type { BlockEditorProps } from '../model/types'

export function BlockEditor({
  block,
  content,
  onChange,
  uploading,
  onUploadingChange,
}: BlockEditorProps) {
  return (
    <fieldset disabled={uploading} className="landing-fields">
      <label>
        Заголовок
        <input
          maxLength={200}
          value={block.title}
          placeholder="Название раздела на лендинге"
          onChange={event => onChange({ ...block, title: event.target.value })}
        />
        <span className="landing-field-hint">{block.title.length} / 200</span>
      </label>
      {'text' in block && (
        <label>
          Текст
          <textarea
            rows={6}
            maxLength={20000}
            value={block.text}
            placeholder="Добавьте содержание раздела"
            onChange={event => onChange({ ...block, text: event.target.value })}
          />
          <span className="landing-field-hint">Обычный текст, без HTML</span>
        </label>
      )}
      {'imageId' in block && (
        <ImageField
          key={block.id}
          value={block.imageId}
          onUploadingChange={onUploadingChange}
          onChange={imageId => onChange({ ...block, imageId })}
        />
      )}
      {block.type === 'hero' && (
        <div className="landing-form-section">
          <div className="landing-section-heading">
            <h3>Кнопка действия</h3>
            <label className="landing-switch">
              <input
                type="checkbox"
                checked={block.action !== null}
                onChange={event =>
                  onChange({
                    ...block,
                    action: event.target.checked
                      ? {
                          label: 'Посмотреть курсы',
                          url: content.blocks.some(
                            item => item.type === 'courses',
                          )
                            ? `#${content.blocks.find(item => item.type === 'courses')?.id}`
                            : '',
                        }
                      : null,
                  })
                }
              />
              <span />
              Показывать
            </label>
          </div>
          {block.action && (
            <div className="landing-field-grid">
              <label>
                Надпись
                <input
                  maxLength={200}
                  value={block.action.label}
                  onChange={event =>
                    onChange({
                      ...block,
                      action: {
                        label: event.target.value,
                        url: block.action?.url ?? '',
                      },
                    })
                  }
                />
              </label>
              <label>
                Ссылка
                <input
                  maxLength={2048}
                  value={block.action.url}
                  placeholder="#courses или https://…"
                  onChange={event =>
                    onChange({
                      ...block,
                      action: {
                        url: event.target.value,
                        label: block.action?.label ?? '',
                      },
                    })
                  }
                />
              </label>
            </div>
          )}
        </div>
      )}
      {block.type === 'courses' && (
        <div className="landing-form-section">
          <h3>Курсы в этом разделе</h3>
          <p className="landing-helper">
            Сначала выберите курсы, затем настройте порядок
          </p>
          {content.courses.length === 0 && (
            <p className="landing-inline-empty">
              Сначала добавьте курс в разделе <a href="#courses">«Курсы»</a>
            </p>
          )}
          <div className="landing-course-options">
            {content.courses.map(course => (
              <label key={course.id}>
                <input
                  type="checkbox"
                  checked={block.courseIds.includes(course.id)}
                  onChange={event =>
                    onChange({
                      ...block,
                      courseIds: event.target.checked
                        ? [...block.courseIds, course.id]
                        : block.courseIds.filter(id => id !== course.id),
                    })
                  }
                />
                <span>
                  {course.title}
                  {!course.visible && <small>Скрыт на лендинге</small>}
                </span>
              </label>
            ))}
          </div>
          {block.courseIds.map((id, index) => (
            <div key={id} className="landing-order-row">
              <span>{index + 1}</span>
              <strong>
                {content.courses.find(course => course.id === id)?.title ?? id}
              </strong>
              <button
                type="button"
                disabled={index === 0}
                className="landing-button small"
                onClick={() => {
                  const ids = [...block.courseIds]
                  ;[ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]
                  onChange({ ...block, courseIds: ids })
                }}
              >
                Выше
              </button>
              <button
                type="button"
                className="landing-button small"
                disabled={index === block.courseIds.length - 1}
                onClick={() => {
                  const ids = [...block.courseIds]
                  ;[ids[index + 1], ids[index]] = [ids[index], ids[index + 1]]
                  onChange({ ...block, courseIds: ids })
                }}
              >
                Ниже
              </button>
            </div>
          ))}
        </div>
      )}
      {block.type === 'gallery' && (
        <div className="landing-form-section">
          <h3>Изображения галереи</h3>
          {block.images.map((item, index) => (
            <div key={index} className="landing-repeat-card">
              <div className="landing-repeat-head">
                <strong>Изображение {index + 1}</strong>
                <div>
                  <button
                    type="button"
                    disabled={index === 0}
                    className="landing-link-button"
                    onClick={() => {
                      const images = [...block.images]
                      ;[images[index - 1], images[index]] = [
                        images[index],
                        images[index - 1],
                      ]
                      onChange({ ...block, images })
                    }}
                  >
                    Выше
                  </button>
                  <button
                    type="button"
                    className="landing-link-button danger"
                    onClick={() =>
                      onChange({
                        ...block,
                        images: block.images.filter((_, i) => i !== index),
                      })
                    }
                  >
                    Удалить
                  </button>
                </div>
              </div>
              <ImageField
                value={item.imageId}
                onUploadingChange={onUploadingChange}
                onChange={imageId =>
                  onChange({
                    ...block,
                    images: imageId
                      ? block.images.map((image, i) =>
                          i === index ? { ...image, imageId } : image,
                        )
                      : block.images.filter((_, i) => i !== index),
                  })
                }
              />
              <label>
                Описание для доступности
                <input
                  maxLength={200}
                  value={item.alt}
                  placeholder="Что изображено на фотографии"
                  onChange={event =>
                    onChange({
                      ...block,
                      images: block.images.map((image, i) =>
                        i === index
                          ? { ...image, alt: event.target.value }
                          : image,
                      ),
                    })
                  }
                />
              </label>
            </div>
          ))}
          {block.images.length < 200 && (
            <ImageField
              value={null}
              key={block.images.length}
              label="Добавить изображение"
              onUploadingChange={onUploadingChange}
              onChange={imageId => {
                if (imageId) {
                  onChange({
                    ...block,
                    images: [...block.images, { imageId, alt: '' }],
                  })
                }
              }}
            />
          )}
        </div>
      )}
      {block.type === 'testimonials' && (
        <div className="landing-form-section">
          <h3>Отзывы</h3>
          {block.items.map((item, index) => (
            <div key={index} className="landing-repeat-card">
              <div className="landing-repeat-head">
                <strong>Отзыв {index + 1}</strong>
                <div>
                  <button
                    type="button"
                    disabled={index === 0}
                    className="landing-link-button"
                    onClick={() => {
                      const items = [...block.items]
                      ;[items[index - 1], items[index]] = [
                        items[index],
                        items[index - 1],
                      ]
                      onChange({ ...block, items })
                    }}
                  >
                    Выше
                  </button>
                  <button
                    type="button"
                    className="landing-link-button danger"
                    onClick={() =>
                      onChange({
                        ...block,
                        items: block.items.filter((_, i) => i !== index),
                      })
                    }
                  >
                    Удалить
                  </button>
                </div>
              </div>
              <label>
                Автор
                <input
                  maxLength={200}
                  value={item.author}
                  onChange={event =>
                    onChange({
                      ...block,
                      items: block.items.map((entry, i) =>
                        i === index
                          ? { ...entry, author: event.target.value }
                          : entry,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Текст отзыва
                <textarea
                  rows={4}
                  value={item.text}
                  maxLength={20000}
                  onChange={event =>
                    onChange({
                      ...block,
                      items: block.items.map((entry, i) =>
                        i === index
                          ? { ...entry, text: event.target.value }
                          : entry,
                      ),
                    })
                  }
                />
              </label>
              <ImageField
                label="Фото автора"
                value={item.imageId}
                onUploadingChange={onUploadingChange}
                onChange={imageId =>
                  onChange({
                    ...block,
                    items: block.items.map((entry, i) =>
                      i === index ? { ...entry, imageId } : entry,
                    ),
                  })
                }
              />
            </div>
          ))}
          <button
            type="button"
            className="landing-button"
            disabled={block.items.length >= 200}
            onClick={() =>
              onChange({
                ...block,
                items: [
                  ...block.items,
                  { text: '', author: '', imageId: null },
                ],
              })
            }
          >
            + Добавить отзыв
          </button>
        </div>
      )}
      {block.type === 'faq' && (
        <div className="landing-form-section">
          <h3>Вопросы и ответы</h3>
          {block.items.map((item, index) => (
            <div key={index} className="landing-repeat-card">
              <div className="landing-repeat-head">
                <strong>Вопрос {index + 1}</strong>
                <div>
                  <button
                    type="button"
                    disabled={index === 0}
                    className="landing-link-button"
                    onClick={() => {
                      const items = [...block.items]
                      ;[items[index - 1], items[index]] = [
                        items[index],
                        items[index - 1],
                      ]
                      onChange({ ...block, items })
                    }}
                  >
                    Выше
                  </button>
                  <button
                    type="button"
                    className="landing-link-button danger"
                    onClick={() =>
                      onChange({
                        ...block,
                        items: block.items.filter((_, i) => i !== index),
                      })
                    }
                  >
                    Удалить
                  </button>
                </div>
              </div>
              <label>
                Вопрос
                <input
                  maxLength={200}
                  value={item.question}
                  onChange={event =>
                    onChange({
                      ...block,
                      items: block.items.map((entry, i) =>
                        i === index
                          ? { ...entry, question: event.target.value }
                          : entry,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Ответ
                <textarea
                  rows={4}
                  maxLength={20000}
                  value={item.answer}
                  onChange={event =>
                    onChange({
                      ...block,
                      items: block.items.map((entry, i) =>
                        i === index
                          ? { ...entry, answer: event.target.value }
                          : entry,
                      ),
                    })
                  }
                />
              </label>
            </div>
          ))}
          <button
            type="button"
            className="landing-button"
            disabled={block.items.length >= 200}
            onClick={() =>
              onChange({
                ...block,
                items: [...block.items, { answer: '', question: '' }],
              })
            }
          >
            + Добавить вопрос
          </button>
        </div>
      )}
      {block.type === 'contacts' && (
        <div className="landing-contact-note">
          <strong>Контактные данные</strong>
          <p>
            {content.site.contacts.email ||
              content.site.contacts.phone ||
              'Пока не заполнены'}
          </p>
          <a href="#settings">Редактировать в настройках →</a>
        </div>
      )}
      <details className="landing-advanced">
        <summary>Адрес раздела</summary>
        <label>
          Якорь блока
          <input
            maxLength={100}
            value={block.id}
            pattern="[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}"
            onChange={event => onChange({ ...block, id: event.target.value })}
          />
        </label>
        <p>
          Ссылка на этот раздел: #{block.id}. Используйте латинские буквы,
          цифры, дефис и подчёркивание
        </p>
      </details>
    </fieldset>
  )
}
