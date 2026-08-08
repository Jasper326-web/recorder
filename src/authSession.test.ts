import { describe, expect, it } from 'vitest'
import {
  clearLoginSession,
  getLoginSessionRemainingDays,
  getLoginSessionStartedAt,
  isLoginSessionValid,
  markLoginSession,
  SESSION_DAYS,
} from './authSession'

describe('authSession', () => {
  it('marks and clears login session', () => {
    clearLoginSession()
    expect(getLoginSessionStartedAt()).toBeNull()

    markLoginSession(new Date('2026-08-01T08:00:00.000Z'))
    expect(getLoginSessionStartedAt()?.toISOString()).toBe('2026-08-01T08:00:00.000Z')

    clearLoginSession()
    expect(getLoginSessionStartedAt()).toBeNull()
  })

  it('treats fresh sessions as valid for seven days', () => {
    clearLoginSession()
    markLoginSession(new Date('2026-08-01T08:00:00.000Z'))

    expect(isLoginSessionValid(new Date('2026-08-07T07:59:59.999Z').getTime())).toBe(true)
    expect(isLoginSessionValid(new Date('2026-08-08T08:00:00.000Z').getTime())).toBe(false)
  })

  it('reports remaining days until expiry', () => {
    clearLoginSession()
    markLoginSession(new Date('2026-08-01T08:00:00.000Z'))

    expect(getLoginSessionRemainingDays(new Date('2026-08-01T08:00:00.000Z').getTime())).toBe(SESSION_DAYS)
    expect(getLoginSessionRemainingDays(new Date('2026-08-08T08:00:00.000Z').getTime())).toBe(0)
  })
})
