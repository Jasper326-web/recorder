import { describe, expect, it } from 'vitest'
import {
  analyzeEntry,
  buildCalendarDays,
  createEntry,
  filterEntries,
  trainingTracks,
} from './domain'

describe('recording domain', () => {
  it('creates a local-first text entry around the four training goals', () => {
    const entry = createEntry({
      type: 'text',
      promptAnswers: {
        state: '有点烦躁，但想把话说清楚',
        event: '开会时被打断，我脑子乱了，表达也变急',
        next: '先复述事实，再说我的需求',
      },
      bodyText: '我想练习把情绪降下来，同时让表达更清楚。',
      createdAt: new Date('2026-05-06T10:00:00+08:00'),
    })

    expect(entry.id).toMatch(/^entry-/)
    expect(entry.type).toBe('text')
    expect(entry.title).toContain('把情绪降下来')
    expect(entry.category).toBe('情绪控制力')
    expect(entry.tags).toEqual(expect.arrayContaining(['情绪控制', '口才表达']))
    expect(trainingTracks.map((track) => track.name)).toEqual([
      '情绪控制力',
      '生活觉知力',
      '口才表达能力',
      '头脑清晰度',
    ])
  })

  it('creates warm companion analysis without overwriting manual category choices', () => {
    const entry = createEntry({
      type: 'text',
      promptAnswers: {
        state: '今天很清醒',
        event: '散步时意识到自己一直在逃避一个决定',
        next: '把三个选项写出来',
      },
      bodyText: '我想把思路拆开，别让脑子一直打结。',
      category: '生活觉知力',
      tags: ['觉察'],
      createdAt: new Date('2026-05-06T12:00:00+08:00'),
    })

    const analysis = analyzeEntry(entry)

    expect(analysis.category).toBe('生活觉知力')
    expect(analysis.summary).toContain('你记录到')
    expect(analysis.reflection).toContain('心灵小蜜')
    expect(analysis.tags).toEqual(expect.arrayContaining(['觉察']))
  })

  it('aggregates calendar days and filters entries by type and category', () => {
    const entries = [
      createEntry({
        type: 'text',
        promptAnswers: {
          state: '烦',
          event: '争论',
          next: '慢一点说',
        },
        bodyText: '表达时先停顿。',
        createdAt: new Date('2026-05-01T09:00:00+08:00'),
      }),
      createEntry({
        type: 'video',
        promptAnswers: {
          state: '清醒',
          event: '录一段复述',
          next: '看回放',
        },
        bodyText: '练习口头表达',
        videoBlobRef: 'blob:local-demo',
        createdAt: new Date('2026-05-01T20:00:00+08:00'),
      }),
      createEntry({
        type: 'text',
        promptAnswers: {
          state: '安静',
          event: '整理房间',
          next: '睡觉前复盘',
        },
        bodyText: '生活细节里能看到状态。',
        createdAt: new Date('2026-05-02T11:00:00+08:00'),
      }),
    ]

    const calendar = buildCalendarDays(entries, new Date('2026-05-15T00:00:00+08:00'))
    const mayFirst = calendar.find((day) => day.dateKey === '2026-05-01')

    expect(mayFirst?.count).toBe(2)
    expect(mayFirst?.types).toEqual(['text', 'video'])
    expect(mayFirst?.categories.length).toBeGreaterThan(0)
    expect(filterEntries(entries, { type: 'video' })).toHaveLength(1)
    expect(filterEntries(entries, { category: '生活觉知力' })).toHaveLength(1)
  })
})
