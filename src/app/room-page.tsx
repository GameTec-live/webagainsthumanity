import * as React from "react"

import type { ClientCommand, ServerMessage } from "@/game"
import { api, message, readToken, removeToken } from "@/app/data"
import { GameTable } from "@/app/game-table"
import { JoinRoom } from "@/app/landing-page"
import { Lobby } from "@/app/lobby"
import { ErrorToast, Header, LoadingTable, RoomBar } from "@/app/shared"
import { useGame } from "@/app/store"

const REMOVED_MESSAGE = "You have been removed from this room."

export function RoomPage({ code }: { code: string }) {
  const token = readToken(code)
  const removalMessage = new URLSearchParams(location.search).has("removed")
    ? "You have been removed from this room. You can join again with a new name."
    : undefined
  return (
    <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-4 sm:px-6">
      <Header />
      {!token ? (
        <div className="mx-auto mt-16 max-w-md rounded-2xl border p-5 shadow-xl">
          <JoinRoom initialCode={code} initialError={removalMessage} />
        </div>
      ) : (
        <ConnectedRoom code={code} token={token} />
      )}
    </main>
  )
}

function ConnectedRoom({ code, token }: { code: string; token: string }) {
  const socket = React.useRef<WebSocket | null>(null)
  const { room, connection, error, setRoom, setConnection, setError } =
    useGame()
  React.useEffect(() => {
    let disposed = false
    let retry: number | undefined
    function handleRemoval() {
      removeToken(code)
      location.assign(`/room/${code}?removed=1`)
    }
    async function connect() {
      setConnection("connecting")
      try {
        const { ticket } = await api<{ ticket: string }>(
          `/api/rooms/${code}/ws-ticket`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        if (disposed) return
        const protocol = location.protocol === "https:" ? "wss" : "ws"
        const ws = new WebSocket(
          `${protocol}://${location.host}/api/rooms/${code}/ws?ticket=${encodeURIComponent(ticket)}`
        )
        socket.current = ws
        ws.onopen = () => setConnection("online")
        ws.onmessage = (event) => {
          const payload = JSON.parse(event.data) as ServerMessage
          if (payload.type === "snapshot") setRoom(payload.room)
          else if (
            payload.type === "removed" ||
            payload.message === REMOVED_MESSAGE
          ) {
            handleRemoval()
          } else setError(payload.message)
        }
        ws.onclose = () => {
          if (!disposed) {
            setConnection("offline")
            retry = window.setTimeout(connect, 1500)
          }
        }
      } catch (error) {
        const errorMessage = message(error)
        if (errorMessage === REMOVED_MESSAGE) {
          handleRemoval()
          return
        }
        setError(errorMessage)
        setConnection("offline")
        retry = window.setTimeout(connect, 2500)
      }
    }
    void connect()
    return () => {
      disposed = true
      window.clearTimeout(retry)
      socket.current?.close()
    }
  }, [code, token, setConnection, setError, setRoom])
  const send = React.useCallback((command: ClientCommand) => {
    socket.current?.send(JSON.stringify(command))
  }, [])
  if (!room) {
    return <LoadingTable connection={connection} />
  }
  return (
    <>
      <RoomBar room={room} connection={connection} />
      <ErrorToast error={error} close={() => setError(null)} />
      {room.phase === "lobby" ? (
        <Lobby room={room} send={send} />
      ) : (
        <GameTable room={room} send={send} />
      )}
    </>
  )
}
