import { useMemo, useState } from 'react'
import { getHabitStats, habitOptions } from './domain'
import type { DailyState, HabitName } from './domain'
import { Icon } from './AppIcons'

type RangeKey = '30' | '60' | '90'

export function HabitStatsView({ dailyStates }: { dailyStates: Record<string, DailyState> }) {
  const [range, setRange] = useState<RangeKey>('30')
  const daysBack = Number(range)

  const habitStats = useMemo(
    () => habitOptions.map((h) => ({ ...h, stats: getHabitStats(dailyStates, h.name as HabitName, daysBack) })),
    [dailyStates, daysBack],
  )

  return (
    <section className="habit-stats-view">
      <header className="section-header">
        <div>
          <h1>习惯追踪</h1>
          <p>每一项习惯的完成趋势和坚持天数。</p>
        </div>
        <div className="range-switch">
          {(['30', '60', '90'] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={`range-btn ${range === r ? 'active' : ''}`}
              onClick={() => setRange(r)}
            >
              近 {r} 天
            </button>
          ))}
        </div>
      </header>

      <div className="habit-stats-grid">
        {habitStats.map(({ name, icon, color, stats }) => (
          <div key={name} className="habit-stats-card" style={{ '--habit-color': color } as React.CSSProperties}>
            <div className="habit-stats-header">
              <span className="habit-stats-icon">{icon}</span>
              <h3>{name}</h3>
            </div>

            <div className="habit-streak-row">
              <div className="streak-badge current">
                <span className="streak-number">{stats.currentStreak}</span>
                <span className="streak-label">当前连续</span>
              </div>
              <div className="streak-badge best">
                <span className="streak-number">{stats.bestStreak}</span>
                <span className="streak-label">最佳连续</span>
              </div>
              <div className="streak-badge total">
                <span className="streak-number">{stats.totalDays}</span>
                <span className="streak-label">总完成</span>
              </div>
            </div>

            <div className="habit-chart">
              <LineChart data={stats.recentDays} color={color} />
            </div>

            <div className="habit-milestones">
              {stats.milestones.map((m) => (
                <div
                  key={m.days}
                  className={`milestone ${m.achieved ? 'achieved' : ''}`}
                  title={m.achieved ? `已达成 ${m.label}` : `${m.label}: ${m.days} 天`}
                >
                  <div className="milestone-icon">
                    {m.achieved ? <Icon name="sparkles" size={12} /> : <span className="milestone-dot" />}
                  </div>
                  <span className="milestone-days">{m.days}</span>
                  <span className="milestone-label">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function LineChart({ data, color }: { data: Array<{ dateKey: string; done: boolean }>; color: string }) {
  if (data.length === 0) return null

  const W = 300
  const H = 60
  const padX = 4
  const padY = 4
  const stepX = data.length > 1 ? (W - padX * 2) / (data.length - 1) : 0
  const barWidth = Math.max(2, Math.min(12, stepX * 0.6))

  // Build path for "line" connecting the tops of bars
  const points: Array<{ x: number; y: number; done: boolean }> = []
  data.forEach((d, i) => {
    const x = padX + i * stepX
    const y = padY + (d.done ? 0 : H - padY * 2)
    points.push({ x, y, done: d.done })
  })

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
      {/* Baseline */}
      <line x1={0} y1={H - padY} x2={W} y2={H - padY} stroke="rgba(0,0,0,0.08)" strokeWidth={1} />
      {/* Line path */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
      {/* Bars + points */}
      {points.map((p, i) => (
        <g key={i}>
          <rect
            x={p.x - barWidth / 2}
            y={p.done ? padY : H - padY - 2}
            width={barWidth}
            height={p.done ? H - padY * 2 : 2}
            fill={p.done ? color : 'rgba(0,0,0,0.06)'}
            opacity={p.done ? 0.7 : 1}
            rx={1}
          />
          {p.done && (
            <circle cx={p.x} cy={p.y} r={2.5} fill={color} />
          )}
        </g>
      ))}
    </svg>
  )
}
