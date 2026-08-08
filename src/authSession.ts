const loginAtKey = 'self-recorder.auth-login-at.v1'
export const SESSION_DAYS = 7
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000

export function markLoginSession(at = new Date()) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(loginAtKey, at.toISOString())
}

export function clearLoginSession() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(loginAtKey)
}

export function getLoginSessionStartedAt(): Date | null {
  if (typeof localStorage === 'undefined') return null

  const raw = localStorage.getItem(loginAtKey)
  if (!raw) return null

  const loginAt = new Date(raw)
  return Number.isNaN(loginAt.getTime()) ? null : loginAt
}

export function isLoginSessionValid(now = Date.now()) {
  const loginAt = getLoginSessionStartedAt()
  if (!loginAt) return true
  return now - loginAt.getTime() < SESSION_MS
}

export function getLoginSessionRemainingDays(now = Date.now()) {
  const loginAt = getLoginSessionStartedAt()
  if (!loginAt) return SESSION_DAYS
  const remainingMs = SESSION_MS - (now - loginAt.getTime())
  return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)))
}

export async function enforceLoginSessionExpiry(signOut: () => Promise<void>) {
  if (isLoginSessionValid()) return false

  await signOut()
  clearLoginSession()
  return true
}
