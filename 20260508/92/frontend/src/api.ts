import { AskResponse, TableInfo } from './types'

const BASE = ''

export async function uploadFile(file: File): Promise<TableInfo> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${BASE}/api/upload`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error((await res.json()).detail || '上传失败')
  return res.json()
}

export async function getPreview(
  tableId: string,
  offset = 0,
  limit = 100
): Promise<{ data: Record<string, any>[]; total: number }> {
  const res = await fetch(
    `${BASE}/api/tables/${tableId}/preview?offset=${offset}&limit=${limit}`
  )
  if (!res.ok) throw new Error('获取表格数据失败')
  return res.json()
}

export async function askQuestion(
  tableId: string,
  question: string,
  convId = ''
): Promise<AskResponse> {
  const res = await fetch(`${BASE}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table_id: tableId, question, conv_id: convId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '问答请求失败' }))
    throw new Error(err.detail || '问答请求失败')
  }
  return res.json()
}

export async function deleteTable(tableId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/tables/${tableId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除表格失败')
}
