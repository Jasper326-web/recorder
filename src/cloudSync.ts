import type { Entry, EntryType, PromptAnswers, TrainingTrackName } from './domain'
import { supabase } from './supabaseClient'

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
