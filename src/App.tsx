import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { ReactNode } from 'react'
import './App.css'
import { Icon, type IconName } from './AppIcons'
import {
  addPendingDesireSync,
  buildCalendarDays,
  clearEntries,
  createDesireRecord,
  createEntry,
  createGoldenQuote,
  deleteDesireRecord,
  deleteGoldenQuote,
  filterEntries,
  getDesireRecordsForDate,
  getDesireStats,
  habitOptions,
  loadDailyStates,
  loadDesireRecords,
  loadEntries,
  loadGoldenQuotes,
  loadMicroHabitStates,
  microHabitOptions,
  loadPendingDesireSync,
  mergeEntries,
  removePendingDesireSync,
  saveDailyStates,
  saveDesireRecords,
  saveEntries,
  saveGoldenQuotes,
  saveMicroHabitStates,
  toDateKey,
  trainingTracks,
  upsertDailyState,
  upsertDesireRecord,
  upsertGoldenQuote,
  upsertMicroHabitState,
} from './domain'
import type { DailyState, DesireIntensity, DesireRecord, Entry, EntryType, GoldenQuote, HabitName, MicroHabitName, MicroHabitState, TrainingTrackName } from './domain'
import {
  clearLoginSession,
  enforceLoginSessionExpiry,
  getLoginSessionRemainingDays,
  getLoginSessionStartedAt,
  markLoginSession,
  SESSION_DAYS,
} from './authSession'
import { fetchCloudDailyStates, fetchCloudDesireRecords, fetchCloudGoldenQuotes, fetchCloudMicroHabitStates, fetchCloudEntries, getCloudMediaUrl, uploadMediaBlob, upsertCloudDailyState, upsertCloudDesireRecord, upsertCloudGoldenQuote, upsertCloudMicroHabitState, upsertCloudEntry, deleteCloudDesireRecord, deleteCloudGoldenQuote } from './cloudSync'
import { hasSupabaseConfig, supabase } from './supabaseClient'
import { clearVideoBlobs } from './videoStore'
import { DesireForm, DesireView } from './DesireView'
import { MicroHabitView } from './MicroHabitView'
import { QuoteView } from './QuoteView'

type Tab = 'record' | 'calendar' | 'list' | 'desire' | 'microHabit' | 'quote' | 'companion' | 'settings'

type ChatMessage = {
  role: 'assistant' | 'user'
  content: string
}

type CompanionPersonaId = 'gentle' | 'coach' | 'poet' | 'strategist'

const companionPersonas: Array<{
  id: CompanionPersonaId
  name: string
  description: string
}> = [
  {
    id: 'gentle',
    name: '温柔小蜜',
    description: '先接住情绪，再给很小的一步。',
  },
  {
    id: 'coach',
    name: '清醒教练',
    description: '直接拆事实、模式和行动。',
  },
  {
    id: 'poet',
    name: '诗意朋友',
    description: '更细腻、更有画面感地回应。',
  },
  {
    id: 'strategist',
    name: '战略参谋',
    description: '把记录整理成选择、优先级和方案。',
  },
]

const navItems: Array<{ id: Tab; label: string; icon: IconName }> = [
  { id: 'record', label: '记录', icon: 'home' },
  { id: 'calendar', label: '日历', icon: 'calendar' },
  { id: 'list', label: '列表', icon: 'list' },
  { id: 'desire', label: '邪念', icon: 'flame' },
  { id: 'microHabit', label: '微习惯', icon: 'target' },
  { id: 'quote', label: '金句', icon: 'sparkles' },
  { id: 'companion', label: '心灵小蜜', icon: 'bot' },
  { id: 'settings', label: '设置', icon: 'settings' },
]

const rememberedEmailKey = 'self-recorder.remembered-emails.v1'

function App() {
  const [entries, setEntries] = useState<Entry[]>(() => loadEntries())
  const [dailyStates, setDailyStates] = useState<Record<string, DailyState>>(() => loadDailyStates())
  const [desireRecords, setDesireRecords] = useState<DesireRecord[]>(() => loadDesireRecords())
  const [microHabitStates, setMicroHabitStates] = useState<Record<string, MicroHabitState>>(() => loadMicroHabitStates())
  const [goldenQuotes, setGoldenQuotes] = useState<GoldenQuote[]>(() => loadGoldenQuotes())
  const [activeTab, setActiveTab] = useState<Tab>('record')
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [prefillDate, setPrefillDate] = useState<string | null>(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    saveEntries(entries)
  }, [entries])

  useEffect(() => {
    saveDailyStates(dailyStates)
  }, [dailyStates])

  useEffect(() => {
    saveDesireRecords(desireRecords)
  }, [desireRecords])

  useEffect(() => {
    saveMicroHabitStates(microHabitStates)
  }, [microHabitStates])

  useEffect(() => {
    saveGoldenQuotes(goldenQuotes)
  }, [goldenQuotes])

  useEffect(() => {
    if (!supabase) return

    const client = supabase
    let isMounted = true

    async function loadCloudEntries() {
      try {
        const cloudEntries = await fetchCloudEntries()
        if (!isMounted) return
        setEntries((current) => mergeEntries(current, cloudEntries))
        if (cloudEntries.length > 0) {
          setStatus(`已从 Supabase 读取 ${cloudEntries.length} 条记录。`)
        }
      } catch {
        if (isMounted) setStatus('读取 Supabase 记录失败，请稍后刷新重试。')
      }
    }

    async function loadCloudDesireRecords() {
      try {
        const cloudDesireRecords = await fetchCloudDesireRecords()
        if (!isMounted) return
        setDesireRecords((current) => {
          const merged = new Map<string, DesireRecord>()
          for (const r of cloudDesireRecords) merged.set(r.id, r)
          for (const r of current) merged.set(r.id, r)
          return Array.from(merged.values())
        })

        const pending = loadPendingDesireSync()
        if (pending.length > 0) {
          const { data: sessionData } = await client.auth.getSession()
          const userId = sessionData.session?.user.id
          if (userId) {
            for (const record of pending) {
              try {
                await upsertCloudDesireRecord(record, userId)
                removePendingDesireSync(record.id)
                if (isMounted) {
                  setDesireRecords((current) => upsertDesireRecord(current, record))
                }
              } catch {
                break
              }
            }
            if (isMounted) {
              const remainingPending = loadPendingDesireSync()
              if (remainingPending.length === 0) {
                setStatus(`云端同步完成，${pending.length} 条待同步邪念记录已上传。`)
              } else {
                setStatus(`${pending.length - remainingPending.length}/${pending.length} 条邪念记录已同步，其余将继续重试。`)
              }
            }
          }
        }
      } catch {
        if (isMounted) console.warn('读取 Supabase 邪念记录失败，使用本地数据。')
      }
    }

    async function loadCloudDailyStates() {
      try {
        const cloudDailyStates = await fetchCloudDailyStates()
        if (!isMounted) return
        setDailyStates((current) => ({ ...cloudDailyStates, ...current }))
      } catch {
        if (isMounted) console.warn('读取 Supabase 每日状态失败，使用本地数据。')
      }
    }

    async function loadCloudMicroHabitStates() {
      try {
        const cloudStates = await fetchCloudMicroHabitStates()
        if (!isMounted) return
        setMicroHabitStates((current) => ({ ...cloudStates, ...current }))
      } catch {
        if (isMounted) console.warn('读取 Supabase 微习惯状态失败，使用本地数据。')
      }
    }

    async function loadCloudGoldenQuotes() {
      try {
        const cloudQuotes = await fetchCloudGoldenQuotes()
        if (!isMounted) return
        setGoldenQuotes((current) => {
          const localIds = new Set(current.map((q) => q.id))
          const merged = [...current]
          for (const cloudQuote of cloudQuotes) {
            if (!localIds.has(cloudQuote.id)) {
              merged.push(cloudQuote)
            }
          }
          return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        })
      } catch {
        if (isMounted) console.warn('读取 Supabase 金句失败，使用本地数据。')
      }
    }

    async function restoreSession() {
      const { data } = await client.auth.getSession()
      if (!data.session) return

      if (!getLoginSessionStartedAt()) {
        markLoginSession()
      }

      const expired = await enforceLoginSessionExpiry(async () => {
        await client.auth.signOut()
      })

      if (!isMounted) return

      if (expired) {
        setStatus(`登录已过期（${SESSION_DAYS} 天），请重新登录。`)
        return
      }

      loadCloudEntries()
      loadCloudDailyStates()
      loadCloudDesireRecords()
      loadCloudMicroHabitStates()
      loadCloudGoldenQuotes()
    }

    restoreSession()

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (session) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          if (event === 'SIGNED_IN' || !getLoginSessionStartedAt()) {
            markLoginSession()
          }
        }
        loadCloudEntries()
        loadCloudDailyStates()
        loadCloudDesireRecords()
        loadCloudMicroHabitStates()
        loadCloudGoldenQuotes()
      } else if (event === 'SIGNED_OUT') {
        clearLoginSession()
      }
    })

    function refreshSessionOnFocus() {
      if (document.visibilityState !== 'visible') return
      client.auth.getSession()
    }

    document.addEventListener('visibilitychange', refreshSessionOnFocus)

    return () => {
      isMounted = false
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', refreshSessionOnFocus)
    }
  }, [])

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

  function addDesireRecord(record: DesireRecord) {
    setDesireRecords((current) => upsertDesireRecord(current, record))
    setStatus(record.successful ? '邪念已记录，成功应对！' : '邪念已记录，下次继续努力。')

    if (supabase) {
      supabase.auth.getSession().then(({ data: sessionData }) => {
        const userId = sessionData.session?.user.id
        if (userId) {
          upsertCloudDesireRecord(record, userId).then(() => {
            removePendingDesireSync(record.id)
          }).catch((error) => {
            console.warn('保存邪念记录到云端失败:', error)
            addPendingDesireSync(record)
            setStatus('本地已保存，云端同步失败，将在网络恢复后自动重试。')
          })
        } else {
          addPendingDesireSync(record)
          setStatus('本地已保存，请先登录后自动同步到云端。')
        }
      })
    }
  }

  async function removeDesireRecord(id: string) {
    setDesireRecords((current) => deleteDesireRecord(current, id))
    removePendingDesireSync(id)
    setStatus('邪念记录已删除。')

    if (supabase) {
      try {
        await deleteCloudDesireRecord(id)
      } catch (error) {
        console.warn('删除邪念记录失败:', error)
      }
    }
  }

  async function saveDailyState(dateKey: string, habits: HabitName[]) {
    const newState: DailyState = {
      dateKey,
      habits,
      updatedAt: new Date().toISOString(),
    }
    setDailyStates((current) => upsertDailyState(current, newState))
    setStatus('习惯已保存。')

    if (supabase) {
      supabase.auth.getSession().then(({ data: sessionData }) => {
        const userId = sessionData.session?.user.id
        if (userId) {
          upsertCloudDailyState(newState, userId).catch((error) => {
            console.warn('保存每日状态到云端失败:', error)
          })
        }
      })
    }
  }

  async function saveMicroHabitState(state: MicroHabitState) {
    setMicroHabitStates((current) => upsertMicroHabitState(current, state))
    setStatus(`微习惯已记录：${state.score}/10 分`)

    if (supabase) {
      supabase.auth.getSession().then(({ data: sessionData }) => {
        const userId = sessionData.session?.user.id
        if (userId) {
          upsertCloudMicroHabitState(state, userId).catch((error) => {
            console.warn('保存微习惯状态到云端失败:', error)
          })
        }
      })
    }
  }

  async function addGoldenQuote(quote: GoldenQuote) {
    setGoldenQuotes((current) => upsertGoldenQuote(current, quote))
    setStatus('金句已添加')

    if (supabase) {
      supabase.auth.getSession().then(({ data: sessionData }) => {
        const userId = sessionData.session?.user.id
        if (userId) {
          upsertCloudGoldenQuote(quote, userId).catch((error) => {
            console.warn('保存金句到云端失败:', error)
          })
        }
      })
    }
  }

  async function updateGoldenQuote(quote: GoldenQuote) {
    setGoldenQuotes((current) => upsertGoldenQuote(current, quote))
    setStatus('金句已更新')

    if (supabase) {
      supabase.auth.getSession().then(({ data: sessionData }) => {
        const userId = sessionData.session?.user.id
        if (userId) {
          upsertCloudGoldenQuote(quote, userId).catch((error) => {
            console.warn('更新金句到云端失败:', error)
          })
        }
      })
    }
  }

  async function removeGoldenQuote(id: string) {
    setGoldenQuotes((current) => deleteGoldenQuote(current, id))
    setStatus('金句已删除')

    if (supabase) {
      deleteCloudGoldenQuote(id).catch((error) => {
        console.warn('删除金句失败:', error)
      })
    }
  }

  async function clearAll() {
    clearEntries()
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
        {activeTab === 'record' && <RecordView onAddEntry={addEntry} prefillDate={prefillDate} onPrefillDateConsumed={() => setPrefillDate(null)} goldenQuotes={goldenQuotes} />}
        {activeTab === 'calendar' && <CalendarView entries={entries} desireRecords={desireRecords} dailyStates={dailyStates} microHabitStates={microHabitStates} onSelectEntry={setSelectedEntryId} onSaveDailyState={saveDailyState} onAddDesireRecord={addDesireRecord} onSaveMicroHabitState={saveMicroHabitState} onGoToRecord={(dateKey) => { setSelectedEntryId(null); setActiveTab('record'); setTimeout(() => setPrefillDate(dateKey), 0); }} />}
        {activeTab === 'list' && <ListView entries={sortedEntries} onSelectEntry={setSelectedEntryId} />}
        {activeTab === 'desire' && <DesireView desireRecords={desireRecords} onAddRecord={addDesireRecord} onDeleteRecord={removeDesireRecord} />}
        {activeTab === 'microHabit' && <MicroHabitView states={microHabitStates} onSaveState={saveMicroHabitState} />}
        {activeTab === 'quote' && <QuoteView quotes={goldenQuotes} onAddQuote={addGoldenQuote} onUpdateQuote={updateGoldenQuote} onDeleteQuote={removeGoldenQuote} />}
        {activeTab === 'companion' && <CompanionView entries={sortedEntries} onOpenSettings={() => setActiveTab('settings')} selectedEntry={selectedEntry} />}
        {activeTab === 'settings' && <SettingsView onClear={clearAll} />}
      </main>

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

function RecordView({ onAddEntry, prefillDate, onPrefillDateConsumed, goldenQuotes }: { onAddEntry: (entry: Entry) => void; prefillDate: string | null; onPrefillDateConsumed: () => void; goldenQuotes: GoldenQuote[] }) {
  const [type, setType] = useState<EntryType>('text')
  const [bodyText, setBodyText] = useState('')
  const [error, setError] = useState('')
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showQuotePicker, setShowQuotePicker] = useState(false)
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

  async function startAudio() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      })
      streamRef.current = stream
      setCameraReady(true)
    } catch {
      setError('无法打开麦克风。请检查浏览器权限，已输入的文字不会丢失。')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraReady(false)
  }

  function startRecording() {
    if (!streamRef.current) {
      setError(type === 'audio' ? '请先打开麦克风。' : '请先打开摄像头。')
      return
    }
    chunksRef.current = []
    const mimeType = getPreferredRecordingMimeType(type)
    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined)
    recorderRef.current = recorder
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || (type === 'audio' ? 'audio/webm' : 'video/webm') })
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
    if (type === 'audio' && !recordedBlob) {
      setError('音频记录需要先完成一段录制。')
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

      const createdAt = prefillDate
        ? new Date(prefillDate + 'T' + new Date().toTimeString().split(' ')[0])
        : undefined

      const baseEntry = createEntry({
        type,
        bodyText,
        createdAt,
      })
      const videoBlobRef = type !== 'text' && recordedBlob ? await uploadMediaBlob(baseEntry.id, userId, recordedBlob, type) : undefined
      const entry = videoBlobRef ? { ...baseEntry, videoBlobRef } : baseEntry

      await upsertCloudEntry(entry, userId)
      onAddEntry(entry)
      if (prefillDate) onPrefillDateConsumed()
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
      {prefillDate && (
        <div className="prefill-notice">
          <Icon name="calendar" size={16} />
          <span>正在为 <strong>{prefillDate}</strong> 补记日志</span>
        </div>
      )}
      <header className="section-header">
        <div>
          <h1>开始记录</h1>
          <p>记录此刻的真实感受，文字、视频或音频都可以。</p>
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
          <button className={type === 'audio' ? 'active' : ''} onClick={() => setType('audio')} type="button">
            <Icon name="music" size={18} />
            音频
          </button>
        </div>
      </header>

      <form className="record-layout" onSubmit={submitEntry}>
        <div className="record-composer">
          {type === 'text' ? (
            <label className="field-block">
              <span>
                文字记录
                {goldenQuotes.length > 0 && (
                  <button
                    className="quote-picker-toggle"
                    type="button"
                    onClick={(e) => { e.preventDefault(); setShowQuotePicker((v) => !v) }}
                  >
                    <Icon name="sparkles" size={13} />
                    金句 ({goldenQuotes.length})
                  </button>
                )}
              </span>
              {showQuotePicker && goldenQuotes.length > 0 && (
                <div className="quote-picker">
                  {goldenQuotes.map((quote) => (
                    <button
                      key={quote.id}
                      type="button"
                      className="quote-picker-item"
                      onClick={(e) => {
                        e.preventDefault()
                        setBodyText((prev) => (prev ? prev + '\n' + quote.text : quote.text))
                      }}
                    >
                      {quote.text}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                className="body-textarea simple-entry"
                onChange={(event) => setBodyText(event.target.value)}
                placeholder="直接写下此刻的真实状态、刚发生的事、想法或下一步。"
                value={bodyText}
              />
            </label>
          ) : type === 'video' ? (
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
          ) : (
            <div className="audio-recorder">
              <div className="audio-frame">
                <Icon name="music" size={34} />
                {recordedUrl ? <audio controls src={recordedUrl} /> : <span>打开麦克风，录一段声音记录。</span>}
              </div>
              <div className="recorder-actions">
                <button onClick={startAudio} type="button">
                  <Icon name="mic" size={17} />
                  打开麦克风
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

function getPreferredRecordingMimeType(type: EntryType) {
  const candidates =
    type === 'audio'
      ? ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
      : ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? ''
}

function loadRememberedEmails() {
  if (typeof localStorage === 'undefined') return []

  try {
    const raw = localStorage.getItem(rememberedEmailKey)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function saveRememberedEmail(email: string) {
  const normalizedEmail = email.trim()
  if (!normalizedEmail) return loadRememberedEmails()

  const nextEmails = [
    normalizedEmail,
    ...loadRememberedEmails().filter((savedEmail) => savedEmail.toLowerCase() !== normalizedEmail.toLowerCase()),
  ].slice(0, 6)

  localStorage.setItem(rememberedEmailKey, JSON.stringify(nextEmails))
  return nextEmails
}

function CalendarView({
  entries,
  desireRecords,
  dailyStates,
  microHabitStates,
  onSelectEntry,
  onSaveDailyState,
  onAddDesireRecord,
  onSaveMicroHabitState,
  onGoToRecord,
}: {
  entries: Entry[]
  desireRecords: DesireRecord[]
  dailyStates: Record<string, DailyState>
  microHabitStates: Record<string, MicroHabitState>
  onSelectEntry: (id: string) => void
  onSaveDailyState: (dateKey: string, habits: HabitName[]) => Promise<void>
  onAddDesireRecord: (record: DesireRecord) => void
  onSaveMicroHabitState: (state: MicroHabitState) => Promise<void>
  onGoToRecord: (dateKey: string) => void
}) {
  const [anchor, setAnchor] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()))
  const [localHabits, setLocalHabits] = useState<HabitName[]>([])
  const [localMicroHabits, setLocalMicroHabits] = useState<MicroHabitName[]>([])
  const [supplementMode, setSupplementMode] = useState<'none' | 'desire' | 'microHabit'>('none')
  const days = useMemo(() => buildCalendarDays(entries, desireRecords, dailyStates, anchor), [entries, desireRecords, dailyStates, anchor])
  const dayEntries = entries
    .filter((entry) => toDateKey(new Date(entry.createdAt)) === selectedDate)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const dayDesireRecords = useMemo(
    () => getDesireRecordsForDate(desireRecords, selectedDate),
    [desireRecords, selectedDate],
  )

  const selectedDailyState = dailyStates[selectedDate]
  const effectiveHabits = localHabits.length > 0 ? localHabits : (selectedDailyState?.habits ?? [])
  const selectedMicroState = microHabitStates[selectedDate]
  const effectiveMicroHabits = localMicroHabits.length > 0 ? localMicroHabits : (selectedMicroState?.habits ?? [])

  useEffect(() => {
    setLocalHabits([])
    setLocalMicroHabits([])
    setSupplementMode('none')
  }, [selectedDate])

  function moveMonth(offset: number) {
    setAnchor((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  async function toggleHabit(habit: HabitName) {
    const newHabits = effectiveHabits.includes(habit)
      ? effectiveHabits.filter((h) => h !== habit)
      : [...effectiveHabits, habit]
    setLocalHabits(newHabits)
    await onSaveDailyState(selectedDate, newHabits)
  }

  async function toggleMicroHabit(habit: MicroHabitName) {
    const newHabits = effectiveMicroHabits.includes(habit)
      ? effectiveMicroHabits.filter((h) => h !== habit)
      : [...effectiveMicroHabits, habit]
    setLocalMicroHabits(newHabits)
    const newState: MicroHabitState = {
      dateKey: selectedDate,
      habits: newHabits,
      score: newHabits.length,
      updatedAt: new Date().toISOString(),
    }
    await onSaveMicroHabitState(newState)
  }

  return (
    <section>
      <header className="section-header">
        <div>
          <h1>日历</h1>
          <p>点击日期，查看当日记录和邪念波动。看见频率，比追求完美更重要。</p>
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
          {days.map((day) => {
            return (
              <button
                className={[
                  'calendar-day',
                  day.isCurrentMonth ? '' : 'muted',
                  day.count ? 'has-entry' : '',
                  day.desireCount > 0 ? 'has-desire' : '',
                  day.habits.length > 0 ? 'has-habits' : '',
                  selectedDate === day.dateKey ? 'selected' : '',
                ].join(' ')}
                key={day.dateKey}
                onClick={() => setSelectedDate(day.dateKey)}
                type="button"
              >
                <span className="day-number">{day.dayNumber}</span>
                {day.count > 0 && <strong>{day.count}</strong>}
                <div className="day-dots">
                  {day.categories.slice(0, 3).map((category) => (
                    <i key={category} />
                  ))}
                </div>
                {day.desireCount > 0 && (
                  <span className="desire-count-indicator" title={`${day.desireCount} 次邪念记录`}>
                    <Icon name="flame" size={12} />
                    {day.desireCount}
                  </span>
                )}
                {day.habits.length > 0 && (
                  <div className="day-habits">
                    {day.habits.map((habitName) => {
                      const habitMeta = habitOptions.find((h) => h.name === habitName)
                      return (
                        <span
                          key={habitName}
                          className="day-habit-tag"
                          style={{ '--habit-color': habitMeta?.color ?? '#3d8b7a' } as CSSProperties}
                          title={habitName}
                        >
                          {habitMeta?.icon}
                        </span>
                      )
                    })}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div className="day-panel">
          <h2>{selectedDate}</h2>

          <div className="habits-section">
            <span className="habits-label">今日习惯</span>
            <div className="habits-checkbox-row">
              {habitOptions.map((habit) => (
                <label
                  key={habit.name}
                  className={`habit-checkbox ${effectiveHabits.includes(habit.name) ? 'checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={effectiveHabits.includes(habit.name)}
                    onChange={() => toggleHabit(habit.name)}
                  />
                  <span className="habit-checkmark">
                    {effectiveHabits.includes(habit.name) && <Icon name="check" size={14} />}
                  </span>
                  <span className="habit-icon">{habit.icon}</span>
                  <span className="habit-name">{habit.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="supplement-actions">
            <span className="supplement-label">补记操作</span>
            <div className="supplement-buttons">
              <button
                type="button"
                className={`supplement-btn ${supplementMode === 'desire' ? 'active' : ''}`}
                onClick={() => setSupplementMode(supplementMode === 'desire' ? 'none' : 'desire')}
              >
                <Icon name="flame" size={15} />
                补记邪念
              </button>
              <button
                type="button"
                className={`supplement-btn ${supplementMode === 'microHabit' ? 'active' : ''}`}
                onClick={() => setSupplementMode(supplementMode === 'microHabit' ? 'none' : 'microHabit')}
              >
                <Icon name="target" size={15} />
                补记微习惯
              </button>
              <button
                type="button"
                className="supplement-btn"
                onClick={() => onGoToRecord(selectedDate)}
              >
                <Icon name="file" size={15} />
                补记日志
              </button>
            </div>
          </div>

          {supplementMode === 'desire' && (
            <div className="supplement-form supplement-desire-form">
              <DesireForm
                onSubmit={(record) => {
                  onAddDesireRecord(record)
                  setSupplementMode('none')
                }}
                onCancel={() => setSupplementMode('none')}
                selectedDate={selectedDate}
              />
            </div>
          )}

          {supplementMode === 'microHabit' && (
            <div className="supplement-microhabits">
              <span className="supplement-section-title">微习惯（{effectiveMicroHabits.length}/10）</span>
              <div className="microhabits-checkbox-row">
                {microHabitOptions.map((habit) => (
                  <label
                    key={habit.name}
                    className={`habit-checkbox micro-habit ${effectiveMicroHabits.includes(habit.name) ? 'checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={effectiveMicroHabits.includes(habit.name)}
                      onChange={() => toggleMicroHabit(habit.name)}
                    />
                    <span className="habit-checkmark">
                      {effectiveMicroHabits.includes(habit.name) && <Icon name="check" size={14} />}
                    </span>
                    <span className="habit-icon">{habit.icon}</span>
                    <span className="habit-name">{habit.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <h3>{selectedDate} 的记录</h3>
          {dayEntries.length === 0 ? (
            <EmptyState text="这一天还没有记录。空白也是真实状态。" />
          ) : (
            dayEntries.map((entry) => <EntryCard entry={entry} key={entry.id} onSelect={onSelectEntry} />)
          )}

          {dayDesireRecords.length > 0 && (
            <>
              <h3>{selectedDate} 的邪念记录</h3>
              <div className="day-desire-list">
                {dayDesireRecords.map((record) => (
                  <div key={record.id} className={`desire-card intensity-${record.intensity} ${record.successful ? 'success' : 'failure'}`}>
                    <div className="desire-card-header">
                      <div className="desire-card-time">
                        <Icon name="flame" size={14} />
                        <span>{new Date(record.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className={`desire-card-result ${record.successful ? 'success' : 'failure'}`}>
                        {record.successful ? '成功' : '失守'}
                      </div>
                    </div>
                    <div className="desire-card-body">
                      <div className="desire-card-field">
                        <span className="field-label">诱因</span>
                        <span className="field-value">{record.trigger}</span>
                      </div>
                      <div className="desire-card-field">
                        <span className="field-label">强度</span>
                        <span className="field-value">{'●'.repeat(record.intensity)}{'○'.repeat(5 - record.intensity)}</span>
                      </div>
                      <div className="desire-card-field">
                        <span className="field-label">应对</span>
                        <span className="field-value">{record.copingStrategy}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
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
          <input onChange={(event) => setQuery(event.target.value)} placeholder="搜索记录或标签" value={query} />
        </label>
        <select onChange={(event) => setType(event.target.value as EntryType | 'all')} value={type}>
          <option value="all">全部类型</option>
          <option value="text">文字</option>
          <option value="video">视频</option>
          <option value="audio">音频</option>
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

function CompanionView({
  entries,
  selectedEntry,
  onOpenSettings,
}: {
  entries: Entry[]
  selectedEntry?: Entry
  onOpenSettings: () => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '我是心灵小蜜。你可以直接和我聊天；登录后，我会读取你 Supabase 里的文字记录作为上下文。',
    },
  ])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [personaId, setPersonaId] = useState<CompanionPersonaId>('gentle')

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? '')
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? '')
    })

    return () => subscription.unsubscribe()
  }, [])

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
        throw new Error('请先登录 Supabase。登录后即使还没有记录，也可以和小蜜聊天；有记录时我会把它们作为上下文。')
      }

      const response = await fetch('/api/companion', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: nextMessages, personaId }),
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
      <div className="persona-picker" aria-label="心灵小蜜角色">
        {companionPersonas.map((persona) => (
          <button
            className={personaId === persona.id ? 'persona-option active' : 'persona-option'}
            key={persona.id}
            onClick={() => setPersonaId(persona.id)}
            type="button"
          >
            <strong>{persona.name}</strong>
            <span>{persona.description}</span>
          </button>
        ))}
      </div>
      {!userEmail && (
        <div className="chat-login-panel">
          <Icon name="bot" size={19} />
          <div>
            <strong>连接 Supabase 后更懂你</strong>
            <p>没有记录也能聊天；登录后，小蜜会读取你已上传的文字记录作为上下文。</p>
          </div>
          <button onClick={onOpenSettings} type="button">
            去设置
          </button>
        </div>
      )}
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
  onClear,
}: {
  onClear: () => void
}) {
  const [cloudMessage, setCloudMessage] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberedEmails, setRememberedEmails] = useState<string[]>(() => loadRememberedEmails())
  const [userEmail, setUserEmail] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const emailSuggestions = useMemo(() => {
    const query = email.trim().toLowerCase()
    if (query.length === 0) return []

    const startsWithMatches = rememberedEmails.filter((savedEmail) => {
      const normalizedEmail = savedEmail.toLowerCase()
      return normalizedEmail.startsWith(query) && normalizedEmail !== query
    })

    if (startsWithMatches.length > 0) return startsWithMatches

    return rememberedEmails.filter((savedEmail) => {
      const normalizedEmail = savedEmail.toLowerCase()
      return normalizedEmail.includes(query) && normalizedEmail !== query
    })
  }, [email, rememberedEmails])
  const loginSessionRemainingDays = userEmail ? getLoginSessionRemainingDays() : 0

  useEffect(() => {
    if (!supabase) return

    const client = supabase

    async function restoreSettingsSession() {
      const { data } = await client.auth.getSession()
      const user = data.session?.user

      if (user) {
        if (!getLoginSessionStartedAt()) {
          markLoginSession()
        }

        const expired = await enforceLoginSessionExpiry(async () => {
          await client.auth.signOut()
        })

        if (expired) {
          setUserEmail('')
          setCloudMessage(`登录已过期（${SESSION_DAYS} 天），请重新登录。`)
          return
        }
      }

      setUserEmail(user?.email ?? '')
      if (user?.email) rememberEmail(user.email)
    }

    restoreSettingsSession()

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      setUserEmail(session?.user.email ?? '')
      if (session?.user.email) {
        if (event === 'SIGNED_IN' || !getLoginSessionStartedAt()) {
          markLoginSession()
        }
        rememberEmail(session.user.email)
      } else if (event === 'SIGNED_OUT') {
        clearLoginSession()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  function rememberEmail(nextEmail: string) {
    const nextEmails = saveRememberedEmail(nextEmail)
    setRememberedEmails(nextEmails)
    setEmail(nextEmail)
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
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      })
      if (error) throw error
      rememberEmail(email.trim())
      markLoginSession()
      setCloudMessage(data.session ? `注册并登录成功。${SESSION_DAYS} 天内无需重复登录。` : '注册成功。如果 Supabase 要求确认邮件，请先去邮箱点确认链接。')
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
      rememberEmail(email.trim())
      markLoginSession()
      setCloudMessage(`登录成功。${SESSION_DAYS} 天内无需重复登录。`)
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
      clearLoginSession()
      setCloudMessage('已退出登录。之后保存记录前需要重新登录。')
    } catch (error) {
      setCloudMessage(error instanceof Error ? error.message : '退出失败。')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <section>
      <header className="section-header">
        <div>
          <h1>设置</h1>
          <p>登录后，文字和视频记录会在点击保存时自动上传到 Supabase。</p>
        </div>
      </header>
      <div className="settings-grid">
        <div className="settings-block">
          <h2>账号连接</h2>
          <p>这里不是手动同步入口。它只负责连接你的 Supabase 账号；之后在记录页点击保存，文字会写入数据库，视频会上传到 Storage。</p>
          {!hasSupabaseConfig ? (
            <p className="settings-message warning">还没有读取到 Vercel 环境变量。请确认变量名是 VITE_SUPABASE_URL 和 VITE_SUPABASE_PUBLISHABLE_KEY。</p>
          ) : userEmail ? (
            <>
              <div className="sync-status">
                <span>已登录</span>
                <strong>{userEmail}</strong>
                <span>登录有效期剩余 {loginSessionRemainingDays} 天（满 {SESSION_DAYS} 天后需重新登录）</span>
              </div>
              <div className="settings-actions">
                <button className="danger-soft" disabled={isSyncing} onClick={signOut} type="button">
                  退出登录
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="cloud-auth">
                <label className="email-field">
                  <span>邮箱</span>
                  <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" value={email} />
                  {emailSuggestions.length > 0 && (
                    <div className="email-suggestions" onMouseDown={(e) => e.preventDefault()}>
                      {emailSuggestions.map((savedEmail) => (
                        <button
                          key={savedEmail}
                          onMouseDown={() => setEmail(savedEmail)}
                          type="button"
                        >
                          {savedEmail}
                        </button>
                      ))}
                    </div>
                  )}
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
          <h2>本机缓存</h2>
          <p>网站会保留一份临时本机缓存，用来让页面刷新后还能显示刚保存的记录。真正长期保存以 Supabase 为准。</p>
          <div className="settings-actions">
            <button className="danger-soft" onClick={onClear} type="button">
              <Icon name="trash" size={17} />
              清空本机缓存
            </button>
          </div>
        </div>
        <div className="settings-block">
          <h2>心灵小蜜</h2>
          <p>小蜜会读取 Supabase 里已上传的文字记录作为上下文。没有记录时也可以聊天，只是它会明确说明暂时没有日记材料。</p>
        </div>
      </div>
    </section>
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
        <span className="entry-type">{entry.type === 'video' ? '视频' : entry.type === 'audio' ? '音频' : '文字'}</span>
      </div>
      <p>{entry.aiSummary}</p>
      {entry.type !== 'text' && entry.videoBlobRef && <MediaPlayback entry={entry} />}
      <div className="chip-row">
        <span>{entry.category}</span>
        {entry.tags.slice(0, 4).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </article>
  )
}

function MediaPlayback({ entry }: { entry: Entry }) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    let isMounted = true
    if (!entry.videoBlobRef) return undefined
    getCloudMediaUrl(entry.videoBlobRef, entry.type).then((signedUrl) => {
      if (signedUrl && isMounted) setUrl(signedUrl)
    })
    return () => {
      isMounted = false
    }
  }, [entry.videoBlobRef, entry.type])

  if (!url) {
    return (
      <div className="video-placeholder">
        <Icon name="play" size={18} />
        视频正在读取
      </div>
    )
  }

  return entry.type === 'audio' ? <audio className="entry-audio" controls src={url} /> : <video className="entry-video" controls src={url} />
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <Icon name="sparkles" size={20} />
      <p>{text}</p>
    </div>
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
      ? `今天你记录了 ${todayEntries.length} 次。最值得留意的是：你没有让感受只停在身体里，而是把它说出来、写下来。下一步可以选一条记录，补一句"我真正需要的是什么"。`
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