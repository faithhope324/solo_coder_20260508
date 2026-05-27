export interface TableInfo {
  table_id: string
  table_name: string
  columns: string[]
  dtypes: Record<string, string>
  row_count: number
  preview: Record<string, any>[]
  conv_id: string
}

export interface AskResponse {
  answer: string
  sql: string
  row_ids: number[]
  conv_id: string
  rows: Record<string, any>[]
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  sql?: string
  timestamp?: number
}
