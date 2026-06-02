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
    pick: promptPick(text),
  }))
}

export type CustomPack = {
  name: string
  white: string[]
  black: Array<{ text: string; pick: number }>
}

export function parseCustomPack(
  value: string,
  fallbackName: string
): CustomPack {
  const pack = JSON.parse(value) as unknown
  if (
    !isRecord(pack) ||
    !Array.isArray(pack.white) ||
    !Array.isArray(pack.black)
  ) {
    throw new Error('Custom pack JSON must contain "white" and "black" arrays.')
  }
  const white = pack.white.map((card) => {
    if (typeof card !== "string") {
      throw new Error("Every white card must be a string.")
    }
    return card.trim()
  })
  const black = pack.black.map((card) => {
    if (typeof card === "string") {
      const text = card.trim()
      return { text, pick: promptPick(text) }
    }
    if (!isRecord(card) || typeof card.text !== "string") {
      throw new Error(
        "Every black card must be a string or an object with text."
      )
    }
    const text = card.text.trim()
    const pick = card.pick === undefined ? promptPick(text) : card.pick
    if (!Number.isInteger(pick)) {
      throw new Error("A black card pick value must be an integer.")
    }
    return { text, pick: pick as number }
  })
  return {
    name:
      typeof pack.name === "string" && pack.name.trim()
        ? pack.name.trim()
        : fallbackName,
    white,
    black,
  }
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

function promptPick(text: string) {
  return Math.min(3, Math.max(1, (text.match(/_/g) ?? []).length))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
