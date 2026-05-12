import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('App recording flow', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    })
    vi.stubGlobal('crypto', {
      randomUUID: () => 'test-video-id',
    })
  })

  it('saves a guided text entry and shows it in the list and companion rail', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('我现在是什么状态？'), '有点烦，但想慢下来')
    await user.type(screen.getByLabelText('刚才/今天发生了什么？'), '开会时我被打断了，说话变急')
    await user.type(screen.getByLabelText('我接下来想怎么做？'), '先复述事实，再表达需求')
    await user.type(screen.getByLabelText('补充记录'), '我想练习情绪控制和口才表达。')
    await user.click(screen.getByRole('button', { name: '保存这次记录' }))

    expect(screen.getByText(/已保存/)).toBeInTheDocument()
    expect(screen.getAllByText('情绪控制力').length).toBeGreaterThan(0)

    await user.click(screen.getAllByRole('button', { name: '列表' })[0])

    expect(screen.getByText(/我想练习情绪控制和口才表达/)).toBeInTheDocument()
    expect(screen.getAllByText('文字').length).toBeGreaterThan(0)

    await user.click(screen.getAllByRole('button', { name: '心灵小蜜' })[0])

    expect(screen.getByText(/我是心灵小蜜/)).toBeInTheDocument()
  })
})
