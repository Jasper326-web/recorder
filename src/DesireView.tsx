import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  createDesireRecord,
  desireCopingPresets,
  desireTriggerPresets,
  getDesireRecordsForDate,
  getDesireStats,
  toDateKey,
} from './domain'
import type { DesireIntensity, DesireRecord } from './domain'
import { Icon } from './AppIcons'

type DesireViewProps = {
  desireRecords: DesireRecord[]
  onAddRecord: (record: DesireRecord) => void
  onDeleteRecord: (id: string) => void
}

type TimeRange = 'week' | 'month' | 'all'

export function DesireView({ desireRecords, onAddRecord, onDeleteRecord }: DesireViewProps) {
  const [showForm, setShowForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()))
  const [timeRange, setTimeRange] = useState<TimeRange>('week')

  const stats = useMemo(() => {
    const now = new Date()
    let startDate: Date
    switch (timeRange) {
      case 'week':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 6)
        break
      case 'month':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 29)
        break
      default:
        startDate = new Date(0)
        break
    }
    return getDesireStats(desireRecords, startDate, now)
  }, [desireRecords, timeRange])

  const dayRecords = useMemo(
    () => getDesireRecordsForDate(desireRecords, selectedDate),
    [desireRecords, selectedDate],
  )

  const recentDays = useMemo(() => {
    const result: { dateKey: string; records: DesireRecord[] }[] = []
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const dk = toDateKey(date)
      const records = desireRecords.filter((r) => r.dateKey === dk)
      if (records.length > 0) {
        result.push({ dateKey: dk, records })
      }
    }
    return result
  }, [desireRecords])

  return (
    <section className="desire-view">
      <header className="section-header">
        <div>
          <h1>邪念管理</h1>
          <p>精细追踪每一次欲望波动，积累成功应对的经验。</p>
        </div>
        <button
          className="primary-action desire-add-btn"
          onClick={() => setShowForm(true)}
          type="button"
        >
          <Icon name="plus" size={19} />
          新增邪念记录
        </button>
      </header>

      <div className="desire-layout">
        <div className="desire-main">
          {showForm && (
            <DesireForm
              onSubmit={(record) => {
                onAddRecord(record)
                setShowForm(false)
              }}
              onCancel={() => setShowForm(false)}
              selectedDate={selectedDate}
            />
          )}

          <div className="desire-stats-row">
            <div className="stat-card">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">总次数</span>
            </div>
            <div className="stat-card success">
              <span className="stat-value">{stats.successRate}%</span>
              <span className="stat-label">成功率</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.avgIntensity}</span>
              <span className="stat-label">平均强度</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.successCount}</span>
              <span className="stat-label">成功次数</span>
            </div>
          </div>

          <div className="desire-day-header">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="desire-date-input"
            />
            <span className="desire-day-count">
              今日 {dayRecords.length} 次邪念
            </span>
          </div>

          {dayRecords.length === 0 ? (
            <div className="desire-empty">
              <Icon name="flame" size={28} />
              <p>这一天还没有邪念记录。保持警觉，随时记录。</p>
            </div>
          ) : (
            <div className="desire-list">
              {dayRecords.map((record) => (
                <DesireCard
                  key={record.id}
                  record={record}
                  onDelete={() => onDeleteRecord(record.id)}
                />
              ))}
            </div>
          )}

          {recentDays.length > 0 && (
            <div className="desire-recent">
              <h3>最近 7 天记录</h3>
              <div className="desire-recent-timeline">
                {recentDays.map((day) => (
                  <div key={day.dateKey} className="desire-recent-day">
                    <span className="recent-date">{day.dateKey.slice(5)}</span>
                    <div className="recent-records">
                      {day.records.map((record) => (
                        <div
                          key={record.id}
                          className={`recent-record-dot intensity-${record.intensity} ${record.successful ? 'success' : 'failure'}`}
                          title={`${record.trigger} · ${record.copingStrategy} · ${record.successful ? '成功' : '失守'}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="desire-sidebar">
          <div className="desire-stats-header">
            <h2>统计</h2>
            <div className="time-range-tabs">
              {(['week', 'month', 'all'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  className={timeRange === range ? 'active' : ''}
                  onClick={() => setTimeRange(range)}
                  type="button"
                >
                  {range === 'week' ? '周' : range === 'month' ? '月' : '全部'}
                </button>
              ))}
            </div>
          </div>

          {stats.topTriggers.length > 0 && (
            <div className="desire-stat-section">
              <h3>常见诱因</h3>
              <div className="stat-list">
                {stats.topTriggers.map(([trigger, count]) => (
                  <div key={trigger} className="stat-bar-row">
                    <span className="stat-bar-label">{trigger}</span>
                    <div className="stat-bar-track">
                      <div
                        className="stat-bar-fill"
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      />
                    </div>
                    <span className="stat-bar-value">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.topCopingStrategies.length > 0 && (
            <div className="desire-stat-section">
              <h3>最有效应对</h3>
              <div className="coping-list">
                {stats.topCopingStrategies.map((item) => (
                  <div key={item.strategy} className="coping-item">
                    <span className="coping-name">{item.strategy}</span>
                    <div className="coping-bar-track">
                      <div
                        className="coping-bar-fill"
                        style={{ width: `${item.successRate}%` }}
                      />
                    </div>
                    <span className="coping-rate">{item.successRate}%</span>
                    <span className="coping-count">({item.successCount}/{item.total})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function DesireForm({
  onSubmit,
  onCancel,
  selectedDate,
}: {
  onSubmit: (record: DesireRecord) => void
  onCancel: () => void
  selectedDate: string
}) {
  const [trigger, setTrigger] = useState(desireTriggerPresets[0])
  const [customTrigger, setCustomTrigger] = useState('')
  const [intensity, setIntensity] = useState<DesireIntensity>(3)
  const [copingStrategy, setCopingStrategy] = useState(desireCopingPresets[0])
  const [customCoping, setCustomCoping] = useState('')
  const [successful, setSuccessful] = useState(true)
  const [insight, setInsight] = useState('')
  const [showCustomTrigger, setShowCustomTrigger] = useState(false)
  const [showCustomCoping, setShowCustomCoping] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    setIsSubmitting(true)
    const finalTrigger = showCustomTrigger ? customTrigger.trim() : trigger
    const finalCoping = showCustomCoping ? customCoping.trim() : copingStrategy

    if (!finalTrigger || !finalCoping) {
      setIsSubmitting(false)
      return
    }

    const recordDate = new Date(selectedDate + 'T' + new Date().toTimeString().split(' ')[0])
    const record = createDesireRecord({
      trigger: finalTrigger,
      intensity,
      copingStrategy: finalCoping,
      successful,
      insight: insight.trim(),
      createdAt: recordDate,
    })

    onSubmit(record)
  }

  const intensityLabels: Record<DesireIntensity, string> = {
    1: '微',
    2: '轻',
    3: '中',
    4: '强',
    5: '烈',
  }

  return (
    <div className="desire-form-overlay">
      <div className="desire-form">
        <div className="desire-form-header">
          <h2>记录邪念</h2>
          <button className="desire-form-close" onClick={onCancel} type="button" aria-label="关闭">
            <Icon name="square" size={16} />
          </button>
        </div>

        <div className="form-section">
          <label className="form-label">诱因</label>
          {!showCustomTrigger ? (
            <div className="preset-chips">
              {desireTriggerPresets.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`preset-chip ${trigger === t ? 'active' : ''}`}
                  onClick={() => setTrigger(t)}
                >
                  {t}
                </button>
              ))}
              <button
                type="button"
                className="preset-chip custom"
                onClick={() => setShowCustomTrigger(true)}
              >
                + 自定义
              </button>
            </div>
          ) : (
            <div className="custom-input-row">
              <input
                type="text"
                value={customTrigger}
                onChange={(e) => setCustomTrigger(e.target.value)}
                placeholder="描述你的诱因"
                className="custom-input"
              />
              <button
                type="button"
                className="preset-chip"
                onClick={() => setShowCustomTrigger(false)}
              >
                选择预设
              </button>
            </div>
          )}
        </div>

        <div className="form-section">
          <label className="form-label">欲望强度</label>
          <div className="intensity-picker">
            {([1, 2, 3, 4, 5] as DesireIntensity[]).map((level) => (
              <button
                key={level}
                type="button"
                className={`intensity-btn intensity-${level} ${intensity === level ? 'active' : ''}`}
                onClick={() => setIntensity(level)}
                style={{ '--intensity-level': level } as CSSProperties}
              >
                <span className="intensity-num">{level}</span>
                <span className="intensity-label">{intensityLabels[level]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-section">
          <label className="form-label">应对方式</label>
          {!showCustomCoping ? (
            <div className="preset-chips">
              {desireCopingPresets.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`preset-chip ${copingStrategy === c ? 'active' : ''}`}
                  onClick={() => setCopingStrategy(c)}
                >
                  {c}
                </button>
              ))}
              <button
                type="button"
                className="preset-chip custom"
                onClick={() => setShowCustomCoping(true)}
              >
                + 自定义
              </button>
            </div>
          ) : (
            <div className="custom-input-row">
              <input
                type="text"
                value={customCoping}
                onChange={(e) => setCustomCoping(e.target.value)}
                placeholder="描述你的应对方式"
                className="custom-input"
              />
              <button
                type="button"
                className="preset-chip"
                onClick={() => setShowCustomCoping(false)}
              >
                选择预设
              </button>
            </div>
          )}
        </div>

        <div className="form-section">
          <label className="form-label">结果</label>
          <div className="success-picker">
            <button
              type="button"
              className={`success-btn success ${successful ? 'active' : ''}`}
              onClick={() => setSuccessful(true)}
            >
              <Icon name="check" size={16} />
              成功应对
            </button>
            <button
              type="button"
              className={`success-btn failure ${!successful ? 'active' : ''}`}
              onClick={() => setSuccessful(false)}
            >
              <Icon name="flame" size={16} />
              未能守住
            </button>
          </div>
        </div>

        <div className="form-section">
          <label className="form-label">心得 (可选)</label>
          <textarea
            value={insight}
            onChange={(e) => setInsight(e.target.value)}
            placeholder="这次成功/失败的关键是什么？下次可以怎么做？"
            className="desire-textarea"
            rows={3}
          />
        </div>

        <div className="desire-form-actions">
          <button
            type="button"
            className="danger-soft"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            type="button"
            className="primary-action"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? '保存中…' : '记录这次邪念'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DesireCard({
  record,
  onDelete,
}: {
  record: DesireRecord
  onDelete: () => void
}) {
  const time = new Date(record.createdAt)
  const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`

  return (
    <div className={`desire-card intensity-${record.intensity} ${record.successful ? 'success' : 'failure'}`}>
      <div className="desire-card-header">
        <div className="desire-card-time">
          <Icon name="flame" size={14} />
          <span>{timeStr}</span>
        </div>
        <div className={`desire-card-result ${record.successful ? 'success' : 'failure'}`}>
          {record.successful ? '成功' : '失守'}
        </div>
        <button className="desire-card-delete" onClick={onDelete} type="button" aria-label="删除">
          <Icon name="trash" size={14} />
        </button>
      </div>
      <div className="desire-card-body">
        <div className="desire-card-field">
          <span className="field-label">诱因</span>
          <span className="field-value">{record.trigger}</span>
        </div>
        <div className="desire-card-field">
          <span className="field-label">强度</span>
          <span className={`field-value intensity-text intensity-${record.intensity}`}>
            {'●'.repeat(record.intensity)}{'○'.repeat(5 - record.intensity)}
          </span>
        </div>
        <div className="desire-card-field">
          <span className="field-label">应对</span>
          <span className="field-value">{record.copingStrategy}</span>
        </div>
        {record.insight && (
          <div className="desire-card-insight">
            <Icon name="sparkles" size={14} />
            <p>{record.insight}</p>
          </div>
        )}
      </div>
    </div>
  )
}