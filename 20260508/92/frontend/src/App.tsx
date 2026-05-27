import { useState, useCallback, useRef, useEffect } from 'react'
import { TableInfo, Message as MsgType, AskResponse } from './types'
import { uploadFile, getPreview, askQuestion, deleteTable } from './api'

type Row = Record<string, any>

const PAGE_SIZE = 100

function UploadBox({ onUpload }: { onUpload: (f: File) => void }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) onUpload(file)
    },
    [onUpload]
  )

  return (
    <div className="upload-area">
      <div
        className={`upload-box${dragging ? ' dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="upload-icon">📊</div>
        <div className="upload-text">
          拖拽或<span className="highlight">点击上传</span> Excel / CSV 文件
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onUpload(f)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}

function TableInfoPanel({
  table,
  onDelete,
}: {
  table: TableInfo
  onDelete: () => void
}) {
  return (
    <div className="table-info">
      <div className="table-info-title">表格信息</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
          {table.table_name}
        </span>
        <span
          onClick={onDelete}
          style={{ fontSize: 12, color: '#ef4444', cursor: 'pointer' }}
        >
          删除
        </span>
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
        共 {table.row_count} 行，{table.columns.length} 列
      </div>
      <div className="table-info-title" style={{ marginTop: 12 }}>字段</div>
      <div className="table-info-badges">
        {table.columns.map((c) => (
          <span key={c} className="badge">
            {c}
          </span>
        ))}
      </div>
    </div>
  )
}

function ChatPanel({
  table,
  messages,
  onSend,
  loading,
  convId,
}: {
  table: TableInfo | null
  messages: MsgType[]
  onSend: (q: string) => void
  loading: boolean
  convId: string
}) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const q = input.trim()
    if (!q || loading || !table) return
    onSend(q)
    setInput('')
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      <div className="chat-area">
        {messages.length === 0 ? (
          <div className="chat-empty">
            {table ? '上传成功！开始提问吧 🎯' : '请先上传表格文件'}
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              <div>{m.content}</div>
              {m.sql && <div className="message-sql">{m.sql}</div>}
            </div>
          ))
        )}
        {loading && (
          <div className="message assistant">
            <div className="loading">
              正在思考
              <span className="loading-dot" />
              <span className="loading-dot" />
              <span className="loading-dot" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="input-area">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            placeholder={table ? '用自然语言提问，如"销售额最高的产品是？"' : '请先上传表格'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={!table || loading}
            rows={1}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!table || loading || !input.trim()}
          >
            发送
          </button>
        </div>
      </div>
    </>
  )
}

function DataTable({
  table,
  data,
  total,
  highlightIds,
  page,
  onPageChange,
  loading,
}: {
  table: TableInfo | null
  data: Row[]
  total: number
  highlightIds: number[]
  page: number
  onPageChange: (p: number) => void
  loading: boolean
}) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  if (!table) {
    return (
      <div className="table-container">
        <div className="table-empty">
          <div className="table-empty-content">
            <div className="table-empty-icon">📈</div>
            <div>上传表格后，数据将在这里展示</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="main-header">
        <h2>
          数据预览
          {highlightIds.length > 0 && (
            <span className="row-count-badge">
              命中 {highlightIds.length} 行
            </span>
          )}
        </h2>
        <span className="meta">
          第 {page + 1} / {totalPages} 页
        </span>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className="row-index">#</th>
              {table.columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => {
              const globalIdx = page * PAGE_SIZE + idx
              const isHit = highlightIds.includes(globalIdx)
              return (
                <tr key={idx} className={isHit ? 'highlight' : ''}>
                  <td className="row-index">{globalIdx + 1}</td>
                  {table.columns.map((c) => (
                    <td key={c}>{row[c] ?? ''}</td>
                  ))}
                </tr>
              )
            })}
            {data.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={table.columns.length + 1}
                  style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}
                >
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <span className="pagination-info">
          共 {total} 行，每页 {PAGE_SIZE} 行
        </span>
        <div className="pagination-buttons">
          <button
            className="page-btn"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
          >
            上一页
          </button>
          <button
            className="page-btn"
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
          >
            下一页
          </button>
        </div>
      </div>
    </>
  )
}

export default function App() {
  const [table, setTable] = useState<TableInfo | null>(null)
  const [messages, setMessages] = useState<MsgType[]>([])
  const [data, setData] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [tableLoading, setTableLoading] = useState(false)
  const [highlightIds, setHighlightIds] = useState<number[]>([])
  const [convId, setConvId] = useState('')
  const [error, setError] = useState('')

  const loadPage = useCallback(
    async (tableId: string, p: number) => {
      setTableLoading(true)
      try {
        const res = await getPreview(tableId, p * PAGE_SIZE, PAGE_SIZE)
        setData(res.data)
        setTotal(res.total)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setTableLoading(false)
      }
    },
    []
  )

  const handleUpload = async (file: File) => {
    setTableLoading(true)
    setError('')
    try {
      const info = await uploadFile(file)
      setTable(info)
      setConvId(info.conv_id)
      setMessages([])
      setHighlightIds([])
      setPage(0)
      setData(info.preview)
      setTotal(info.row_count)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setTableLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!table) return
    try {
      await deleteTable(table.table_id)
    } catch {}
    setTable(null)
    setMessages([])
    setData([])
    setTotal(0)
    setHighlightIds([])
    setConvId('')
  }

  const handleSend = async (question: string) => {
    if (!table) return
    setLoading(true)
    setError('')
    setHighlightIds([])

    const userMsg: MsgType = { role: 'user', content: question }
    setMessages((prev) => [...prev, userMsg])

    try {
      const res: AskResponse = await askQuestion(table.table_id, question, convId)
      setConvId(res.conv_id)
      const assistantMsg: MsgType = {
        role: 'assistant',
        content: res.answer,
        sql: res.sql,
      }
      setMessages((prev) => [...prev, assistantMsg])
      setHighlightIds(res.row_ids)

      if (res.row_ids.length > 0) {
        const firstHit = res.row_ids[0]
        const hitPage = Math.floor(firstHit / PAGE_SIZE)
        if (hitPage !== page) {
          setPage(hitPage)
          loadPage(table.table_id, hitPage)
        }
      }
    } catch (e) {
      const errMsg = (e as Error).message
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `❌ ${errMsg}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (p: number) => {
    if (!table) return
    setPage(p)
    loadPage(table.table_id, p)
  }

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>💡 表格问答系统</h1>
          <p>用自然语言查询你的表格数据</p>
        </div>
        {!table && <UploadBox onUpload={handleUpload} />}
        {table && (
          <>
            <UploadBox onUpload={handleUpload} />
            <TableInfoPanel table={table} onDelete={handleDelete} />
          </>
        )}
        <ChatPanel
          table={table}
          messages={messages}
          onSend={handleSend}
          loading={loading}
          convId={convId}
        />
      </div>
      <div className="main-content">
        <DataTable
          table={table}
          data={data}
          total={total}
          highlightIds={highlightIds}
          page={page}
          onPageChange={handlePageChange}
          loading={tableLoading}
        />
      </div>
      {error && (
        <div className="error-toast" onClick={() => setError('')}>
          {error} (点击关闭)
        </div>
      )}
    </div>
  )
}
