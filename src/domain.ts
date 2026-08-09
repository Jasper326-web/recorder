export type EntryType = 'text' | 'video' | 'audio'

export type AbstinenceStatus =
  | '清心寡欲'
  | '起心动念'
  | '心神不宁'
  | '欲望冲脑'
  | '千钧一发'
  | '极度危急'

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
  abstinenceStatus: AbstinenceStatus
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
  abstinenceStatus?: AbstinenceStatus
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
  abstinenceStatus?: AbstinenceStatus
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

export type InterventionContent = {
  name: AbstinenceStatus
  level: number
  color: string
  background: string
  stageTitle: string
  stageSubtitle: string
  coreStrategy: string
  buddhaChant: string
  buddhaName: string
  buddhaMeaning: string
  tcmAdvice: string[]
  warningQuotes: string[]
  actionSteps: string[]
  uiLevel: 'calm' | 'warning' | 'critical' | 'emergency'
}

export const abstinenceStatuses: InterventionContent[] = [
  {
    name: '清心寡欲',
    level: 0,
    color: '#1b8a4a',
    background: '#d9f2e2',
    stageTitle: '清心寡欲',
    stageSubtitle: '心如止水，正念满满',
    coreStrategy: '保持清净心，继续日常修行与觉察。',
    buddhaChant: '南无阿弥陀佛',
    buddhaName: '阿弥陀佛',
    buddhaMeaning: '无量寿、无量光，普照十方，接引往生。',
    tcmAdvice: [
      '此刻身心安定，气血调和，正是养护正气的好时机。',
      '建议做一段呼吸冥想或轻量运动，巩固这份清净状态。',
    ],
    warningQuotes: [
      '「道高一尺，魔高一丈。」守住清净心就是最大的修行。',
      '「不积跬步，无以至千里。」每一次的坚持都在积累福报。',
    ],
    actionSteps: [
      '继续当前的正念状态，可以记录今天的好习惯或心得体会。',
      '将这份安定分享给身边需要的人，让善意流动起来。',
    ],
    uiLevel: 'calm',
  },
  {
    name: '起心动念',
    level: 1,
    color: '#4a9a2b',
    background: '#e3f4d0',
    stageTitle: '起心动念',
    stageSubtitle: '微风起于青萍之末，趁火苗未大一念斩断',
    coreStrategy: '清净心观、转念切断。念头即是火种，不续薪则火自灭。',
    buddhaChant: '南无观世音菩萨',
    buddhaName: '观世音菩萨',
    buddhaMeaning: '《妙法莲华经·普门品》云：「若有多欲之人，常念恭敬观世音菩萨，便得离欲。」',
    tcmAdvice: [
      '心火初动，肾水未伤。此时闭眼深呼吸三次，将心气沉入丹田，心火自然降下。',
      '按揉手心劳宫穴 30 秒，帮助平复心火。',
    ],
    warningQuotes: [
      '「念头即是火种，不续薪则火自灭。转念只在一瞬间！」',
      '「念起即觉，觉之即无。」不需对抗，只需觉察，它便失去力量。',
    ],
    actionSteps: [
      '在心中默念「南无观世音菩萨」10 遍，将注意力完全集中在佛号的声音或字形上。',
      '立刻起身走几步，喝一杯温水，让身体的能量流动起来。',
      '可以在心中发愿：「愿我以此一念清净心，回向给一切众生。」',
    ],
    uiLevel: 'calm',
  },
  {
    name: '心神不宁',
    level: 2,
    color: '#c9a227',
    background: '#fef3c7',
    stageTitle: '心神不宁',
    stageSubtitle: '欲望被勾起，开始心慌、躁动',
    coreStrategy: '降伏心火、强力阻断。心动则百脉沸腾，千万不要伸手！',
    buddhaChant: '南无阿弥陀佛',
    buddhaName: '阿弥陀佛',
    buddhaMeaning: '以一声佛号替换邪念，佛光普照，邪念自消。',
    tcmAdvice: [
      '「心动则百脉沸腾。」你现在的烦躁，是心火独亢、水火不济的表现。',
      '立刻放下手机，去洗手间用冷水洗脸、洗手腕，刺激神经，强行降温。',
      '按揉脚心涌泉穴 1 分钟，引火归元。',
    ],
    warningQuotes: [
      '「顺之则为凡，逆之则为圣。」',
      '「千万不要伸手！手一动，精气就开始暗耗了。」',
      '「念起即觉，觉之即无。」不要和欲望对抗，只需觉察到它。',
    ],
    actionSteps: [
      '立刻起身，离开当前环境，到户外或阳台走 2 分钟。',
      '用冷水洗脸和手腕 30 秒，让身体从"战斗模式"中冷静下来。',
      '大声或默念「南无阿弥陀佛」20 遍。',
      '做 10 次深呼吸，吸气 4 秒，呼气 8 秒。',
    ],
    uiLevel: 'warning',
  },
  {
    name: '欲望冲脑',
    level: 3,
    color: '#d97706',
    background: '#fee0b2',
    stageTitle: '欲望冲脑',
    stageSubtitle: '理智边缘，开始找借口"就看一眼"',
    coreStrategy: '因果警示、强力对治。不净观+后果震撼，断除执着。',
    buddhaChant: '南无大势至菩萨',
    buddhaName: '大势至菩萨',
    buddhaMeaning: '大势至菩萨以智慧光普及一切，能给人无上威神力阻断魔障。',
    tcmAdvice: [
      '「肾为先天之本，藏精主骨生髓！你现在每一次冲动，都在暗中抽取你的骨髓与脑髓！」',
      '想想破戒后的空虚、自卑、眼神浑浊、脑雾和脱发！你真的要把未来的尊严奉献给这几秒的快感吗？',
    ],
    warningQuotes: [
      '「红颜白骨，转瞬即逝。」观想屏幕里的虚幻影像，不过是一具包裹着脓血、粪便、骨骼和腥臭体液的皮囊。',
      '「短暂快感换长期痛苦，这笔账永远算不清。」',
      '「你当下的每一次坚持，都是在为未来的自己积累福报与正气。」',
    ],
    actionSteps: [
      '大声念「南无大势至菩萨」10 遍，每一字都从胸腔发出。',
      '立刻站起来，做 20 个深蹲，让血液离开下半身。',
      '用冷水冲手腕 1 分钟，刺激桡动脉降压。',
      '强迫自己直视前方某个固定点 30 秒，切断神经回路。',
      '如果仍难抵抗，立刻拨打一个你信任的朋友或家人的电话。',
    ],
    uiLevel: 'critical',
  },
  {
    name: '千钧一发',
    level: 4,
    color: '#dc2626',
    background: '#fecaca',
    stageTitle: '千钧一发',
    stageSubtitle: '手已放在敏感部位，濒临失控',
    coreStrategy: '身体物理断连、痛点强刺激、极其短促的警示。',
    buddhaChant: '南无药师琉璃光如来',
    buddhaName: '药师琉璃光如来',
    buddhaMeaning: '药师佛十二大愿，专门拯救身心痛苦、贪嗔痴炽盛的众生，具强大回复元气与清净的力量。',
    tcmAdvice: [
      '「当机立断，一秒即是天堂地狱之分！」',
      '「做 30 个深蹲！让血液离开下半身！现在！立刻！」',
      '「用拇指按压另一只手的虎口合谷穴，用力按到有酸胀感，保持 60 秒！」',
    ],
    warningQuotes: [
      '⚠️ 【立刻站起来！！离开这张椅子！！】',
      '「这绝不是享受，这是在服毒饮鸩！想想医院走廊里的痛苦，想想你未竟的人生！」',
      '「你的人生价值，远不止这几秒的多巴胺刺激！」',
      '「胜利就在这最后的几秒钟！放弃就是前功尽弃！」',
    ],
    actionSteps: [
      '【紧急 1】立刻站起来！！双脚站立，不要坐着！',
      '【紧急 2】做 30 个深蹲，越快越好，让血液立刻回流到上半身！',
      '【紧急 3】用最大声音念「南无药师琉璃光如来」10 遍！',
      '【紧急 4】用冷水浇头和脖子 30 秒！',
      '【紧急 5】如果仍无法抵抗，立刻冲向户外，奔跑 5 分钟！',
    ],
    uiLevel: 'emergency',
  },
  {
    name: '极度危急',
    level: 5,
    color: '#991b1b',
    background: '#ef4444',
    stageTitle: '极度危急',
    stageSubtitle: '理智接近 0%，处于破罐子破摔的边缘',
    coreStrategy: '终极唤醒、慈悲救拔、唤醒最深层的良知。',
    buddhaChant: '南无地藏王菩萨',
    buddhaName: '地藏王菩萨',
    buddhaMeaning: '地藏菩萨愿力宏深，专救处于绝境、地狱边缘之众生。「地狱不空，誓不成佛！」',
    tcmAdvice: [
      '「万恶淫为首，百善孝为先。」想想父母对你的期望，想想你曾经立下的宏愿！',
      '「你今天的每一次坚持，都是在为未来的自己积累无上的福报与正气。」',
      '「停下！哪怕只是躺在地上喘气，也绝对不要动手！胜利就在这最后的几秒钟！」',
    ],
    warningQuotes: [
      '「菩萨保佑，赐我清净定力！拔除我心中的毒刺！」',
      '「慈悲的佛光一直在照耀你，不要抛弃你自己！只要你现在停下，你就赢了这场最艰难的战役！」',
      '「想想你的理想、你的责任、你的家人——你怎么能让这一切毁于一旦？」',
      '「现在停下，你就是英雄！现在放弃，之前所有的坚持都将化为乌有！」',
      '「停下！停下！停下！佛光照进你的心中，邪魔退散！」',
    ],
    actionSteps: [
      '【终极 1】立刻倒地或躺下，四肢摊开，让身体完全放松！',
      '【终极 2】用全身力气大喊「南无地藏王菩萨」！连续喊 20 遍！',
      '【终极 3】闭眼观想：金色佛光从头顶灌入，净化你的全身，一切贪欲化为清净！',
      '【终极 4】如果还有一丝力气，用拇指死死掐住另一只手的内关穴（手腕横纹上 2 寸）！',
      '【终极 5】发愿：「弟子愿以今日之坚持，回向给一切正在受苦的众生，愿他们都能离苦得乐！」',
    ],
    uiLevel: 'emergency',
  },
]

const trackKeywords: Record<TrainingTrackName, string[]> = {
  情绪控制力: ['烦', '焦虑', '生气', '崩', '情绪', '难受', '委屈', '压力', '控制', '消解'],
  生活觉知力: ['觉察', '生活', '身体', '散步', '睡', '吃', '关系', '感受', '意识到', '细节', '安静', '整理', '房间', '日常'],
  口才表达能力: ['说', '表达', '沟通', '复述', '开会', '打断', '演讲', '录', '口才', '需求'],
  头脑清晰度: ['清楚', '清晰', '混乱', '脑子', '拆', '决定', '选择', '计划', '下一步', '思路'],
}

const entryStorageKey = 'self-recorder.entries.v1'
const defaultAbstinenceStatus: AbstinenceStatus = '清心寡欲'

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
    abstinenceStatus: draft.abstinenceStatus ?? defaultAbstinenceStatus,
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
  const statusMeta = getAbstinenceStatusMeta(entry.abstinenceStatus)

  return {
    category,
    tags,
    summary: `你记录到：${entry.promptAnswers.event || entry.bodyText || (entry.type === 'audio' ? '一段音频记录' : '此刻有一些值得被看见的东西')}。当前状态处于「${entry.abstinenceStatus}」，属第 ${statusMeta.level} 阶段，这条记录主要在训练「${category}」。`,
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
    const abstinenceStatus = getWorstAbstinenceStatus(dayEntries)

    return {
      dateKey,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      count: dayEntries.length,
      types: unique(dayEntries.map((entry) => entry.type)),
      categories: unique(dayEntries.map((entry) => entry.category)),
      abstinenceStatus,
    }
  })
}

export function filterEntries(entries: Entry[], filter: EntryFilter): Entry[] {
  const query = filter.query?.trim().toLowerCase()

  return entries.filter((entry) => {
    const matchesType = !filter.type || filter.type === 'all' || entry.type === filter.type
    const matchesCategory = !filter.category || filter.category === 'all' || entry.category === filter.category
    const searchable = [entry.title, entry.bodyText, entry.abstinenceStatus, entry.promptAnswers.state, entry.promptAnswers.event, entry.promptAnswers.next, ...entry.tags]
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

export function getAbstinenceStatusMeta(status: AbstinenceStatus): InterventionContent {
  return abstinenceStatuses.find((item) => item.name === status) ?? abstinenceStatuses[0]
}

function getWorstAbstinenceStatus(entries: Entry[]): AbstinenceStatus | undefined {
  if (entries.length === 0) return undefined
  return entries
    .map((entry) => normalizeAbstinenceStatus(entry.abstinenceStatus))
    .sort((first, second) => getAbstinenceStatusMeta(second).level - getAbstinenceStatusMeta(first).level)[0]
}

function normalizeEntry(entry: Entry): Entry {
  return {
    ...entry,
    abstinenceStatus: normalizeAbstinenceStatus(entry.abstinenceStatus),
    promptAnswers: entry.promptAnswers ?? { state: '', event: '', next: '' },
    tags: entry.tags ?? [],
  }
}

function normalizeAbstinenceStatus(status?: string): AbstinenceStatus {
  return abstinenceStatuses.some((item) => item.name === status)
    ? (status as AbstinenceStatus)
    : defaultAbstinenceStatus
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