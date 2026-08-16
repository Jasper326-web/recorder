import type { DailyState, DesireIntensity, DesireRecord, Entry, EntryType, HabitName, PromptAnswers, TrainingTrackName } from './domain'
import { supabase } from './supabaseClient'

const mediaBucket = 'entry-media'
const legacyVideoBucket = 'entry-videos'

type EntryRow = {
  id: string
  user_id: string
  created_at: string
  type: EntryType
  prompt_answers: PromptAnswers
  body_text: string
  video_blob_ref: string | null
  title: string
  category: TrainingTrackName
  tags: string[]
  ai_summary: string
  ai_reflection: string
}

export async function fetchCloudEntries(): Promise<Entry[]> {
  if (!supabase) throw new Error('还没有配置 Supabase 环境变量。')

  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(rowToEntry)
}

export async function upsertCloudEntries(entries: Entry[], userId: string) {
  if (!supabase) throw new Error('还没有配置 Supabase 环境变量。')
  if (entries.length === 0) return

  const { error } = await supabase.from('entries').upsert(
    entries.map((entry) => entryToRow(entry, userId)),
    { onConflict: 'id' },
  )

  if (error) throw error
}

export async function upsertCloudEntry(entry: Entry, userId: string) {
  await upsertCloudEntries([entry], userId)
}

export async function uploadMediaBlob(entryId: string, userId: string, blob: Blob, type: Exclude<EntryType, 'text'>) {
  if (!supabase) throw new Error('还没有配置 Supabase 环境变量。')

  const extension = getMediaExtension(blob.type, type)
  const path = `${userId}/${entryId}.${extension}`
  const { error } = await supabase.storage.from(mediaBucket).upload(path, blob, {
    cacheControl: '3600',
    contentType: blob.type || (type === 'audio' ? 'audio/webm' : 'video/webm'),
    upsert: true,
  })

  if (error) throw error

  return path
}

export async function getCloudMediaUrl(path: string, type: EntryType) {
  if (!supabase) return ''

  const { data, error } = await supabase.storage.from(mediaBucket).createSignedUrl(path, 60 * 60)
  if (!error) return data.signedUrl

  if (type === 'video') {
    const legacy = await supabase.storage.from(legacyVideoBucket).createSignedUrl(path, 60 * 60)
    if (!legacy.error) return legacy.data.signedUrl
  }

  return ''
}

function getMediaExtension(mimeType: string, type: Exclude<EntryType, 'text'>) {
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('quicktime')) return 'mov'
  if (mimeType.includes('mpeg')) return 'mp3'
  if (mimeType.includes('wav')) return 'wav'
  if (mimeType.includes('aac')) return 'aac'
  if (mimeType.includes('ogg')) return 'ogg'
  return type === 'audio' ? 'webm' : 'webm'
}

function entryToRow(entry: Entry, userId: string): EntryRow {
  return {
    id: entry.id,
    user_id: userId,
    created_at: entry.createdAt,
    type: entry.type,
    prompt_answers: entry.promptAnswers,
    body_text: entry.bodyText,
    video_blob_ref: entry.videoBlobRef ?? null,
    title: entry.title,
    category: entry.category,
    tags: entry.tags,
    ai_summary: entry.aiSummary,
    ai_reflection: entry.aiReflection,
  }
}

function rowToEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    createdAt: row.created_at,
    type: row.type,
    habits: [],
    promptAnswers: row.prompt_answers,
    bodyText: row.body_text,
    videoBlobRef: row.video_blob_ref ?? undefined,
    title: row.title,
    category: row.category,
    tags: row.tags ?? [],
    aiSummary: row.ai_summary,
    aiReflection: row.ai_reflection,
  }
}

type DesireRecordRow = {
  id: string
  user_id: string
  date_key: string
  created_at: string
  trigger: string
  intensity: DesireIntensity
  coping_strategy: string
  successful: boolean
  insight: string
  updated_at: string
}

export async function fetchCloudDesireRecords(): Promise<DesireRecord[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('desire_records')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    if (error.message.includes('does not exist')) return []
    throw error
  }

  return (data ?? []).map(rowToDesireRecord)
}

export async function upsertCloudDesireRecord(record: DesireRecord, userId: string) {
  if (!supabase) throw new Error('还没有配置 Supabase 环境变量。')

  const row: DesireRecordRow = {
    id: record.id,
    user_id: userId,
    date_key: record.dateKey,
    created_at: record.createdAt,
    trigger: record.trigger,
    intensity: record.intensity,
    coping_strategy: record.copingStrategy,
    successful: record.successful,
    insight: record.insight,
    updated_at: record.updatedAt,
  }

  const { error } = await supabase
    .from('desire_records')
    .upsert(row, { onConflict: 'id' })

  if (error) throw error
}

export async function deleteCloudDesireRecord(id: string) {
  if (!supabase) throw new Error('还没有配置 Supabase 环境变量。')

  const { error } = await supabase
    .from('desire_records')
    .delete()
    .eq('id', id)

  if (error) throw error
}

function rowToDesireRecord(row: DesireRecordRow): DesireRecord {
  return {
    id: row.id,
    dateKey: row.date_key,
    createdAt: row.created_at,
    trigger: row.trigger,
    intensity: row.intensity,
    copingStrategy: row.coping_strategy,
    successful: row.successful,
    insight: row.insight ?? '',
    updatedAt: row.updated_at,
  }
}

type DailyStateRow = {
  date_key: string
  user_id: string
  habits: HabitName[]
  updated_at: string
}

export async function fetchCloudDailyStates(): Promise<Record<string, DailyState>> {
  if (!supabase) return {}

  const { data, error } = await supabase
    .from('daily_states')
    .select('*')

  if (error) {
    if (error.message.includes('does not exist')) return {}
    throw error
  }

  const result: Record<string, DailyState> = {}
  for (const row of (data ?? []) as DailyStateRow[]) {
    result[row.date_key] = {
      dateKey: row.date_key,
      habits: row.habits ?? [],
      updatedAt: row.updated_at,
    }
  }
  return result
}

export async function upsertCloudDailyState(state: DailyState, userId: string) {
  if (!supabase) throw new Error('还没有配置 Supabase 环境变量。')

  const row: DailyStateRow = {
    date_key: state.dateKey,
    user_id: userId,
    habits: state.habits,
    updated_at: state.updatedAt,
  }

  const { error } = await supabase
    .from('daily_states')
    .upsert(row, { onConflict: 'date_key,user_id' })

  if (error) throw error
}