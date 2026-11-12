import { useState, useEffect } from 'react'

import { Icon } from '@/shared/ui/icon'
import type { Block } from '@/entities/site'
import { createBlock } from '@/entities/site'

import { BlockEditor } from './BlockEditor'
import { LandingPreview } from './LandingPreview'
import type { HomePageProps } from '../model/types'
import { blockNames, blockTypes, blockDescriptions } from '../model/blocks'

export function HomePage({
  content,
  onChange,
  onUploadingChange,
}: HomePageProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [adding, setAdding] = useState(false)
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [uploading, setUploading] = useState(false)
  const selected =
    content.blocks[Math.min(activeIndex, content.blocks.length - 1)]
  const selectedIndex = selected ? content.blocks.indexOf(selected) : -1
  const visible = content.blocks.filter(block => block.visible).length

  useEffect(
    () => () => {
      onUploadingChange?.(false)
    },
    [onUploadingChange],
  )

  function uploadingChanged(value: boolean) {
    setUploading(value)
    onUploadingChange?.(value)
  }

  function add(type: Block['type']) {
    const block = createBlock(type)
    onChange({ ...content, blocks: [...content.blocks, block] })
    setActiveIndex(content.blocks.length)
    setAdding(false)
    setTab('edit')
  }
  function update(block: Block) {
    onChange({
      ...content,
      blocks: content.blocks.map((item, index) =>
        index === selectedIndex ? block : item,
      ),
    })
  }
  function move(direction: number) {
    const blocks = [...content.blocks]
    const target = selectedIndex + direction
    if (target < 0 || target >= blocks.length) {
      return
    }
    ;[blocks[selectedIndex], blocks[target]] = [
      blocks[target],
      blocks[selectedIndex],
    ]
    onChange({ ...content, blocks })
    setActiveIndex(target)
  }
  function duplicate() {
    if (!selected) {
      return
    }
    const block = {
      ...structuredClone(selected),
      id: `${selected.type}-${crypto.randomUUID().slice(0, 8)}`,
    }
    const blocks = [...content.blocks]
    blocks.splice(selectedIndex + 1, 0, block)
    onChange({ ...content, blocks })
    setActiveIndex(selectedIndex + 1)
  }
  function remove() {
    if (
      !selected ||
      !window.confirm(
        `Удалить блок «${selected.title || blockNames[selected.type]}»? Изменение применится после публикации`,
      )
    ) {
      return
    }
    const blocks = content.blocks.filter((_, index) => index !== selectedIndex)
    onChange({ ...content, blocks })
    setActiveIndex(Math.max(0, selectedIndex - 1))
  }

  return (
    <section className="landing-page">
      <div className="landing-heading">
        <div>
          <span className="landing-eyebrow">ВАШ САЙТ, ПО РАЗДЕЛАМ</span>
          <h1>
            Лендинг
            <span aria-hidden="true" className="landing-heading-star">
              ✳
            </span>
          </h1>
          <p>Содержание, порядок блоков и первое впечатление</p>
        </div>
        <button
          disabled={uploading}
          className="landing-button"
          onClick={() => {
            setTab(tab === 'edit' ? 'preview' : 'edit')
            setAdding(false)
          }}
        >
          <Icon size={17} name={tab === 'edit' ? 'eye' : 'layout'} />
          {tab === 'edit' ? 'Предпросмотр' : 'К редактированию'}
        </button>
      </div>
      <div className="landing-toolbar">
        <div
          role="tablist"
          className="landing-tabs"
          aria-label="Режим редактора"
          onKeyDown={event => {
            if (uploading) {
              return
            }
            let next: typeof tab
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              next = tab === 'edit' ? 'preview' : 'edit'
            } else if (event.key === 'Home') {
              next = 'edit'
            } else if (event.key === 'End') {
              next = 'preview'
            } else {
              return
            }
            event.preventDefault()
            setTab(next)
            document.getElementById(`${next}-tab`)?.focus()
          }}
        >
          <button
            role="tab"
            id="edit-tab"
            disabled={uploading}
            aria-selected={tab === 'edit'}
            onClick={() => setTab('edit')}
            tabIndex={tab === 'edit' ? 0 : -1}
            aria-controls="landing-edit-panel"
          >
            Содержание
            <span>{content.blocks.length.toString().padStart(2, '0')}</span>
          </button>
          <button
            role="tab"
            id="preview-tab"
            disabled={uploading}
            aria-selected={tab === 'preview'}
            onClick={() => setTab('preview')}
            tabIndex={tab === 'preview' ? 0 : -1}
            aria-controls="landing-preview-panel"
          >
            Предпросмотр
          </button>
        </div>
        <span className="landing-public-count">
          <i />
          {visible} из {content.blocks.length} блоков видны
        </span>
      </div>
      {tab === 'edit' ? (
        <div
          role="tabpanel"
          id="landing-edit-panel"
          aria-labelledby="edit-tab"
          className="landing-editor-layout"
        >
          <aside className="landing-structure">
            <div className="landing-structure-title">
              <h2>Структура страницы</h2>
              <span>{String(content.blocks.length).padStart(2, '0')}</span>
            </div>
            <div className="landing-blocks">
              {content.blocks.map((block, index) => (
                <button
                  key={index}
                  disabled={uploading}
                  aria-pressed={index === selectedIndex && !adding}
                  onClick={() => {
                    setActiveIndex(index)
                    setAdding(false)
                  }}
                  className={`landing-block ${index === selectedIndex && !adding ? 'is-selected' : ''} ${!block.visible ? 'is-hidden' : ''}`}
                >
                  <span className="landing-block-number">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <strong>{block.title || blockNames[block.type]}</strong>
                    <small>{blockNames[block.type]}</small>
                  </span>
                  <Icon size={15} name={block.visible ? 'eye' : 'hidden'} />
                </button>
              ))}
            </div>
            {!content.blocks.length && (
              <div className="landing-structure-empty">
                <Icon size={30} name="layout" />
                <p>Пока нет разделов</p>
                <small>Соберите страницу из блоков</small>
              </div>
            )}
            <button
              className="landing-add-block"
              onClick={() => setAdding(true)}
              disabled={uploading || content.blocks.length >= 200}
            >
              <Icon size={17} name="plus" />
              Добавить блок
            </button>
            <div className="landing-structure-note">
              <span>01 — 08</span>
              <p>
                Восемь типов блоков.
                <br />
                Любой порядок и сочетание
              </p>
            </div>
          </aside>
          <div className="landing-editor">
            {adding || !selected ? (
              <div className="landing-block-catalog">
                <div className="landing-catalog-title">
                  <span className="landing-eyebrow">КОНСТРУКТОР СТРАНИЦЫ</span>
                  <h2>
                    {content.blocks.length
                      ? 'Добавить раздел'
                      : 'С чего начнём'}
                  </h2>
                  <p>Выберите блок, который нужен вашему лендингу</p>
                </div>
                <div className="landing-block-types">
                  {blockTypes.map((type, i) => (
                    <button
                      key={type}
                      onClick={() => add(type)}
                      disabled={content.blocks.length >= 200}
                    >
                      <span
                        aria-hidden="true"
                        className={`landing-type-art type-${type}`}
                      >
                        <span />
                        <span />
                        <span />
                      </span>
                      <span className="landing-type-name">
                        <strong>{blockNames[type]}</strong>
                        <span>{String(i + 1).padStart(2, '0')} ↗</span>
                      </span>
                      <small>{blockDescriptions[type]}</small>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="landing-editor-head">
                  <div>
                    <span className="landing-eyebrow">
                      БЛОК {String(selectedIndex + 1).padStart(2, '0')}
                    </span>
                    <h2>{blockNames[selected.type]}</h2>
                  </div>
                  <label className="landing-switch">
                    <input
                      type="checkbox"
                      disabled={uploading}
                      checked={selected.visible}
                      onChange={event =>
                        update({ ...selected, visible: event.target.checked })
                      }
                    />
                    <span />
                    {selected.visible ? 'Виден на сайте' : 'Скрыт'}
                  </label>
                </div>
                {uploading && (
                  <p role="status" className="landing-upload-status">
                    Загружаем изображение… Редактирование продолжится после
                    загрузки
                  </p>
                )}
                <BlockEditor
                  block={selected}
                  content={content}
                  onChange={update}
                  key={selectedIndex}
                  uploading={uploading}
                  onUploadingChange={uploadingChanged}
                />
                <div className="landing-editor-bottom">
                  <div>
                    <button
                      title="Переместить выше"
                      onClick={() => move(-1)}
                      className="landing-icon-button"
                      aria-label="Переместить блок выше"
                      disabled={uploading || selectedIndex === 0}
                    >
                      <Icon name="up" size={18} />
                    </button>
                    <button
                      onClick={() => move(1)}
                      title="Переместить ниже"
                      className="landing-icon-button"
                      aria-label="Переместить блок ниже"
                      disabled={
                        uploading || selectedIndex === content.blocks.length - 1
                      }
                    >
                      <Icon size={18} name="down" />
                    </button>
                    <button
                      onClick={duplicate}
                      className="landing-button small"
                      disabled={uploading || content.blocks.length >= 200}
                    >
                      <Icon size={15} name="copy" />
                      Дублировать
                    </button>
                  </div>
                  <button
                    onClick={remove}
                    disabled={uploading}
                    title="Удалить блок"
                    aria-label="Удалить блок"
                    className="landing-icon-button danger"
                  >
                    <Icon size={18} name="trash" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div
          role="tabpanel"
          id="landing-preview-panel"
          aria-labelledby="preview-tab"
          className="landing-preview-area"
        >
          <div className="landing-preview-controls">
            <p>
              Предпросмотр содержимого · оформление лендинга может отличаться
            </p>
            <div>
              <button
                aria-pressed={device === 'desktop'}
                onClick={() => setDevice('desktop')}
                className={device === 'desktop' ? 'active' : ''}
              >
                Компьютер
              </button>
              <button
                aria-pressed={device === 'mobile'}
                onClick={() => setDevice('mobile')}
                className={device === 'mobile' ? 'active' : ''}
              >
                Телефон
              </button>
            </div>
          </div>
          <div className={`landing-preview-window ${device}`}>
            <div className="landing-browser-bar">
              <span />
              <span />
              <span />
              <small>{content.site.title || 'Ваш лендинг'}</small>
            </div>
            <LandingPreview content={content} />
          </div>
        </div>
      )}
      <div className="landing-publish-note">
        <Icon size={16} name="check" />
        <span>
          Публикация обновит лендинг и сохранит текущую версию в истории
        </span>
        <a href="#history">
          История версий <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  )
}
