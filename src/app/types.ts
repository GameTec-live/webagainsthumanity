import type { ClientCommand } from "@/game"

export type Connection = "connecting" | "online" | "offline"

export type SendCommand = (command: ClientCommand) => void
