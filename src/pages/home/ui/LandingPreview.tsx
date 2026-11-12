import { formatMoney } from '@/shared/lib/money'

import type { LandingPreviewProps } from '../model/types'

export function LandingPreview({ content }: LandingPreviewProps) {
  return (
    <article className="landing-preview">
      <div className="landing-preview-brand">
        {content.site.title || 'Название проекта'}
        <span>PERSONA1IA</span>
      </div>
      {!content.blocks.some(block => block.visible) && (
        <div className="landing-preview-empty">
          <h2>Здесь появится ваш лендинг</h2>
          <p>Добавьте блоки и включите их видимость</p>
        </div>
      )}
      {content.blocks
        .filter(block => block.visible)
        .map(block => (
          <section
            key={block.id}
            className={`landing-preview-block preview-${block.type}`}
          >
            <h2>{block.title}</h2>
            {'text' in block && <p>{block.text}</p>}
            {'imageId' in block && block.imageId && (
              <img alt={block.title} src={`/api/media/${block.imageId}`} />
            )}
            {block.type === 'hero' && block.action && (
              <span className="landing-preview-cta">
                {block.action.label} ↗
              </span>
            )}
            {block.type === 'courses' && (
              <div className="landing-preview-courses">
                {block.courseIds
                  .map(id => content.courses.find(course => course.id === id))
                  .filter(course => course?.visible)
                  .map(
                    course =>
                      course && (
                        <div key={course.id}>
                          {course.imageId && (
                            <img alt="" src={`/api/media/${course.imageId}`} />
                          )}
                          <h3>{course.title}</h3>
                          <p>{course.description}</p>
                          <strong>
                            {formatMoney(course.priceMinor, course.currency)}
                          </strong>
                        </div>
                      ),
                  )}
              </div>
            )}
            {block.type === 'gallery' && (
              <div className="landing-preview-gallery">
                {block.images.map((item, i) => (
                  <img
                    alt={item.alt}
                    key={`${item.imageId}-${i}`}
                    src={`/api/media/${item.imageId}`}
                  />
                ))}
              </div>
            )}
            {block.type === 'testimonials' &&
              block.items.map((item, i) => (
                <blockquote key={i}>
                  <p>«{item.text}»</p>
                  <footer>
                    {item.imageId && (
                      <img alt="" src={`/api/media/${item.imageId}`} />
                    )}
                    <span>{item.author}</span>
                  </footer>
                </blockquote>
              ))}
            {block.type === 'faq' &&
              block.items.map((item, i) => (
                <details key={i}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            {block.type === 'contacts' && (
              <div className="landing-preview-contacts">
                <span>{content.site.contacts.email}</span>
                <span>{content.site.contacts.phone}</span>
                <span>{content.site.contacts.address}</span>
                {content.site.contacts.links.map((link, i) => (
                  <span key={i}>{link.label} ↗</span>
                ))}
              </div>
            )}
          </section>
        ))}
    </article>
  )
}
