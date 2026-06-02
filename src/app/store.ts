import { create } from "zustand"

import type { RoomView } from "@/game"
import type { Connection } from "@/app/types"

type Store = {
  room: RoomView | null
  connection: Connection
  error: string | null
  setRoom: (room: RoomView) => void
  setConnection: (connection: Connection) => void
  setError: (error: string | null) => void
}

export const useGame = create<Store>((set) => ({
  room: null,
  connection: "connecting",
  error: null,
  setRoom: (room) => set({ room, error: null }),
  setConnection: (connection) => set({ connection }),
  setError: (error) => set({ error }),
}))
