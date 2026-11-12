export interface ApiIssue {
  message: string
  path: (string | number)[]
}

export interface ApiErrorBody {
  error?: string
  message?: string
  issues?: ApiIssue[]
}
