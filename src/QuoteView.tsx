import { useState } from 'react'
import { createGoldenQuote } from './domain'
import type { GoldenQuote } from './domain'
import { Icon } from './AppIcons'

type QuoteViewProps = {
  quotes: GoldenQuote[]
  onAddQuote: (quote: GoldenQuote) => void
  onUpdateQuote: (quote: GoldenQuote) => void
  onDeleteQuote: (id: string) => void
}

export function QuoteView({ quotes, onAddQuote, onUpdateQuote, onDeleteQuote }: QuoteViewProps) {
  const [newText, setNewText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')

  function handleAdd() {
    const text = newText.trim()
    if (!text) return
    const quote = createGoldenQuote(text)
    onAddQuote(quote)
    setNewText('')
  }

  function startEdit(quote: GoldenQuote) {
    setEditingId(quote.id)
    setEditingText(quote.text)
  }

  function saveEdit() {
    if (!editingId) return
    const text = editingText.trim()
    if (!text) return
    onUpdateQuote({
      id: editingId,
      text,
      createdAt: quotes.find((q) => q.id === editingId)?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    setEditingId(null)
    setEditingText('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingText('')
  }

  return (
    <section className="quote-view">
      <header className="section-header">
        <div>
          <h1>金句库</h1>
          <p>记录自己总结的金句，在日常记录页一键调用。</p>
        </div>
      </header>

      <div className="quote-input-row">
        <textarea
          className="quote-input"
          placeholder="写下你的金句..."
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          rows={2}
        />
        <button
          className="primary-action quote-add-btn"
          onClick={handleAdd}
          type="button"
          disabled={!newText.trim()}
        >
          <Icon name="plus" size={17} />
          添加
        </button>
      </div>

      {quotes.length === 0 ? (
        <div className="quote-empty">
          <Icon name="sparkles" size={32} />
          <p>还没有金句。写下第一条属于你的智慧结晶吧。</p>
        </div>
      ) : (
        <div className="quote-list">
          {quotes.map((quote) => (
            <div key={quote.id} className="quote-card">
              {editingId === quote.id ? (
                <div className="quote-edit-row">
                  <textarea
                    className="quote-edit-input"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    rows={2}
                    autoFocus
                  />
                  <div className="quote-edit-actions">
                    <button className="quote-btn save" onClick={saveEdit} type="button">
                      保存
                    </button>
                    <button className="quote-btn cancel" onClick={cancelEdit} type="button">
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="quote-text">{quote.text}</div>
                  <div className="quote-meta">
                    <span>{new Date(quote.createdAt).toLocaleDateString('zh-CN')}</span>
                    <div className="quote-actions">
                      <button onClick={() => startEdit(quote)} type="button" title="编辑">
                        <Icon name="file" size={14} />
                      </button>
                      <button onClick={() => onDeleteQuote(quote.id)} type="button" title="删除">
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
