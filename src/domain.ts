export type EntryType = 'text' | 'video' | 'audio'

export type HabitName = '英语' | '健步走' | 'iOS编程课' | '备考编制'

export const habitOptions: Array<{
  name: HabitName
  icon: string
  color: string
}> = [
  { name: '英语', icon: '📖', color: '#3d8b7a' },
  { name: '健步走', icon: '🚶', color: '#d97706' },
  { name: 'iOS编程课', icon: '💻', color: '#6b5b7a' },
  { name: '备考编制', icon: '📝', color: '#c2410c' },
]

export type MicroHabitName =
  | '不看擦边软色情'
  | '不独处'
  | '不蹭下体'
  | '16+8饮食'
  | '干净饮食'
  | '减少手机依赖'
  | '清醒后马上起床'
  | '记录日记'
  | '11点前关灯'
  | '不玩游戏'

export const microHabitOptions: Array<{
  name: MicroHabitName
  icon: string
  category: '防护' | '身体' | '纪律' | '成长'
}> = [
  { name: '不看擦边软色情', icon: '🚫', category: '防护' },
  { name: '不独处', icon: '🚶', category: '防护' },
  { name: '不蹭下体', icon: '🛡️', category: '防护' },
  { name: '16+8饮食', icon: '🍽️', category: '身体' },
  { name: '干净饮食', icon: '🥗', category: '身体' },
  { name: '减少手机依赖', icon: '📵', category: '纪律' },
  { name: '清醒后马上起床', icon: '⏰', category: '纪律' },
  { name: '记录日记', icon: '✍️', category: '成长' },
  { name: '11点前关灯', icon: '🌙', category: '纪律' },
  { name: '不玩游戏', icon: '🎮', category: '防护' },
]

export type MicroHabitState = {
  dateKey: string
  habits: MicroHabitName[]
  score: number
  updatedAt: string
}

export const microHabitTierNames = {
  TIER_3: '破局',
  TIER_5: '自持',
  TIER_8: '清净',
} as const

export function getMicroHabitTier(score: number): keyof typeof microHabitTierNames | null {
  if (score >= 8) return 'TIER_8'
  if (score >= 5) return 'TIER_5'
  if (score >= 3) return 'TIER_3'
  return null
}

export function calcMicroHabitScore(habits: MicroHabitName[]): number {
  return habits.length
}

export type TrainingTrackName =
  | '情绪控制力'
  | '生活觉知力'
  | '口才表达能力'
  | '头脑清晰度'

export type PromptAnswers = {
  state: string
  event: string
  next: string
}

export type Entry = {
  id: string
  createdAt: string
  type: EntryType
  habits: HabitName[]
  promptAnswers: PromptAnswers
  bodyText: string
  videoBlobRef?: string
  title: string
  category: TrainingTrackName
  tags: string[]
  aiSummary: string
  aiReflection: string
}

export type EntryDraft = {
  type: EntryType
  habits?: HabitName[]
  promptAnswers?: PromptAnswers
  bodyText: string
  videoBlobRef?: string
  title?: string
  category?: TrainingTrackName
  tags?: string[]
  createdAt?: Date
}

export type CalendarDay = {
  dateKey: string
  dayNumber: number
  isCurrentMonth: boolean
  count: number
  types: EntryType[]
  categories: TrainingTrackName[]
  habits: HabitName[]
  desireCount: number
  desireSuccessCount: number
}

export type DesireIntensity = 1 | 2 | 3 | 4 | 5

export type DesireRecord = {
  id: string
  dateKey: string
  createdAt: string
  trigger: string
  intensity: DesireIntensity
  copingStrategy: string
  successful: boolean
  insight: string
  updatedAt: string
}

export const desireTriggerPresets: string[] = [
  '独处时',
  '睡前',
  '深夜',
  '看到擦边内容',
  '刷短视频',
  '无聊闲坐',
  '工作压力大',
  '情绪低落',
  '久坐不动',
  '饭后放松',
  '晨起',
  '梦中惊醒',
]

export const desireCopingPresets: string[] = [
  '念诵佛号',
  '深呼吸',
  '起身走动',
  '冷水洗脸',
  '做深蹲',
  '运动健身',
  '转移注意力',
  '写下来',
  '打电话给朋友',
  '冥想',
  '阅读修行书籍',
  '做家务',
  '听音乐',
]

export type DailyState = {
  dateKey: string
  habits: HabitName[]
  updatedAt: string
}

const dailyStateStorageKey = 'self-recorder.daily-states.v1'
const desireStorageKey = 'self-recorder.desire-records.v1'
const pendingDesireSyncKey = 'self-recorder.desire-pending-sync.v1'

export function loadDailyStates(): Record<string, DailyState> {
  if (typeof localStorage === 'undefined') return {}

  try {
    const raw = localStorage.getItem(dailyStateStorageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, DailyState>
    }
    return {}
  } catch {
    return {}
  }
}

export function saveDailyStates(states: Record<string, DailyState>) {
  localStorage.setItem(dailyStateStorageKey, JSON.stringify(states))
}

export function upsertDailyState(states: Record<string, DailyState>, state: DailyState): Record<string, DailyState> {
  return {
    ...states,
    [state.dateKey]: {
      ...states[state.dateKey],
      ...state,
      updatedAt: new Date().toISOString(),
    },
  }
}

export function loadDesireRecords(): DesireRecord[] {
  if (typeof localStorage === 'undefined') return []

  try {
    const raw = localStorage.getItem(desireStorageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as DesireRecord[] : []
  } catch {
    return []
  }
}

export function saveDesireRecords(records: DesireRecord[]) {
  localStorage.setItem(desireStorageKey, JSON.stringify(records))
}

export function loadPendingDesireSync(): DesireRecord[] {
  if (typeof localStorage === 'undefined') return []

  try {
    const raw = localStorage.getItem(pendingDesireSyncKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as DesireRecord[]) : []
  } catch {
    return []
  }
}

export function savePendingDesireSync(records: DesireRecord[]) {
  localStorage.setItem(pendingDesireSyncKey, JSON.stringify(records))
}

export function addPendingDesireSync(record: DesireRecord): DesireRecord[] {
  const pending = loadPendingDesireSync()
  const next = upsertDesireRecord(pending, record)
  savePendingDesireSync(next)
  return next
}

export function removePendingDesireSync(id: string): DesireRecord[] {
  const pending = loadPendingDesireSync()
  const next = deleteDesireRecord(pending, id)
  savePendingDesireSync(next)
  return next
}

export function createDesireRecord(input: Omit<DesireRecord, 'id' | 'createdAt' | 'updatedAt' | 'dateKey'> & { createdAt?: Date }): DesireRecord {
  const now = input.createdAt ?? new Date()
  return {
    id: `desire-${now.getTime()}-${Math.random().toString(16).slice(2, 8)}`,
    dateKey: toDateKey(now),
    createdAt: now.toISOString(),
    trigger: input.trigger,
    intensity: input.intensity,
    copingStrategy: input.copingStrategy,
    successful: input.successful,
    insight: input.insight,
    updatedAt: now.toISOString(),
  }
}

export function upsertDesireRecord(records: DesireRecord[], record: DesireRecord): DesireRecord[] {
  const index = records.findIndex((r) => r.id === record.id)
  if (index >= 0) {
    const updated = [...records]
    updated[index] = { ...record, updatedAt: new Date().toISOString() }
    return updated
  }
  return [record, ...records]
}

export function deleteDesireRecord(records: DesireRecord[], id: string): DesireRecord[] {
  return records.filter((r) => r.id !== id)
}

export function getDesireRecordsForDate(records: DesireRecord[], dateKey: string): DesireRecord[] {
  return records
    .filter((r) => r.dateKey === dateKey)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getDesireRecordsForRange(records: DesireRecord[], startDate: Date, endDate: Date): DesireRecord[] {
  const startKey = toDateKey(startDate)
  const endKey = toDateKey(endDate)
  return records
    .filter((r) => r.dateKey >= startKey && r.dateKey <= endKey)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getDesireStats(records: DesireRecord[], startDate: Date, endDate: Date) {
  const range = getDesireRecordsForRange(records, startDate, endDate)
  const total = range.length
  const successCount = range.filter((r) => r.successful).length
  const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0
  const avgIntensity = total > 0 ? (range.reduce((sum, r) => sum + r.intensity, 0) / total).toFixed(1) : '0'

  const triggerCounts = new Map<string, number>()
  for (const r of range) {
    triggerCounts.set(r.trigger, (triggerCounts.get(r.trigger) ?? 0) + 1)
  }
  const topTriggers = Array.from(triggerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const copingCounts = new Map<string, { total: number; success: number }>()
  for (const r of range) {
    const existing = copingCounts.get(r.copingStrategy) ?? { total: 0, success: 0 }
    existing.total += 1
    if (r.successful) existing.success += 1
    copingCounts.set(r.copingStrategy, existing)
  }
  const topCopingStrategies = Array.from(copingCounts.entries())
    .sort((a, b) => b[1].success - a[1].success)
    .slice(0, 5)
    .map(([strategy, stats]) => ({
      strategy,
      total: stats.total,
      successCount: stats.success,
      successRate: stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0,
    }))

  const dailyCounts = new Map<string, { total: number; success: number }>()
  for (const r of range) {
    const existing = dailyCounts.get(r.dateKey) ?? { total: 0, success: 0 }
    existing.total += 1
    if (r.successful) existing.success += 1
    dailyCounts.set(r.dateKey, existing)
  }

  return {
    total,
    successCount,
    successRate,
    avgIntensity,
    topTriggers,
    topCopingStrategies,
    dailyCounts,
  }
}

export type EntryFilter = {
  type?: EntryType | 'all'
  category?: TrainingTrackName | 'all'
  query?: string
}

export const trainingTracks: Array<{
  name: TrainingTrackName
  intent: string
  tags: string[]
  color: string
}> = [
  {
    name: '情绪控制力',
    intent: '看见情绪、命名情绪、把反应放慢一点。',
    tags: ['情绪控制', '消解不良情绪', '稳定'],
    color: '#e46d58',
  },
  {
    name: '生活觉知力',
    intent: '把生活里的细节、选择和真实感受重新看见。',
    tags: ['觉察', '生活观察', '当下'],
    color: '#2f9a8f',
  },
  {
    name: '口才表达能力',
    intent: '练习组织语言、复述事实、清楚表达需求。',
    tags: ['口才表达', '复述', '沟通'],
    color: '#8867ca',
  },
  {
    name: '头脑清晰度',
    intent: '把混乱拆成事实、判断和下一步。',
    tags: ['清晰', '拆解', '行动'],
    color: '#3f79b7',
  },
]

const trackKeywords: Record<TrainingTrackName, string[]> = {
  情绪控制力: ['烦', '焦虑', '生气', '崩', '情绪', '难受', '委屈', '压力', '控制', '消解'],
  生活觉知力: ['觉察', '生活', '身体', '散步', '睡', '吃', '关系', '感受', '意识到', '细节', '安静', '整理', '房间', '日常'],
  口才表达能力: ['说', '表达', '沟通', '复述', '开会', '打断', '演讲', '录', '口才', '需求'],
  头脑清晰度: ['清楚', '清晰', '混乱', '脑子', '拆', '决定', '选择', '计划', '下一步', '思路'],
}

const entryStorageKey = 'self-recorder.entries.v1'

export function createEntry(draft: EntryDraft): Entry {
  const createdAt = draft.createdAt ?? new Date()
  const promptAnswers = draft.promptAnswers ?? { state: '', event: '', next: '' }
  const normalizedDraft = { ...draft, promptAnswers }
  const category = draft.category ?? inferCategory(normalizedDraft)
  const tags = mergeTags(draft.tags ?? [], inferTags(normalizedDraft, category))
  const shell: Omit<Entry, 'aiSummary' | 'aiReflection'> = {
    id: `entry-${createdAt.getTime()}-${Math.random().toString(16).slice(2, 8)}`,
    createdAt: createdAt.toISOString(),
    type: draft.type,
    habits: draft.habits ?? [],
    promptAnswers,
    bodyText: draft.bodyText.trim(),
    videoBlobRef: draft.videoBlobRef,
    title: draft.title?.trim() || buildTitle(normalizedDraft),
    category,
    tags,
  }
  const analysis = analyzeEntry({ ...shell, aiSummary: '', aiReflection: '' })

  return {
    ...shell,
    tags: analysis.tags,
    aiSummary: analysis.summary,
    aiReflection: analysis.reflection,
  }
}

export function analyzeEntry(entry: Entry): {
  category: TrainingTrackName
  tags: string[]
  summary: string
  reflection: string
} {
  const category = entry.category
  const nextAction = entry.promptAnswers.next || '先停一下，给自己一点空间'
  const tags = mergeTags(entry.tags, trainingTracks.find((track) => track.name === category)?.tags.slice(0, 2) ?? [])

  return {
    category,
    tags,
    summary: `你记录到：${entry.promptAnswers.event || entry.bodyText || (entry.type === 'audio' ? '一段音频记录' : '此刻有一些值得被看见的东西')}，这条记录主要在训练「${category}」。`,
    reflection: `心灵小蜜在这里。你已经把模糊的感受放到了明处，这本身就在增加掌控感。接下来可以很小地做一步：${nextAction}。`,
  }
}

export function buildCalendarDays(
  entries: Entry[],
  desireRecords: DesireRecord[],
  dailyStates: Record<string, DailyState>,
  anchorDate = new Date(),
): CalendarDay[] {
  const year = anchorDate.getFullYear()
  const month = anchorDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const start = new Date(firstOfMonth)
  start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const dateKey = toDateKey(date)
    const dayEntries = entries.filter((entry) => toDateKey(new Date(entry.createdAt)) === dateKey)
    const dayDesireRecords = desireRecords.filter((r) => r.dateKey === dateKey)
    const dailyState = dailyStates[dateKey]

    return {
      dateKey,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      count: dayEntries.length,
      types: unique(dayEntries.map((entry) => entry.type)),
      categories: unique(dayEntries.map((entry) => entry.category)),
      habits: dailyState?.habits ?? [],
      desireCount: dayDesireRecords.length,
      desireSuccessCount: dayDesireRecords.filter((r) => r.successful).length,
    }
  })
}

export function filterEntries(entries: Entry[], filter: EntryFilter): Entry[] {
  const query = filter.query?.trim().toLowerCase()

  return entries.filter((entry) => {
    const matchesType = !filter.type || filter.type === 'all' || entry.type === filter.type
    const matchesCategory = !filter.category || filter.category === 'all' || entry.category === filter.category
    const searchable = [entry.title, entry.bodyText, entry.promptAnswers.state, entry.promptAnswers.event, entry.promptAnswers.next, ...entry.tags]
      .join(' ')
      .toLowerCase()
    const matchesQuery = !query || searchable.includes(query)

    return matchesType && matchesCategory && matchesQuery
  })
}

export function loadEntries(): Entry[] {
  if (typeof localStorage === 'undefined') return []

  try {
    const raw = localStorage.getItem(entryStorageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(normalizeEntry) : []
  } catch {
    return []
  }
}

export function saveEntries(entries: Entry[]) {
  localStorage.setItem(entryStorageKey, JSON.stringify(entries))
}

export function clearEntries() {
  localStorage.removeItem(entryStorageKey)
}

export function exportEntries(entries: Entry[]) {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), entries }, null, 2)
}

export function importEntries(json: string): Entry[] {
  const parsed = JSON.parse(json)
  const entries = Array.isArray(parsed) ? parsed : parsed.entries
  if (!Array.isArray(entries)) {
    throw new Error('没有找到可导入的记录列表')
  }
  return entries.map(normalizeEntry)
}

export function mergeEntries(localEntries: Entry[], incomingEntries: Entry[]): Entry[] {
  const byId = new Map<string, Entry>()

  for (const entry of incomingEntries) {
    byId.set(entry.id, normalizeEntry(entry))
  }

  for (const entry of localEntries) {
    const incoming = byId.get(entry.id)
    byId.set(entry.id, normalizeEntry({
      ...incoming,
      ...entry,
      videoBlobRef: entry.videoBlobRef ?? incoming?.videoBlobRef,
    }))
  }

  return Array.from(byId.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

function normalizeEntry(entry: Entry): Entry {
  return {
    ...entry,
    habits: entry.habits ?? [],
    promptAnswers: entry.promptAnswers ?? { state: '', event: '', next: '' },
    tags: entry.tags ?? [],
  }
}

export function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function inferCategory(draft: Pick<EntryDraft, 'promptAnswers' | 'bodyText'>): TrainingTrackName {
  const answers = draft.promptAnswers ?? { state: '', event: '', next: '' }
  const text = [answers.state, answers.event, answers.next, draft.bodyText].join(' ')
  const scores = trainingTracks.map((track) => ({
    name: track.name,
    score: trackKeywords[track.name].reduce((sum, keyword) => {
      const base = text.includes(keyword) ? 1 : 0
      const weighted = track.name === '情绪控制力' && ['情绪', '烦', '焦虑', '控制', '消解'].includes(keyword) ? base + 1 : base
      return sum + weighted
    }, 0),
  }))

  return scores.sort((a, b) => b.score - a.score)[0]?.name ?? '生活觉知力'
}

function inferTags(draft: Pick<EntryDraft, 'promptAnswers' | 'bodyText'>, category: TrainingTrackName) {
  const answers = draft.promptAnswers ?? { state: '', event: '', next: '' }
  const text = [answers.state, answers.event, answers.next, draft.bodyText].join(' ')
  const tags = trainingTracks.find((track) => track.name === category)?.tags.slice(0, 2) ?? []

  if (text.includes('表达') || text.includes('说') || text.includes('开会')) tags.push('口才表达')
  if (text.includes('情绪') || text.includes('烦') || text.includes('焦虑')) tags.push('情绪控制')
  if (text.includes('清楚') || text.includes('脑子') || text.includes('拆')) tags.push('清晰')
  if (text.includes('觉察') || text.includes('意识到')) tags.push('觉察')

  return tags
}

function buildTitle(draft: Pick<EntryDraft, 'bodyText' | 'promptAnswers' | 'type'>) {
  const source = draft.bodyText || draft.promptAnswers?.event || draft.promptAnswers?.state || (draft.type === 'video' ? '一段视频记录' : draft.type === 'audio' ? '一段音频记录' : '一条文字记录')
  return source.replace(/\s+/g, ' ').slice(0, 22)
}

function mergeTags(first: string[], second: string[]) {
  return unique([...first, ...second].map((tag) => tag.trim()).filter(Boolean)).slice(0, 6)
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

const microHabitStorageKey = 'self-recorder.micro-habit-states.v1'

export function loadMicroHabitStates(): Record<string, MicroHabitState> {
  if (typeof localStorage === 'undefined') return {}

  try {
    const raw = localStorage.getItem(microHabitStorageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, MicroHabitState>
    }
    return {}
  } catch {
    return {}
  }
}

export function saveMicroHabitStates(states: Record<string, MicroHabitState>) {
  localStorage.setItem(microHabitStorageKey, JSON.stringify(states))
}

export function upsertMicroHabitState(states: Record<string, MicroHabitState>, state: MicroHabitState): Record<string, MicroHabitState> {
  return {
    ...states,
    [state.dateKey]: {
      ...states[state.dateKey],
      ...state,
      updatedAt: new Date().toISOString(),
    },
  }
}

export function getMicroHabitStatesForRange(
  states: Record<string, MicroHabitState>,
  startDate: Date,
  endDate: Date,
): Array<{ dateKey: string; score: number; habits: MicroHabitName[] }> {
  const startKey = toDateKey(startDate)
  const endKey = toDateKey(endDate)
  const result: Array<{ dateKey: string; score: number; habits: MicroHabitName[] }> = []
  const cursor = new Date(startDate)
  while (cursor <= endDate) {
    const key = toDateKey(cursor)
    const state = states[key]
    result.push({
      dateKey: key,
      score: state?.score ?? 0,
      habits: state?.habits ?? [],
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return result
}

export type GoldenQuote = {
  id: string
  text: string
  createdAt: string
  updatedAt: string
}

const goldenQuoteStorageKey = 'self-recorder.golden-quotes.v1'

export function loadGoldenQuotes(): GoldenQuote[] {
  if (typeof localStorage === 'undefined') return []

  try {
    const raw = localStorage.getItem(goldenQuoteStorageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed as GoldenQuote[]
    }
    return []
  } catch {
    return []
  }
}

export function saveGoldenQuotes(quotes: GoldenQuote[]) {
  localStorage.setItem(goldenQuoteStorageKey, JSON.stringify(quotes))
}

export function createGoldenQuote(text: string): GoldenQuote {
  const now = new Date()
  return {
    id: `quote-${now.getTime()}-${Math.random().toString(16).slice(2, 8)}`,
    text: text.trim(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
}

export function upsertGoldenQuote(quotes: GoldenQuote[], quote: GoldenQuote): GoldenQuote[] {
  const index = quotes.findIndex((q) => q.id === quote.id)
  if (index >= 0) {
    const updated = [...quotes]
    updated[index] = { ...quote, updatedAt: new Date().toISOString() }
    return updated
  }
  return [quote, ...quotes]
}

export function deleteGoldenQuote(quotes: GoldenQuote[], id: string): GoldenQuote[] {
  return quotes.filter((q) => q.id !== id)
}