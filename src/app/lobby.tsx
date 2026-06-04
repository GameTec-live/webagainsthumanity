import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { Crown, LogIn, Play, RotateCcw, Settings2, X } from "lucide-react"

import type { RoomView } from "@/game"
import type { SendCommand } from "@/app/types"
import { removeToken } from "@/app/data"
import { RulesSummary, SettingsForm } from "@/app/settings"
import { Button } from "@/components/ui/button"

export function Lobby({ room, send }: { room: RoomView; send: SendCommand }) {
  const isHost = room.me?.id === room.hostId
  const [settings, setSettings] = React.useState(room.settings)
  const [showSettings, setShowSettings] = React.useState(false)
  function toggleSettings() {
    if (showSettings) {
      send({ type: "settings", settings })
      setShowSettings(false)
    } else {
      setSettings(room.settings)
      setShowSettings(true)
    }
  }
  return (
    <div className="grid gap-5 py-6 lg:grid-cols-3">
      <section className="rounded-2xl border p-5 sm:p-7 lg:col-span-2">
        <div>
          <h1 className="mt-3 text-4xl font-black tracking-tight">
            Waiting for the crew.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Share the link. The game needs at least three players.
          </p>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {room.players.map((player, index) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                key={player.id}
                className="flex items-center gap-3 rounded-xl border bg-muted/50 p-3"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-foreground text-sm font-black text-background">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{player.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {player.id === room.hostId ? "Host" : "Ready to play"}
                  </p>
                </div>
                {player.id === room.hostId && <Crown className="size-4" />}
                {isHost && player.id !== room.hostId && (
                  <button
                    aria-label={`Remove ${player.name}`}
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      send({ type: "remove_player", playerId: player.id })
                    }
                  >
                    <X className="size-4" />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {isHost && (
          <Button
            className="mt-10 h-11 rounded-lg px-5"
            disabled={room.players.length < 3}
            onClick={() => send({ type: "start" })}
          >
            <Play /> Start game
          </Button>
        )}
        {room.spectator && (
          <Button
            className="mt-10 h-11 rounded-lg px-5"
            onClick={() => {
              removeToken(room.code)
              location.reload()
            }}
          >
            <LogIn /> Take a seat
          </Button>
        )}
      </section>
      <aside className="rounded-2xl border p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-black">
            <Settings2 className="size-4" /> House rules
          </h2>
          {isHost && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-md"
              onClick={toggleSettings}
            >
              {showSettings ? "Done" : "Edit"}
            </Button>
          )}
        </div>
        {showSettings && isHost ? (
          <>
            <SettingsForm settings={settings} onChange={setSettings} />
            <Button
              variant="outline"
              className="mt-4 w-full rounded-md"
              onClick={() => setSettings(room.settings)}
            >
              <RotateCcw /> Reset changes
            </Button>
          </>
        ) : (
          <RulesSummary settings={room.settings} />
        )}
      </aside>
    </div>
  )
}
