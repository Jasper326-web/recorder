import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import './App.css'
import {
  buildCalendarDays,
  createEntry,
  exportEntries,
  filterEntries,
  importEntries,
  loadEntries,
  mergeEntries,
  saveEntries,
  toDateKey,
  trainingTracks,
} from './domain'
import type { Entry, EntryType, TrainingTrackName } from './domain'
import { fetchCloudEntries, getCloudVideoUrl, uploadVideoBlob, upsertCloudEntries, upsertCloudEntry } from './cloudSync'
import { hasSupabaseConfig, supabase } from './supabaseClient'
import { clearVideoBlobs } from './videoStore'

type Tab = 'record' | 'calendar' | 'list' | 'companion' | 'settings'

type ChatMessage = {
  role: 'assistant' | 'user'
  content: string
}

type IconName =
  | 'bot'
  | 'calendar'
  | 'camera'
  | 'check'
  | 'chevron-left'
  | 'chevron-right'
  | 'download'
  | 'file'
  | 'heart'
  | 'home'
  | 'list'
  | 'mic'
  | 'play'
  | 'plus'
  | 'search'
  | 'settings'
  | 'sparkles'
  | 'square'
  | 'trash'
  | 'upload'
  | 'video'

const navItems: Array<{ id: Tab; label: string; icon: IconName }> = [
  { id: 'record', label: '记录', icon: 'home' },
  { id: 'calendar', label: '日历', icon: 'calendar' },
  { id: 'list', label: '列表', icon: 'list' },
  { id: 'companion', label: '心灵小蜜', icon: 'bot' },
  { id: 'settings', label: '设置', icon: 'settings' },
]

function App() {
  const [entries, setEntries] = useState<Entry[]>(() => loadEntries())
  const [activeTab, setActiveTab] = useState<Tab>('record')
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    saveEntries(entries)
  }, [entries])

  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? entries[0]
  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [entries],
  )

  function addEntry(entry: Entry) {
    setEntries((current) => [entry, ...current])
    setSelectedEntryId(entry.id)
    setStatus('已保存。你刚刚又多看见了自己一点。')
  }

  async function clearAll() {
    localStorage.clear()
    await clearVideoBlobs()
    setEntries([])
    setSelectedEntryId(null)
    setStatus('本地记录已清空。')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="主导航">
        <div className="brand">
          <div className="brand-mark">
            <Icon name="heart" size={22} />
          </div>
          <div>
            <strong>频繁记录</strong>
            <span>把自己看清楚</span>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => {
            return (
              <button
                className={activeTab === item.id ? 'nav-item active' : 'nav-item'}
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                type="button"
              >
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="sidebar-note">
          <Icon name="sparkles" size={18} />
          <p>训练情绪控制力、生活觉知力、口才表达能力和头脑清晰度。</p>
        </div>
      </aside>

      <main className="main-panel">
        {activeTab === 'record' && <RecordView onAddEntry={addEntry} />}
        {activeTab === 'calendar' && <CalendarView entries={entries} onSelectEntry={setSelectedEntryId} />}
        {activeTab === 'list' && <ListView entries={sortedEntries} onSelectEntry={setSelectedEntryId} />}
        {activeTab === 'companion' && <CompanionView entries={sortedEntries} selectedEntry={selectedEntry} />}
        {activeTab === 'settings' && <SettingsView entries={sortedEntries} onImport={setEntries} onClear={clearAll} />}
      </main>

      <aside className="companion-rail">
        <CompanionCard entry={selectedEntry} total={entries.length} />
      </aside>

      <nav className="mobile-nav" aria-label="移动端主导航">
        {navItems.map((item) => {
          return (
            <button
              aria-label={item.label}
              className={activeTab === item.id ? 'mobile-nav-item active' : 'mobile-nav-item'}
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              type="button"
            >
              <Icon name={item.icon} size={20} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {status && (
        <div className="toast" role="status">
          <Icon name="check" size={17} />
          {status}
        </div>
      )}
    </div>
  )
}

function RecordView({ onAddEntry }: { onAddEntry: (entry: Entry) => void }) {
  const [type, setType] = useState<EntryType>('text')
  const [bodyText, setBodyText] = useState('')
  const [error, setError] = useState('')
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  useEffect(() => {
    return () => {
      stopCamera()
      if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    }
  }, [recordedUrl])

  async function startCamera() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraReady(true)
    } catch {
      setError('无法打开摄像头。请检查浏览器权限，已输入的文字不会丢失。')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraReady(false)
  }

  function startRecording() {
    if (!streamRef.current) {
      setError('请先打开摄像头。')
      return
    }
    chunksRef.current = []
    const recorder = new MediaRecorder(streamRef.current)
    recorderRef.current = recorder
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      if (recordedUrl) URL.revokeObjectURL(recordedUrl)
      setRecordedBlob(blob)
      setRecordedUrl(URL.createObjectURL(blob))
      setIsRecording(false)
    }
    recorder.start()
    setIsRecording(true)
  }

  function stopRecording() {
    recorderRef.current?.stop()
  }

  async function submitEntry(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (type === 'text' && !bodyText.trim()) {
      setError('先写下一点点也可以。')
      return
    }
    if (type === 'video' && !recordedBlob) {
      setError('视频记录需要先完成一段录制。')
      return
    }
    if (!supabase) {
      setError('还没有配置 Supabase，暂时不能上传记录。')
      return
    }

    setIsSaving(true)
    try {
      const { data } = await supabase.auth.getSession()
      const userId = data.session?.user.id

      if (!userId) {
        setError('请先到设置页登录，再保存记录。')
        return
      }

      const baseEntry = createEntry({
        type,
        bodyText,
      })
      const videoBlobRef = type === 'video' && recordedBlob ? await uploadVideoBlob(baseEntry.id, userId, recordedBlob) : undefined
      const entry = videoBlobRef ? { ...baseEntry, videoBlobRef } : baseEntry

      await upsertCloudEntry(entry, userId)
      onAddEntry(entry)
      setBodyText('')
      setRecordedBlob(null)
      if (recordedUrl) URL.revokeObjectURL(recordedUrl)
      setRecordedUrl('')
      stopCamera()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '上传失败。请先保留当前页面，稍后再试。')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="record-view">
      <header className="section-header">
        <div>
          <h1>开始记录</h1>
          <p>打开就写，或者打开摄像头就录。记录完成后会自动上传到 Supabase。</p>
        </div>
        <div className="mode-switch" aria-label="记录类型">
          <button className={type === 'text' ? 'active' : ''} onClick={() => setType('text')} type="button">
            <Icon name="file" size={18} />
            文字
          </button>
          <button className={type === 'video' ? 'active' : ''} onClick={() => setType('video')} type="button">
            <Icon name="video" size={18} />
            视频
          </button>
        </div>
      </header>

      <form className="record-layout" onSubmit={submitEntry}>
        <div className="record-composer">
          {type === 'text' ? (
            <label className="field-block">
              <span>文字记录</span>
              <textarea
                className="body-textarea simple-entry"
                onChange={(event) => setBodyText(event.target.value)}
                placeholder="直接写下此刻的真实状态、刚发生的事、想法或下一步。"
                value={bodyText}
              />
            </label>
          ) : (
            <div className="video-recorder">
              <div className="camera-frame">
                {recordedUrl ? (
                  <video controls src={recordedUrl} />
                ) : (
                  <video autoPlay muted playsInline ref={videoRef} />
                )}
                {!cameraReady && !recordedUrl && (
                  <div className="camera-empty">
                    <Icon name="camera" size={30} />
                    <span>打开前置摄像头，录一段给未来的自己。</span>
                  </div>
                )}
              </div>
              <div className="recorder-actions">
                <button onClick={startCamera} type="button">
                  <Icon name="camera" size={17} />
                  打开摄像头
                </button>
                <button disabled={!cameraReady || isRecording} onClick={startRecording} type="button">
                  <Icon name="mic" size={17} />
                  开始录制
                </button>
                <button className="danger-soft" disabled={!isRecording} onClick={stopRecording} type="button">
                  <Icon name="square" size={17} />
                  停止
                </button>
              </div>
            </div>
          )}

          {error && <p className="form-error">{error}</p>}
          <button className="primary-action" disabled={isSaving} type="submit">
            <Icon name="plus" size={19} />
            {isSaving ? '正在上传' : '保存并上传'}
          </button>
        </div>
      </form>
    </section>
  )
}

function CalendarView({ entries, onSelectEntry }: { entries: Entry[]; onSelectEntry: (id: string) => void }) {
  const [anchor, setAnchor] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()))
  const days = useMemo(() => buildCalendarDays(entries, anchor), [entries, anchor])
  const dayEntries = entries
    .filter((entry) => toDateKey(new Date(entry.createdAt)) === selectedDate)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  function moveMonth(offset: number) {
    setAnchor((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  return (
    <section>
      <header className="section-header">
        <div>
          <h1>日历</h1>
          <p>看见频率，比追求完美更重要。</p>
        </div>
        <div className="calendar-controls">
          <button onClick={() => moveMonth(-1)} type="button" aria-label="上个月">
            <Icon name="chevron-left" size={18} />
          </button>
          <strong>{anchor.getFullYear()} 年 {anchor.getMonth() + 1} 月</strong>
          <button onClick={() => moveMonth(1)} type="button" aria-label="下个月">
            <Icon name="chevron-right" size={18} />
          </button>
        </div>
      </header>

      <div className="calendar-layout">
        <div className="calendar-grid">
          {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
            <span className="weekday" key={day}>{day}</span>
          ))}
          {days.map((day) => (
            <button
              className={[
                'calendar-day',
                day.isCurrentMonth ? '' : 'muted',
                day.count ? 'has-entry' : '',
                selectedDate === day.dateKey ? 'selected' : '',
              ].join(' ')}
              key={day.dateKey}
              onClick={() => setSelectedDate(day.dateKey)}
              type="button"
            >
              <span>{day.dayNumber}</span>
              {day.count > 0 && <strong>{day.count}</strong>}
              <div className="day-dots">
                {day.categories.slice(0, 3).map((category) => (
                  <i key={category} />
                ))}
              </div>
            </button>
          ))}
        </div>

        <div className="day-panel">
          <h2>{selectedDate} 的记录</h2>
          {dayEntries.length === 0 ? (
            <EmptyState text="这一天还没有记录。空白也是真实状态。" />
          ) : (
            dayEntries.map((entry) => <EntryCard entry={entry} key={entry.id} onSelect={onSelectEntry} />)
          )}
        </div>
      </div>
    </section>
  )
}

function ListView({ entries, onSelectEntry }: { entries: Entry[]; onSelectEntry: (id: string) => void }) {
  const [type, setType] = useState<EntryType | 'all'>('all')
  const [category, setCategory] = useState<TrainingTrackName | 'all'>('all')
  const [query, setQuery] = useState('')
  const visibleEntries = useMemo(() => filterEntries(entries, { type, category, query }), [entries, type, category, query])

  return (
    <section>
      <header className="section-header">
        <div>
          <h1>列表</h1>
          <p>按类型和训练目标回看自己，找到反复出现的模式。</p>
        </div>
      </header>
      <div className="filters">
        <label>
          <Icon name="search" size={17} />
          <input onChange={(event) => setQuery(event.target.value)} placeholder="搜索记录、标签或状态" value={query} />
        </label>
        <select onChange={(event) => setType(event.target.value as EntryType | 'all')} value={type}>
          <option value="all">全部类型</option>
          <option value="text">文字</option>
          <option value="video">视频</option>
        </select>
        <select onChange={(event) => setCategory(event.target.value as TrainingTrackName | 'all')} value={category}>
          <option value="all">全部训练目标</option>
          {trainingTracks.map((track) => (
            <option key={track.name} value={track.name}>{track.name}</option>
          ))}
        </select>
      </div>
      <div className="entry-list">
        {visibleEntries.length === 0 ? (
          <EmptyState text="还没有匹配的记录。" />
        ) : (
          visibleEntries.map((entry) => <EntryCard entry={entry} key={entry.id} onSelect={onSelectEntry} />)
        )}
      </div>
    </section>
  )
}

function CompanionView({ entries, selectedEntry }: { entries: Entry[]; selectedEntry?: Entry }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '我是心灵小蜜。登录并同步后，我会读取你 Supabase 里的日记作为上下文，陪你总结今天、分析模式，或把混乱想法拆清楚。',
    },
  ])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [error, setError] = useState('')

  async function sendMessage(event: FormEvent) {
    event.preventDefault()
    if (!input.trim()) return
    if (!supabase) {
      setError('还没有配置 Supabase，暂时不能让心灵小蜜读取云端日记。')
      return
    }

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: input.trim() }]
    setMessages(nextMessages)
    setInput('')
    setError('')
    setIsThinking(true)

    try {
      const { data } = await supabase.auth.getSession()
      const accessToken = data.session?.access_token

      if (!accessToken) {
        throw new Error('请先到设置页登录 Supabase，并上传或拉取日记。')
      }

      const response = await fetch('/api/companion', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: nextMessages }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? '心灵小蜜暂时没有回复。')
      }

      setMessages((current) => [...current, { role: 'assistant', content: payload.reply }])
    } catch (requestError) {
      const fallbackReply = buildCompanionReply(input, entries, selectedEntry)
      setMessages((current) => [...current, { role: 'assistant', content: fallbackReply }])
      setInput(input)
      setError(requestError instanceof Error ? requestError.message : '心灵小蜜暂时不可用。')
    } finally {
      setIsThinking(false)
    }
  }

  return (
    <section className="chat-view">
      <header className="section-header">
        <div>
          <h1>心灵小蜜</h1>
          <p>它不会替你下诊断，只帮你把记录里的情绪、事实和下一步看清楚。</p>
        </div>
      </header>
      <div className="chat-window">
        {messages.map((message, index) => (
          <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
            {message.role === 'assistant' && <Icon name="bot" size={18} />}
            <p>{message.content}</p>
          </div>
        ))}
        {isThinking && (
          <div className="message assistant">
            <Icon name="bot" size={18} />
            <p>我正在读取你的云端日记，再慢慢想清楚。</p>
          </div>
        )}
      </div>
      {error && <p className="chat-error">{error}</p>}
      <form className="chat-input" onSubmit={sendMessage}>
        <input disabled={isThinking} onChange={(event) => setInput(event.target.value)} placeholder="例如：帮我总结今天，或者分析最近的情绪模式" value={input} />
        <button disabled={isThinking} type="submit">
          <Icon name="sparkles" size={18} />
          {isThinking ? '思考' : '发送'}
        </button>
      </form>
    </section>
  )
}

function SettingsView({
  entries,
  onImport,
  onClear,
}: {
  entries: Entry[]
  onImport: (entries: Entry[]) => void
  onClear: () => void
}) {
  const [message, setMessage] = useState('')
  const [cloudMessage, setCloudMessage] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user
      setUserEmail(user?.email ?? '')
      setUserId(user?.id ?? '')
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? '')
      setUserId(session?.user.id ?? '')
    })

    return () => subscription.unsubscribe()
  }, [])

  function downloadExport() {
    const blob = new Blob([exportEntries(entries)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `self-recorder-${toDateKey(new Date())}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage('已导出记录元数据。视频原始文件仍只保存在本机浏览器里。')
  }

  async function handleImport(file?: File) {
    if (!file) return
    try {
      onImport(importEntries(await file.text()))
      setMessage('导入完成。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '导入失败。')
    }
  }

  async function signUp() {
    if (!supabase) return
    if (!email.trim() || password.length < 6) {
      setCloudMessage('请输入邮箱和至少 6 位密码。')
      return
    }

    setIsSyncing(true)
    setCloudMessage('')
    try {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
      if (error) throw error
      setCloudMessage(data.session ? '注册并登录成功。' : '注册成功。如果 Supabase 要求确认邮件，请先去邮箱点确认链接。')
    } catch (error) {
      setCloudMessage(error instanceof Error ? error.message : '注册失败。')
    } finally {
      setIsSyncing(false)
    }
  }

  async function signIn() {
    if (!supabase) return
    if (!email.trim() || !password) {
      setCloudMessage('请输入邮箱和密码。')
      return
    }

    setIsSyncing(true)
    setCloudMessage('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      setCloudMessage('登录成功。')
    } catch (error) {
      setCloudMessage(error instanceof Error ? error.message : '登录失败。')
    } finally {
      setIsSyncing(false)
    }
  }

  async function signOut() {
    if (!supabase) return
    setIsSyncing(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setCloudMessage('已退出登录，本地记录仍然保留。')
    } catch (error) {
      setCloudMessage(error instanceof Error ? error.message : '退出失败。')
    } finally {
      setIsSyncing(false)
    }
  }

  async function uploadLocalEntries() {
    if (!userId) {
      setCloudMessage('请先登录，再上传本地记录。')
      return
    }

    setIsSyncing(true)
    setCloudMessage('')
    try {
      await upsertCloudEntries(entries, userId)
      setCloudMessage(`已上传 ${entries.length} 条记录到 Supabase。`)
    } catch (error) {
      setCloudMessage(error instanceof Error ? error.message : '上传失败，本地记录没有丢失。')
    } finally {
      setIsSyncing(false)
    }
  }

  async function pullCloudEntries() {
    if (!userId) {
      setCloudMessage('请先登录，再拉取云端记录。')
      return
    }

    setIsSyncing(true)
    setCloudMessage('')
    try {
      const cloudEntries = await fetchCloudEntries()
      const merged = mergeEntries(entries, cloudEntries)
      onImport(merged)
      setCloudMessage(`已拉取 ${cloudEntries.length} 条云端记录，并和本地合并。`)
    } catch (error) {
      setCloudMessage(error instanceof Error ? error.message : '拉取失败，本地记录没有丢失。')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <section>
      <header className="section-header">
        <div>
          <h1>设置</h1>
          <p>本地优先保存；登录后可以把文字记录和元信息同步到 Supabase。</p>
        </div>
      </header>
      <div className="settings-grid">
        <div className="settings-block">
          <h2>云同步</h2>
          <p>视频原文件仍只保存在当前设备；云端同步标题、三问、正文、分类、标签和心灵小蜜摘要。</p>
          {!hasSupabaseConfig ? (
            <p className="settings-message warning">还没有读取到 Vercel 环境变量。请确认变量名是 VITE_SUPABASE_URL 和 VITE_SUPABASE_PUBLISHABLE_KEY。</p>
          ) : userEmail ? (
            <>
              <div className="sync-status">
                <span>已登录</span>
                <strong>{userEmail}</strong>
              </div>
              <div className="settings-actions">
                <button disabled={isSyncing} onClick={uploadLocalEntries} type="button">
                  <Icon name="upload" size={17} />
                  上传本地记录
                </button>
                <button disabled={isSyncing} onClick={pullCloudEntries} type="button">
                  <Icon name="download" size={17} />
                  拉取云端记录
                </button>
                <button className="danger-soft" disabled={isSyncing} onClick={signOut} type="button">
                  退出登录
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="cloud-auth">
                <label>
                  <span>邮箱</span>
                  <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" value={email} />
                </label>
                <label>
                  <span>密码</span>
                  <input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} placeholder="至少 6 位" type="password" value={password} />
                </label>
              </div>
              <div className="settings-actions">
                <button disabled={isSyncing} onClick={signIn} type="button">
                  登录
                </button>
                <button disabled={isSyncing} onClick={signUp} type="button">
                  注册
                </button>
              </div>
            </>
          )}
          {cloudMessage && <p className="settings-message">{cloudMessage}</p>}
        </div>
        <div className="settings-block">
          <h2>本地数据</h2>
          <p>当前共有 {entries.length} 条记录。文字和记录元信息保存在 localStorage，视频保存在 IndexedDB。</p>
          <div className="settings-actions">
            <button onClick={downloadExport} type="button">
              <Icon name="download" size={17} />
              导出记录
            </button>
            <label className="file-button">
              <Icon name="upload" size={17} />
              导入 JSON
              <input accept="application/json" onChange={(event) => handleImport(event.target.files?.[0])} type="file" />
            </label>
            <button className="danger-soft" onClick={onClear} type="button">
              <Icon name="trash" size={17} />
              清空本地数据
            </button>
          </div>
          {message && <p className="settings-message">{message}</p>}
        </div>
        <div className="settings-block">
          <h2>AI 使用说明</h2>
          <p>当前版本使用本地模拟的心灵小蜜反馈。后续接真实 AI 时，默认只读取文字、标题、分类、标签和摘要；视频必须由你手动选择后才会分析。</p>
        </div>
      </div>
    </section>
  )
}

function CompanionCard({ entry, total }: { entry?: Entry; total: number }) {
  return (
    <div className="companion-card">
      <div className="companion-title">
        <Icon name="bot" size={20} />
        <strong>心灵小蜜</strong>
      </div>
      {entry ? (
        <>
          <p>{entry.aiReflection}</p>
          <div className="mini-stat">
            <span>总记录</span>
            <strong>{total}</strong>
          </div>
          <div className="chip-row">
            <span>{entry.category}</span>
            {entry.tags.slice(0, 2).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </>
      ) : (
        <p>先留下第一条记录，我会帮你把它整理成能回看的线索。</p>
      )}
    </div>
  )
}

function EntryCard({ entry, onSelect }: { entry: Entry; onSelect: (id: string) => void }) {
  return (
    <article className="entry-card" onClick={() => onSelect(entry.id)}>
      <div className="entry-card-head">
        <div>
          <strong>{entry.title}</strong>
          <span>{new Date(entry.createdAt).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
        </div>
        <span className="entry-type">{entry.type === 'video' ? '视频' : '文字'}</span>
      </div>
      <p>{entry.aiSummary}</p>
      {entry.type === 'video' && entry.videoBlobRef && <VideoPlayback videoBlobRef={entry.videoBlobRef} />}
      <div className="chip-row">
        <span>{entry.category}</span>
        {entry.tags.slice(0, 4).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </article>
  )
}

function VideoPlayback({ videoBlobRef }: { videoBlobRef: string }) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    let isMounted = true
    getCloudVideoUrl(videoBlobRef).then((signedUrl) => {
      if (signedUrl && isMounted) setUrl(signedUrl)
    })
    return () => {
      isMounted = false
    }
  }, [videoBlobRef])

  if (!url) {
    return (
      <div className="video-placeholder">
        <Icon name="play" size={18} />
        视频正在读取
      </div>
    )
  }

  return <video className="entry-video" controls src={url} />
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <Icon name="sparkles" size={20} />
      <p>{text}</p>
    </div>
  )
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
  }
  const paths: Record<IconName, ReactNode> = {
    bot: (
      <>
        <rect x="5" y="8" width="14" height="10" rx="3" />
        <path d="M12 4v4M8.5 13h.01M15.5 13h.01M9 18v2h6v-2" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </>
    ),
    camera: (
      <>
        <path d="M4 8h3l1.6-2h6.8L17 8h3v11H4z" />
        <circle cx="12" cy="13.5" r="3.2" />
      </>
    ),
    check: <path d="M5 12.5l4 4L19 6.5" />,
    'chevron-left': <path d="M15 18l-6-6 6-6" />,
    'chevron-right': <path d="M9 6l6 6-6 6" />,
    download: <path d="M12 4v10m0 0l-4-4m4 4l4-4M5 20h14" />,
    file: (
      <>
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </>
    ),
    heart: <path d="M4 10a4 4 0 0 1 7-2.6A4 4 0 0 1 18 10c0 2.1-1.5 3.6-3 5l-4 4-4-4c-1.5-1.4-3-2.9-3-5ZM6 13h3l1-2 2 5 2-7 1 4h3" />,
    home: <path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" />,
    list: <path d="M4 6h16M7 12h13M10 18h10" />,
    mic: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </>
    ),
    play: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M10 8l6 4-6 4z" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="M16 16l4 4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.8-1L14.4 3h-4.8L9.3 6a7 7 0 0 0-1.8 1L5.1 6l-2 3.5 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 1.8 1l.3 3h4.8l.3-3a7 7 0 0 0 1.8-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z" />
      </>
    ),
    sparkles: <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM5 15l.8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8zM19 14l.7 1.8 1.8.7-1.8.7L19 19l-.7-1.8-1.8-.7 1.8-.7z" />,
    square: <rect x="7" y="7" width="10" height="10" rx="1" />,
    trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" />,
    upload: <path d="M12 20V10m0 0l-4 4m4-4l4 4M5 4h14" />,
    video: (
      <>
        <rect x="4" y="7" width="11" height="10" rx="2" />
        <path d="M15 10l5-3v10l-5-3z" />
      </>
    ),
  }

  return (
    <svg aria-hidden="true" height={size} viewBox="0 0 24 24" width={size} {...common}>
      {paths[name]}
    </svg>
  )
}

function buildCompanionReply(input: string, entries: Entry[], selectedEntry?: Entry) {
  const todayKey = toDateKey(new Date())
  const todayEntries = entries.filter((entry) => toDateKey(new Date(entry.createdAt)) === todayKey)
  const categoryCounts = trainingTracks
    .map((track) => ({
      name: track.name,
      count: entries.filter((entry) => entry.category === track.name).length,
    }))
    .sort((a, b) => b.count - a.count)
  const strongest = categoryCounts[0]

  if (input.includes('今天') || input.includes('总结')) {
    return todayEntries.length
      ? `今天你记录了 ${todayEntries.length} 次。最值得留意的是：你没有让感受只停在身体里，而是把它说出来、写下来。下一步可以选一条记录，补一句“我真正需要的是什么”。`
      : '今天还没有记录。可以从一句话开始：我现在身体最明显的感觉是什么？'
  }

  if (input.includes('模式') || input.includes('情绪')) {
    return entries.length
      ? `从已有记录看，你最近最常训练的是「${strongest.name}」。这说明你的改变入口已经出现了：先识别反复出现的场景，再把反应放慢半拍。`
      : '我还需要更多记录才能看见模式。先连续记录三次真实状态，我们就有材料了。'
  }

  if (selectedEntry) {
    return `看这条记录，我会把它拆成三层：事实是「${selectedEntry.promptAnswers.event || selectedEntry.title}」；情绪线索是「${selectedEntry.promptAnswers.state || '还可以继续命名'}」；下一步是「${selectedEntry.promptAnswers.next || '先补一个小动作'}」。`
  }

  return '可以的。先别急着把话说漂亮，把真实状态说出来就已经是在训练清晰度了。'
}

export default App
