import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, ReactNode } from 'react'
import './App.css'
import {
  abstinenceStatuses,
  buildCalendarDays,
  clearEntries,
  createEntry,
  filterEntries,
  getAbstinenceStatusMeta,
  habitOptions,
  loadDailyStates,
  loadEntries,
  mergeEntries,
  saveDailyStates,
  saveEntries,
  toDateKey,
  trainingTracks,
  upsertDailyState,
} from './domain'
import type { AbstinenceStatus, DailyState, Entry, EntryType, HabitName, InterventionContent, TrainingTrackName } from './domain'
import {
  clearLoginSession,
  enforceLoginSessionExpiry,
  getLoginSessionRemainingDays,
  getLoginSessionStartedAt,
  markLoginSession,
  SESSION_DAYS,
} from './authSession'
import { fetchCloudDailyStates, fetchCloudEntries, getCloudMediaUrl, uploadMediaBlob, upsertCloudDailyState, upsertCloudEntry } from './cloudSync'
import { hasSupabaseConfig, supabase } from './supabaseClient'
import { clearVideoBlobs } from './videoStore'

type Tab = 'record' | 'calendar' | 'list' | 'companion' | 'settings'

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
  | 'music'
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

const rememberedEmailKey = 'self-recorder.remembered-emails.v1'

function App() {
  const [entries, setEntries] = useState<Entry[]>(() => loadEntries())
  const [dailyStates, setDailyStates] = useState<Record<string, DailyState>>(() => loadDailyStates())
  const [activeTab, setActiveTab] = useState<Tab>('record')
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    saveEntries(entries)
  }, [entries])

  useEffect(() => {
    saveDailyStates(dailyStates)
  }, [dailyStates])

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

    async function loadCloudDailyStates() {
      try {
        const cloudDailyStates = await fetchCloudDailyStates()
        if (!isMounted) return
        setDailyStates((current) => ({ ...cloudDailyStates, ...current }))
      } catch {
        if (isMounted) console.warn('读取 Supabase 每日状态失败，使用本地数据。')
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

  async function saveDailyState(dateKey: string, abstinenceStatus?: AbstinenceStatus, habits?: HabitName[]) {
    const newState: DailyState = {
      dateKey,
      abstinenceStatus,
      habits: habits ?? [],
      updatedAt: new Date().toISOString(),
    }
    setDailyStates((current) => upsertDailyState(current, newState))

    if (supabase) {
      try {
        const { data } = await supabase.auth.getSession()
        const userId = data.session?.user.id
        if (userId) {
          await upsertCloudDailyState(newState, userId)
        }
      } catch (error) {
        console.warn('保存每日状态到云端失败:', error)
      }
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
        {activeTab === 'record' && <RecordView onAddEntry={addEntry} />}
        {activeTab === 'calendar' && <CalendarView entries={entries} dailyStates={dailyStates} onSelectEntry={setSelectedEntryId} onSaveDailyState={saveDailyState} />}
        {activeTab === 'list' && <ListView entries={sortedEntries} onSelectEntry={setSelectedEntryId} />}
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

function InterventionDisplay({ content }: { content: InterventionContent }) {
  const panelClass = `intervention-panel level-${content.uiLevel}`

  return (
    <div
      className={panelClass}
      style={{
        '--iv-color': content.color,
        '--iv-bg': content.background,
      } as CSSProperties}
    >
      <div className="iv-header">
        <div className="iv-stage-title">
          <span className="iv-level-badge">阶段 {content.level}</span>
          <h3>{content.stageTitle}</h3>
        </div>
        <p className="iv-subtitle">{content.stageSubtitle}</p>
      </div>

      <div className="iv-core-strategy">
        <Icon name="sparkles" size={16} />
        <span>{content.coreStrategy}</span>
      </div>

      <div className="iv-section iv-buddha">
        <h4>
          <Icon name="heart" size={14} />
          佛号持诵
        </h4>
        <div className="iv-chant">{content.buddhaChant}</div>
        <p className="iv-buddha-name">{content.buddhaName}</p>
        <p className="iv-meaning">{content.buddhaMeaning}</p>
      </div>

      <div className="iv-section">
        <h4>
          <Icon name="file" size={14} />
          中医与传统文化警醒
        </h4>
        <ul>
          {content.tcmAdvice.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="iv-section">
        <h4>
          <Icon name="sparkles" size={14} />
          警醒语
        </h4>
        <ul>
          {content.warningQuotes.map((item, index) => (
            <li key={index} className="quote-line">{item}</li>
          ))}
        </ul>
      </div>

      <div className="iv-section iv-actions">
        <h4>
          <Icon name="plus" size={14} />
          立即行动
        </h4>
        <ol>
          {content.actionSteps.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ol>
      </div>
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

      const baseEntry = createEntry({
        type,
        bodyText,
      })
      const videoBlobRef = type !== 'text' && recordedBlob ? await uploadMediaBlob(baseEntry.id, userId, recordedBlob, type) : undefined
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
              <span>文字记录</span>
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
  dailyStates,
  onSelectEntry,
  onSaveDailyState,
}: {
  entries: Entry[]
  dailyStates: Record<string, DailyState>
  onSelectEntry: (id: string) => void
  onSaveDailyState: (dateKey: string, abstinenceStatus?: AbstinenceStatus, habits?: HabitName[]) => Promise<void>
}) {
  const [anchor, setAnchor] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()))
  const [localStatus, setLocalStatus] = useState<AbstinenceStatus | ''>('')
  const [localHabits, setLocalHabits] = useState<HabitName[]>([])
  const days = useMemo(() => buildCalendarDays(entries, dailyStates, anchor), [entries, dailyStates, anchor])
  const dayEntries = entries
    .filter((entry) => toDateKey(new Date(entry.createdAt)) === selectedDate)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const selectedDailyState = dailyStates[selectedDate]
  const effectiveStatus = localStatus || selectedDailyState?.abstinenceStatus || ''
  const effectiveHabits = localHabits.length > 0 ? localHabits : (selectedDailyState?.habits ?? [])

  useEffect(() => {
    setLocalStatus('')
    setLocalHabits([])
  }, [selectedDate])

  function moveMonth(offset: number) {
    setAnchor((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  function toggleHabit(habit: HabitName) {
    setLocalHabits((current) =>
      current.includes(habit)
        ? current.filter((h) => h !== habit)
        : [...current, habit],
    )
  }

  async function handleSaveStatus(status: AbstinenceStatus) {
    setLocalStatus(status)
    await onSaveDailyState(selectedDate, status, effectiveHabits)
  }

  async function handleSaveHabits() {
    const newHabits = localHabits.length > 0 ? localHabits : effectiveHabits
    setLocalHabits(newHabits)
    await onSaveDailyState(selectedDate, effectiveStatus || undefined, newHabits)
  }

  async function handleClearStatus() {
    setLocalStatus('')
    await onSaveDailyState(selectedDate, undefined, effectiveHabits)
  }

  async function handleClearHabits() {
    setLocalHabits([])
    await onSaveDailyState(selectedDate, effectiveStatus, [])
  }

  const dayStatusMeta = effectiveStatus ? getAbstinenceStatusMeta(effectiveStatus) : null

  return (
    <section>
      <header className="section-header">
        <div>
          <h1>日历</h1>
          <p>点击日期，记录每日状态和习惯。看见频率，比追求完美更重要。</p>
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

      <div className="status-legend" role="list" aria-label="戒色状态图例">
        {abstinenceStatuses.map((status) => (
          <span
            key={status.name}
            className="legend-item"
            role="listitem"
            style={{
              '--legend-color': status.color,
              '--legend-bg': status.background,
            } as CSSProperties}
          >
            <i aria-hidden="true" />
            {status.name}
          </span>
        ))}
      </div>

      <div className="calendar-layout">
        <div className="calendar-grid">
          {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
            <span className="weekday" key={day}>{day}</span>
          ))}
          {days.map((day) => {
            const statusMeta = day.abstinenceStatus ? getAbstinenceStatusMeta(day.abstinenceStatus) : null
            return (
              <button
                className={[
                  'calendar-day',
                  day.isCurrentMonth ? '' : 'muted',
                  day.count ? 'has-entry' : '',
                  day.abstinenceStatus ? 'has-status' : '',
                  selectedDate === day.dateKey ? 'selected' : '',
                ].join(' ')}
                data-abstinence-status={day.abstinenceStatus ?? ''}
                key={day.dateKey}
                onClick={() => setSelectedDate(day.dateKey)}
                type="button"
                style={statusMeta ? {
                  '--day-status-bg': statusMeta.background,
                  '--day-status-color': statusMeta.color,
                  '--day-status-level': statusMeta.level,
                } as CSSProperties : undefined}
              >
                <span className="day-number">{day.dayNumber}</span>
                {day.abstinenceStatus && (
                  <>
                    <em className="day-status-label">{day.abstinenceStatus}</em>
                    <div className="day-status-bar" aria-hidden="true" />
                  </>
                )}
                {day.count > 0 && <strong>{day.count}</strong>}
                <div className="day-dots">
                  {day.categories.slice(0, 3).map((category) => (
                    <i key={category} />
                  ))}
                </div>
                {day.habits.length > 0 && (
                  <div className="day-habits">
                    {day.habits.map((habitName) => {
                      const habitMeta = habitOptions.find((h) => h.name === habitName)
                      return (
                        <span
                          key={habitName}
                          className="day-habit-tag"
                          style={{
                            '--habit-color': habitMeta?.color ?? '#3d8b7a',
                          } as CSSProperties}
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

          <div className={`status-panel ${dayStatusMeta ? `level-${dayStatusMeta.uiLevel}` : ''}`}>
            <div className="status-panel-header">
              <div>
                <strong>戒色状态</strong>
                <span>选择当前阶段，立即获取对应干预内容</span>
              </div>
              {dayStatusMeta && (
                <div className="status-clear" role="button" tabIndex={0} onClick={handleClearStatus}>
                  清除
                </div>
              )}
            </div>

            <div className="status-stage-picker">
              {abstinenceStatuses.map((stage) => (
                <button
                  key={stage.name}
                  className={effectiveStatus === stage.name ? 'stage-btn active' : 'stage-btn'}
                  style={{
                    '--stage-color': stage.color,
                    '--stage-bg': stage.background,
                  } as CSSProperties}
                  onClick={() => handleSaveStatus(stage.name)}
                  type="button"
                >
                  <span className="stage-level-badge">{stage.level}</span>
                  <span className="stage-name">{stage.name}</span>
                </button>
              ))}
            </div>

            {dayStatusMeta && (
              <InterventionDisplay content={dayStatusMeta} />
            )}
          </div>

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
            {(localHabits.length > 0 || selectedDailyState?.habits?.length) ? (
              <div className="habits-actions">
                <button className="status-save-btn" onClick={handleSaveHabits} type="button">
                  保存习惯
                </button>
                <button className="danger-soft" onClick={handleClearHabits} type="button">
                  清除
                </button>
              </div>
            ) : null}
          </div>

          <h3>{selectedDate} 的记录</h3>
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
        <span className="abstinence-chip" style={{
          '--status-bg': getAbstinenceStatusMeta(entry.abstinenceStatus).background,
          '--status-color': getAbstinenceStatusMeta(entry.abstinenceStatus).color,
        } as CSSProperties}>{entry.abstinenceStatus}</span>
        {entry.habits.map((habitName) => {
          const habitMeta = habitOptions.find((h) => h.name === habitName)
          return (
            <span
              key={habitName}
              className="habit-chip"
              style={{
                '--habit-color': habitMeta?.color ?? '#3d8b7a',
              } as CSSProperties}
            >
              {habitMeta?.icon} {habitName}
            </span>
          )
        })}
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
    music: <path d="M9 18V6l10-2v12M9 10l10-2M6 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
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
