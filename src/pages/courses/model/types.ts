import type { Course, SiteContent } from '@/entities/site'

export interface CoursesPageProps {
  content: SiteContent
  onChange: (content: SiteContent) => void
  onUploadingChange?: (uploading: boolean) => void
}

export interface CourseEditorProps {
  course: Course
  onDelete: () => void
  onChange: (course: Course) => void
  onUploadingChange: (uploading: boolean) => void
}

export interface MediaChoice {
  id: string
  url: string
}
