import { useMemo, useState } from 'react'
import {
  calcMicroHabitScore,
  getMicroHabitStatesForRange,
  getMicroHabitTier,
  microHabitOptions,
  microHabitTierNames,
  toDateKey,
} from './domain'
import type { MicroHabitName, MicroHabitState } from './domain'
import { Icon } from './AppIcons'

type MicroHabitViewProps = {
  states: Record<string, MicroHabitState>
  onSaveState: (state: MicroHabitState) => Promise<void>
}

type TimeRange = 'week' | 'month'

export function MicroHabitView({ states, onSaveState }: MicroHabitViewProps) {
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()))
  const [timeRange, setTimeRange] = useState<TimeRange>('week')
  const [localHabits, setLocalHabits] = useState<MicroHabitName[]>([])

  const currentState = states[selectedDate]
  const effectiveHabits = localHabits.length > 0 ? localHabits : (currentState?.habits ?? [])
  const score = calcMicroHabitScore(effectiveHabits)
  const tier = getMicroHabitTier(score)

  const trend = useMemo(() => {
    const now = new Date()
    const start = new Date(now)
    if (timeRange === 'week') {
      start.setDate(start.getDate() - 6)
    } else {
      start.setDate(start.getDate() - 29)
    }
    return getMicroHabitStatesForRange(states, start, now)
  }, [states, timeRange])

  const weekStats = useMemo(() => {
    const last7 = trend.slice(-7)
    const totalScore = last7.reduce((sum, d) => sum + d.score, 0)
    const daysWithScore = last7.filter((d) => d.score > 0).length
    const avgScore = last7.length > 0 ? (totalScore / last7.length).toFixed(1) : '0'
    const bestDay = last7.reduce((best, d) => (d.score > best.score ? d : best), last7[0] ?? { dateKey: '', score: 0, habits: [] })
    return { totalScore, daysWithScore, avgScore, bestDay, totalDays: last7.length }
  }, [trend])

  const groupedHabits = useMemo(() => {
    const groups: Record<string, typeof microHabitOptions> = {}
    for (const h of microHabitOptions) {
      if (!groups[h.category]) groups[h.category] = []
      groups[h.category].push(h)
    }
    return groups
  }, [])

  async function toggleHabit(habit: MicroHabitName) {
    const newHabits = effectiveHabits.includes(habit)
      ? effectiveHabits.filter((h) => h !== habit)
      : [...effectiveHabits, habit]
    setLocalHabits(newHabits)
    const newState: MicroHabitState = {
      dateKey: selectedDate,
      habits: newHabits,
      score: calcMicroHabitScore(newHabits),
      updatedAt: new Date().toISOString(),
    }
    await onSaveState(newState)
  }

  function shiftDate(offset: number) {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + offset)
    setSelectedDate(toDateKey(date))
    setLocalHabits([])
  }

  const tierBadge = tier ? microHabitTierNames[tier] : null
  const tierClass = tier ? `tier-${tier}` : 'tier-none'

  const maxScore = trend.length > 0 ? Math.max(...trend.map((d) => d.score), 1) : 1

  return (
    <section className="micro-habit-view">
      <header className="section-header">
        <div>
          <h1>微习惯</h1>
          <p>每日 10 项微习惯，每做到一项得 1 分。看见自己的纪律节奏。</p>
        </div>
        <div className="date-nav">
          <button onClick={() => shiftDate(-1)} type="button" aria-label="前一天">
            <Icon name="chevron-left" size={18} />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => { setSelectedDate(e.target.value); setLocalHabits([]) }}
          />
          <button onClick={() => shiftDate(1)} type="button" aria-label="后一天">
            <Icon name="chevron-right" size={18} />
          </button>
        </div>
      </header>

      <div className="micro-habit-layout">
        <div className="score-panel">
          <div className="score-ring">
            <svg viewBox="0 0 120 120" className="score-svg">
              <circle cx="60" cy="60" r="50" className="score-bg" />
              <circle
                cx="60"
                cy="60"
                r="50"
                className="score-fg"
                strokeDasharray={`${(score / 10) * 314} 314`}
              />
            </svg>
            <div className="score-text">
              <span className="score-value">{score}</span>
              <span className="score-total">/ 10</span>
            </div>
          </div>

          {tierBadge && (
            <div className={`tier-badge ${tierClass}`}>
              <strong>{tierBadge}</strong>
              <span>今日档位</span>
            </div>
          )}

          <div className="score-tier-legend">
            <div className="tier-item tier-none">0–2 散乱</div>
            <div className="tier-item tier-TIER_3">3–4 破局</div>
            <div className="tier-item tier-TIER_5">5–7 自持</div>
            <div className="tier-item tier-TIER_8">8–10 清净</div>
          </div>

          <div className="week-summary">
            <h4>近 7 天</h4>
            <div className="week-stats">
              <div className="week-stat">
                <strong>{weekStats.avgScore}</strong>
                <span>日均分</span>
              </div>
              <div className="week-stat">
                <strong>{weekStats.totalScore}</strong>
                <span>累计分</span>
              </div>
              <div className="week-stat">
                <strong>{weekStats.daysWithScore}/{weekStats.totalDays}</strong>
                <span>达标天</span>
              </div>
            </div>
          </div>
        </div>

        <div className="habits-panel">
          {Object.entries(groupedHabits).map(([category, habits]) => (
            <div key={category} className="habit-group">
              <h3 className="habit-group-title">{category}</h3>
              <div className="habit-grid">
                {habits.map((habit) => {
                  const checked = effectiveHabits.includes(habit.name)
                  return (
                    <button
                      key={habit.name}
                      className={`habit-tile ${checked ? 'checked' : ''}`}
                      onClick={() => toggleHabit(habit.name)}
                      type="button"
                    >
                      <span className="habit-tile-icon">{habit.icon}</span>
                      <span className="habit-tile-name">{habit.name}</span>
                      {checked && (
                        <span className="habit-tile-check">
                          <Icon name="check" size={14} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="trend-panel">
        <div className="trend-header">
          <h3>趋势</h3>
          <div className="trend-range-switch">
            <button className={timeRange === 'week' ? 'active' : ''} onClick={() => setTimeRange('week')} type="button">近 7 天</button>
            <button className={timeRange === 'month' ? 'active' : ''} onClick={() => setTimeRange('month')} type="button">近 30 天</button>
          </div>
        </div>
        <div className="trend-chart">
          <div className="trend-y-axis">
            {[10, 8, 6, 4, 2].map((v) => (
              <span key={v}>{v}</span>
            ))}
          </div>
          <div className="trend-bars">
            {trend.map((day) => {
              const heightPct = maxScore > 0 ? (day.score / 10) * 100 : 0
              const dayTier = getMicroHabitTier(day.score)
              const barClass = dayTier ? `bar-${dayTier}` : 'bar-none'
              const dateObj = new Date(day.dateKey)
              const label = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
              return (
                <div
                  key={day.dateKey}
                  className="trend-bar-wrapper"
                  title={`${day.dateKey}: ${day.score} 分`}
                >
                  <div className={`trend-bar ${barClass}`} style={{ height: `${heightPct}%` }} />
                  <span className="trend-bar-label">{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
