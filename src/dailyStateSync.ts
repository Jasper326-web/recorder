import type { AbstinenceStatus, DailyState, HabitName } from './domain'
import { supabase } from './supabaseClient'

type DailyStateRow = {
  id: string
  user_id: string
  date_key: string
  abstinence_status: AbstinenceStatus | null
  habits: HabitName[]
  updated_at: string
}

export async function fetchCloudDailyStates(): Promise<Record<string, DailyState>> {
  if (!supabase) throw new Error('还没有配置 Supabase 环境变量。')

  const { data, error } = await supabase
    .from('daily_states')
    .select('*')
    .order('date_key', { ascending: false })

  if (error) throw error

  const result: Record<string, DailyState> = {}
  for (const row of (data ?? []) as DailyStateRow[]) {
    result[row.date_key] = {
      dateKey: row.date_key,
      abstinenceStatus: row.abstinence_status ?? undefined,
      habits: row.habits ?? [],
      updatedAt: row.updated_at,
    }
  }
  return result
}

export async function upsertCloudDailyState(state: DailyState, userId: string) {
  if (!supabase) throw new Error('还没有配置 Supabase 环境变量。')

  const row: DailyStateRow = {
    id: `daily-${state.dateKey}`,
    user_id: userId,
    date_key: state.dateKey,
    abstinence_status: state.abstinenceStatus ?? null,
    habits: state.habits,
    updated_at: state.updatedAt,
  }

  const { error } = await supabase
    .from('daily_states')
    .upsert(row, { onConflict: 'id' })

  if (error) throw error
}
