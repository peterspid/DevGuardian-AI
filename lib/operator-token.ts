"use client"

const STORAGE_KEY = "devguardian.operatorToken"

export const OPERATOR_TOKEN_EVENT = "devguardian:operator-token"

export function getStoredOperatorToken() {
  if (typeof window === "undefined") return ""
  return window.localStorage.getItem(STORAGE_KEY) || ""
}

export function setStoredOperatorToken(token: string) {
  if (typeof window === "undefined") return
  const normalized = token.trim()
  if (normalized) {
    window.localStorage.setItem(STORAGE_KEY, normalized)
  } else {
    window.localStorage.removeItem(STORAGE_KEY)
  }
  window.dispatchEvent(new Event(OPERATOR_TOKEN_EVENT))
}

export function operatorHeaders(): Record<string, string> {
  const token = getStoredOperatorToken()
  return token ? { "x-devguardian-operator-token": token } : {}
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      typeof payload?.error?.message === "string"
        ? payload.error.message
        : `Request failed with status ${response.status}.`
    throw new Error(message)
  }
  return payload as T
}
