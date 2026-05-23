export type EntryType = 'text' | 'video' | 'audio'

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
    summary: `你记录到：${entry.promptAnswers.event || entry.bodyText || (entry.type === 'audio' ? '一段音频记录' : '此刻有一些值得被看见的东西')}。这条记录主要在训练「${category}」。`,
    reflection: `心灵小蜜在这里。你已经把模糊的感受放到了明处，这本身就在增加掌控感。接下来可以很小地做一步：${nextAction}。`,
  }
}

export function buildCalendarDays(entries: Entry[], anchorDate = new Date()): CalendarDay[] {
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

    return {
      dateKey,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      count: dayEntries.length,
      types: unique(dayEntries.map((entry) => entry.type)),
      categories: unique(dayEntries.map((entry) => entry.category)),
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
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveEntries(entries: Entry[]) {
  localStorage.setItem(entryStorageKey, JSON.stringify(entries))
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
  return entries
}

export function mergeEntries(localEntries: Entry[], incomingEntries: Entry[]): Entry[] {
  const byId = new Map<string, Entry>()

  for (const entry of incomingEntries) {
    byId.set(entry.id, entry)
  }

  for (const entry of localEntries) {
    const incoming = byId.get(entry.id)
    byId.set(entry.id, {
      ...incoming,
      ...entry,
      videoBlobRef: entry.videoBlobRef ?? incoming?.videoBlobRef,
    })
  }

  return Array.from(byId.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
