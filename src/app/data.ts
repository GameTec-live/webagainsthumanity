import type { RoomView } from "@/game"

export function saveToken(code: string, token: string) {
  localStorage.setItem(`room:${code}`, token)
}

export function readToken(code: string) {
  return localStorage.getItem(`room:${code}`)
}

export function removeToken(code: string) {
  localStorage.removeItem(`room:${code}`)
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  const body = (await response.json()) as T & { error?: string }
  if (!response.ok) throw new Error(body.error ?? "Request failed.")
  return body
}

export function message(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong."
}

export function lines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

export function prompts(value: string) {
  return lines(value).map((text) => ({
    text,
    pick: Math.min(3, Math.max(1, (text.match(/_/g) ?? []).length)),
  }))
}

export function formatCard(text: string) {
  return text.replaceAll("**", "").replaceAll("_", "________")
}

export function phaseLabel(room: RoomView) {
  if (room.phase === "submitting") return "Pick a card"
  if (room.phase === "judging")
    return room.settings.mode === "czar" ? "Czar is choosing" : "Vote now"
  if (room.phase === "finished") return "Game over"
  return "Round complete"
}
