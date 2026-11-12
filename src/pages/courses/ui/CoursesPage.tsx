import { useState } from 'react'

import { Icon } from '@/shared/ui/icon'
import { createCourse } from '@/entities/site'
import { formatMoney } from '@/shared/lib/money'

import { CourseEditor } from './CourseEditor'
import type { CoursesPageProps } from '../model/types'

export function CoursesPage({
  content,
  onChange,
  onUploadingChange,
}: CoursesPageProps) {
  const [selectedId, setSelectedId] = useState(content.courses[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [uploading, setUploading] = useState(false)
  const selected = content.courses.find(course => course.id === selectedId)
  const filtered = content.courses.filter(course =>
    `${course.title} ${course.description}`
      .toLocaleLowerCase('ru-RU')
      .includes(query.toLocaleLowerCase('ru-RU').trim()),
  )

  function addCourse() {
    const course = createCourse()
    onChange({ ...content, courses: [...content.courses, course] })
    setSelectedId(course.id)
    setQuery('')
  }

  function deleteCourse() {
    if (
      !selected ||
      !window.confirm(
        `Удалить курс «${selected.title}»? Он также будет убран из блоков лендинга после публикации`,
      )
    ) {
      return
    }
    const courses = content.courses.filter(course => course.id !== selected.id)
    onChange({
      ...content,
      courses,
      blocks: content.blocks.map(block =>
        block.type === 'courses'
          ? {
              ...block,
              courseIds: block.courseIds.filter(id => id !== selected.id),
            }
          : block,
      ),
    })
    setSelectedId(courses[0]?.id ?? '')
  }

  return (
    <section className="courses-page">
      <header className="courses-heading">
        <div>
          <span className="courses-eyebrow">КАТАЛОГ ПРОДУКТОВ</span>
          <h1>Курсы</h1>
          <p>Содержание, обложки и стоимость ваших курсов</p>
        </div>
        <button
          onClick={addCourse}
          className="courses-button courses-primary"
          disabled={uploading || content.courses.length >= 500}
        >
          <Icon size={17} name="plus" /> Добавить курс
        </button>
      </header>
      <div className="courses-layout">
        <aside className="courses-catalog" aria-label="Каталог курсов">
          <div className="courses-catalog-heading">
            <h2>Все курсы</h2>
            <span>{content.courses.length}</span>
          </div>
          <label className="courses-search">
            <Icon size={16} name="search" />
            <input
              type="search"
              value={query}
              placeholder="Найти курс"
              aria-label="Поиск курсов"
              onChange={event => setQuery(event.target.value)}
            />
          </label>
          <div className="courses-list">
            {filtered.map((course, index) => (
              <button
                key={course.id}
                disabled={uploading}
                aria-pressed={selectedId === course.id}
                onClick={() => setSelectedId(course.id)}
                className={`courses-list-item ${selectedId === course.id ? 'is-selected' : ''}`}
              >
                <span className="courses-list-number">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="courses-list-copy">
                  <strong>{course.title || 'Без названия'}</strong>
                  <small>
                    {formatMoney(course.priceMinor, course.currency)}
                  </small>
                </span>
                <Icon size={16} name={course.visible ? 'eye' : 'hidden'} />
                <span className="courses-sr-only">
                  {course.visible ? 'Виден на лендинге' : 'Скрыт'}
                </span>
              </button>
            ))}
          </div>
          {!filtered.length && (
            <p className="courses-empty-list">
              {content.courses.length
                ? 'По вашему запросу ничего не найдено'
                : 'Курсов пока нет'}
            </p>
          )}
          <p className="courses-catalog-note">
            Добавьте курс в блок «Курсы» редактора лендинга, чтобы разместить
            его на странице
          </p>
        </aside>
        {selected ? (
          <CourseEditor
            key={selected.id}
            course={selected}
            onDelete={deleteCourse}
            onUploadingChange={value => {
              setUploading(value)
              onUploadingChange?.(value)
            }}
            onChange={next =>
              onChange({
                ...content,
                courses: content.courses.map(course =>
                  course.id === next.id ? next : course,
                ),
              })
            }
          />
        ) : (
          <div className="courses-empty">
            <Icon size={36} name="book" />
            <h2>{content.courses.length ? 'Выберите курс' : 'Первый курс'}</h2>
            <p>
              {content.courses.length
                ? 'Откройте курс из каталога для редактирования'
                : 'Создайте карточку с описанием, обложкой и ценой'}
            </p>
            {!content.courses.length && (
              <button onClick={addCourse} className="courses-button">
                Добавить курс
              </button>
            )}
          </div>
        )}
      </div>
      <p className="courses-publish-note">
        Изменения появятся на лендинге после нажатия «Опубликовать»
      </p>
    </section>
  )
}
