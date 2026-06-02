import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  Check,
  ChevronRight,
  Crown,
  Link,
  LoaderCircle,
  LogIn,
  Play,
  RotateCcw,
  Settings2,
  Share2,
  Sparkles,
  Timer,
  Trophy,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react"
import { create } from "zustand"

import {
  DEFAULT_SETTINGS,
  type ClientCommand,
  type GameSettings,
  type PackSummary,
  type RoomView,
  type ServerMessage,
} from "@/game"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type Connection = "connecting" | "online" | "offline"
type Store = {
  room: RoomView | null
  connection: Connection
  error: string | null
  setRoom: (room: RoomView) => void
  setConnection: (connection: Connection) => void
  setError: (error: string | null) => void
}

const useGame = create<Store>((set) => ({
  room: null,
  connection: "connecting",
  error: null,
  setRoom: (room) => set({ room, error: null }),
  setConnection: (connection) => set({ connection }),
  setError: (error) => set({ error }),
}))

export function App() {
  const code = location.pathname
    .match(/^\/room\/([A-Za-z0-9]{6})/)?.[1]
    ?.toUpperCase()
  return (
    <div className="min-h-svh bg-background">
      {code ? <RoomPage code={code} /> : <LandingPage />}
      <Footer />
    </div>
  )
}

function LandingPage() {
  const [view, setView] = React.useState<"start" | "create" | "join">("start")
  return (
    <main className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:48px_48px] opacity-60" />
      <div className="mx-auto flex min-h-[calc(100svh-76px)] max-w-6xl flex-col px-5 py-5 sm:px-8">
        <Header />
        <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1fr_440px]">
          <section>
            <Badge className="mb-5 border-foreground/20 bg-background">
              <Sparkles className="size-3" /> Live party game
            </Badge>
            <h1 className="max-w-3xl text-6xl leading-[0.9] font-black tracking-[-0.08em] sm:text-8xl">
              Bad cards.
              <br />
              Good company.
            </h1>
            <p className="mt-7 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              A fast, private, browser-based party game. Create a table, pick
              your decks, and invite the people who understand your worst jokes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-xs font-semibold tracking-wide uppercase">
              <span className="flex items-center gap-2">
                <Wifi className="size-4" /> Live multiplayer
              </span>
              <span className="flex items-center gap-2">
                <Link className="size-4" /> Invite-only rooms
              </span>
              <span className="flex items-center gap-2">
                <Users className="size-4" /> 3-12 players
              </span>
            </div>
          </section>
          <motion.section
            layout
            className="rounded-2xl border border-border bg-background/90 p-5 shadow-2xl shadow-black/10 backdrop-blur"
          >
            <AnimatePresence mode="wait">
              {view === "start" && <StartCard key="start" setView={setView} />}
              {view === "create" && (
                <CreateRoom key="create" onBack={() => setView("start")} />
              )}
              {view === "join" && (
                <JoinRoom key="join" onBack={() => setView("start")} />
              )}
            </AnimatePresence>
          </motion.section>
        </div>
      </div>
    </main>
  )
}

function StartCard({
  setView,
}: {
  setView: (view: "create" | "join") => void
}) {
  return (
    <PanelMotion>
      <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
        Your table awaits
      </p>
      <h2 className="mt-2 text-3xl font-black tracking-tight">
        Start playing.
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        No account. No install. No public lobby.
      </p>
      <Button
        className="mt-7 h-12 w-full rounded-lg text-sm"
        onClick={() => setView("create")}
      >
        Create a room <ChevronRight />
      </Button>
      <Button
        variant="outline"
        className="mt-3 h-12 w-full rounded-lg text-sm"
        onClick={() => setView("join")}
      >
        <LogIn /> Join with a code
      </Button>
    </PanelMotion>
  )
}

function CreateRoom({ onBack }: { onBack: () => void }) {
  const [packs, setPacks] = React.useState<PackSummary[]>([])
  const [name, setName] = React.useState("")
  const [settings, setSettings] = React.useState<GameSettings>(DEFAULT_SETTINGS)
  const [expanded, setExpanded] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  React.useEffect(() => {
    api<{ packs: PackSummary[] }>("/api/decks")
      .then(({ packs }) => {
        setPacks(packs)
        setSettings((current) => ({
          ...current,
          selectedPacks: packs
            .filter((pack) => pack.official)
            .map((pack) => pack.id),
        }))
      })
      .catch((error: Error) => setError(error.message))
      .finally(() => setLoading(false))
  }, [])
  async function createRoom() {
    setLoading(true)
    setError(null)
    try {
      const result = await api<{ code: string; token: string }>("/api/rooms", {
        method: "POST",
        body: JSON.stringify({ name, settings }),
      })
      saveToken(result.code, result.token)
      location.assign(`/room/${result.code}`)
    } catch (error) {
      setError(message(error))
      setLoading(false)
    }
  }
  return (
    <PanelMotion>
      <BackButton onClick={onBack} />
      <h2 className="mt-4 text-2xl font-black">Set the table.</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose the basics. Fine-tune the rest in the lobby.
      </p>
      <label className="mt-5 block text-xs font-bold tracking-wider uppercase">
        Display name
      </label>
      <Input
        className="mt-2"
        value={name}
        maxLength={24}
        placeholder="Your name"
        onChange={(event) => setName(event.target.value)}
      />
      <SettingsForm settings={settings} onChange={setSettings} compact />
      <Separator className="my-5" />
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-wider uppercase">
          Decks
        </span>
        <Badge>{settings.selectedPacks.length} selected</Badge>
      </div>
      <div className="mt-3 max-h-44 space-y-1 overflow-y-auto pr-1">
        {loading && packs.length === 0 ? (
          <LoaderCircle className="mx-auto my-8 size-5 animate-spin text-muted-foreground" />
        ) : (
          packs.slice(0, expanded ? packs.length : 8).map((pack) => (
            <DeckRow
              key={pack.id}
              pack={pack}
              checked={settings.selectedPacks.includes(pack.id)}
              onChange={() =>
                setSettings((current) => ({
                  ...current,
                  selectedPacks: current.selectedPacks.includes(pack.id)
                    ? current.selectedPacks.filter((id) => id !== pack.id)
                    : [...current.selectedPacks, pack.id],
                }))
              }
            />
          ))
        )}
      </div>
      {packs.length > 8 && (
        <button
          className="mt-2 text-xs font-semibold text-muted-foreground underline"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : `Browse all ${packs.length} decks`}
        </button>
      )}
      <ErrorText>{error}</ErrorText>
      <Button
        className="mt-5 h-11 w-full rounded-lg"
        disabled={loading}
        onClick={createRoom}
      >
        {loading ? <LoaderCircle className="animate-spin" /> : <Play />} Create
        room
      </Button>
    </PanelMotion>
  )
}

function JoinRoom({
  onBack,
  initialCode = "",
}: {
  onBack?: () => void
  initialCode?: string
}) {
  const [code, setCode] = React.useState(initialCode)
  const [name, setName] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  async function join() {
    setLoading(true)
    try {
      const normalized = code.trim().toUpperCase()
      const result = await api<{ token: string }>(
        `/api/rooms/${normalized}/join`,
        {
          method: "POST",
          body: JSON.stringify({ name }),
        }
      )
      saveToken(normalized, result.token)
      location.assign(`/room/${normalized}`)
    } catch (error) {
      setError(message(error))
      setLoading(false)
    }
  }
  return (
    <PanelMotion>
      {onBack && <BackButton onClick={onBack} />}
      <h2 className="mt-4 text-2xl font-black">Join the table.</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter the invite code and pick a name.
      </p>
      <label className="mt-5 block text-xs font-bold tracking-wider uppercase">
        Room code
      </label>
      <Input
        className="mt-2 font-mono text-lg font-bold tracking-[0.25em] uppercase"
        maxLength={6}
        placeholder="ABC123"
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
      <label className="mt-4 block text-xs font-bold tracking-wider uppercase">
        Display name
      </label>
      <Input
        className="mt-2"
        maxLength={24}
        placeholder="Your name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <ErrorText>{error}</ErrorText>
      <Button
        className="mt-5 h-11 w-full rounded-lg"
        disabled={loading}
        onClick={join}
      >
        {loading ? <LoaderCircle className="animate-spin" /> : <LogIn />} Join
        room
      </Button>
    </PanelMotion>
  )
}

function RoomPage({ code }: { code: string }) {
  const token = readToken(code)
  return (
    <main className="mx-auto min-h-[calc(100svh-76px)] max-w-7xl px-4 py-4 sm:px-6">
      <Header code={code} />
      {!token ? (
        <div className="mx-auto mt-16 max-w-md rounded-2xl border p-5 shadow-xl">
          <JoinRoom initialCode={code} />
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
          else setError(payload.message)
        }
        ws.onclose = () => {
          if (!disposed) {
            setConnection("offline")
            retry = window.setTimeout(connect, 1500)
          }
        }
      } catch (error) {
        setError(message(error))
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

function Lobby({
  room,
  send,
}: {
  room: RoomView
  send: (command: ClientCommand) => void
}) {
  const isHost = room.me?.id === room.hostId
  const [settings, setSettings] = React.useState(room.settings)
  const [showSettings, setShowSettings] = React.useState(false)
  return (
    <div className="grid gap-5 py-6 lg:grid-cols-[1fr_360px]">
      <section className="rounded-2xl border p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge>Lobby</Badge>
            <h1 className="mt-3 text-4xl font-black tracking-tight">
              Waiting for the crew.
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Share the link. The game needs at least three players.
            </p>
          </div>
          <Invite code={room.code} />
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
              onClick={() => {
                setSettings(room.settings)
                setShowSettings(!showSettings)
              }}
            >
              {showSettings ? "Done" : "Edit"}
            </Button>
          )}
        </div>
        {showSettings && isHost ? (
          <>
            <SettingsForm settings={settings} onChange={setSettings} />
            <Button
              className="mt-4 w-full rounded-md"
              onClick={() => send({ type: "settings", settings })}
            >
              Save rules
            </Button>
          </>
        ) : (
          <RulesSummary settings={room.settings} />
        )}
      </aside>
    </div>
  )
}

function GameTable({
  room,
  send,
}: {
  room: RoomView
  send: (command: ClientCommand) => void
}) {
  const [selected, setSelected] = React.useState<string[]>([])
  const [selectedRound, setSelectedRound] = React.useState(room.round)
  const isHost = room.me?.id === room.hostId
  const isJudge = room.me?.id === room.judgeId
  const submitted = room.hasSubmitted
  const activeSelection = selectedRound === room.round ? selected : []
  function select(cardId: string) {
    if (!room.prompt || submitted || room.spectator || isJudge) return
    setSelectedRound(room.round)
    setSelected((current) => {
      const selection = selectedRound === room.round ? current : []
      return selection.includes(cardId)
        ? selection.filter((id) => id !== cardId)
        : selection.length < room.prompt!.pick
          ? [...selection, cardId]
          : selection
    })
  }
  return (
    <div className="grid gap-5 py-5 xl:grid-cols-[220px_1fr]">
      <ScoreRail room={room} send={send} />
      <section className="min-w-0 rounded-2xl border p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge>Round {room.round}</Badge>
            <Badge className="text-muted-foreground">{phaseLabel(room)}</Badge>
            {room.deadline && <Deadline deadline={room.deadline} />}
          </div>
          {isHost && room.phase !== "finished" && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-md"
              onClick={() => send({ type: "skip" })}
            >
              Skip phase
            </Button>
          )}
        </div>
        <div className="mt-7 grid gap-7 lg:grid-cols-[230px_1fr]">
          <PromptCard
            text={room.prompt?.text ?? ""}
            pick={room.prompt?.pick ?? 1}
          />
          <div className="min-w-0">
            {room.phase === "submitting" ? (
              <SubmissionStatus room={room} isJudge={isJudge} />
            ) : room.phase === "judging" ? (
              <SubmissionGrid room={room} send={send} />
            ) : (
              <RoundResult room={room} send={send} />
            )}
          </div>
        </div>
        {room.phase === "submitting" && room.me && !isJudge && !submitted && (
          <div className="mt-8">
            <Separator />
            <div className="mt-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black">Your hand</h2>
                <p className="text-xs text-muted-foreground">
                  Choose {room.prompt?.pick} card
                  {room.prompt?.pick === 1 ? "" : "s"} in order.
                </p>
              </div>
              <Button
                className="rounded-md"
                disabled={activeSelection.length !== room.prompt?.pick}
                onClick={() =>
                  send({ type: "submit", cardIds: activeSelection })
                }
              >
                Play card{activeSelection.length === 1 ? "" : "s"}{" "}
                <ChevronRight />
              </Button>
            </div>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-4">
              {room.me.hand.map((card) => (
                <AnswerCard
                  key={card.id}
                  text={card.text}
                  order={activeSelection.indexOf(card.id) + 1}
                  selected={activeSelection.includes(card.id)}
                  onClick={() => select(card.id)}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function SubmissionStatus({
  room,
  isJudge,
}: {
  room: RoomView
  isJudge: boolean
}) {
  const complete = room.players.filter(
    (player) => player.id !== room.judgeId
  ).length
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center">
      <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
      <h2 className="mt-4 text-xl font-black">
        {isJudge
          ? "You are the card czar."
          : room.spectator
            ? "Watching the round."
            : "Cards are hitting the table."}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {room.submissions.length} of {complete} submissions are in.
      </p>
    </div>
  )
}

function SubmissionGrid({
  room,
  send,
}: {
  room: RoomView
  send: (command: ClientCommand) => void
}) {
  const isJudge = room.me?.id === room.judgeId
  const voted = room.hasVoted
  return (
    <div>
      <h2 className="text-xl font-black">
        {room.settings.mode === "czar"
          ? isJudge
            ? "Pick the winner."
            : "The czar is deciding."
          : "Vote for the best answer."}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Submissions stay anonymous until the winner is chosen.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {room.submissions.map((submission, index) => {
          const canChoose =
            room.settings.mode === "czar" ? isJudge : Boolean(room.me && !voted)
          return (
            <motion.button
              initial={{ opacity: 0, y: 18, rotate: index % 2 ? 1 : -1 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ delay: index * 0.07 }}
              key={submission.id}
              disabled={!canChoose}
              className="min-h-40 rounded-xl border bg-card p-4 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md disabled:hover:translate-y-0"
              onClick={() =>
                send({
                  type: room.settings.mode === "czar" ? "choose" : "vote",
                  submissionId: submission.id,
                })
              }
            >
              {submission.cards.map((card) => (
                <p key={card.id} className="mb-3 text-sm font-bold">
                  {formatCard(card.text)}
                </p>
              ))}
              <span className="mt-auto text-[10px] font-black tracking-wider text-muted-foreground uppercase">
                Submission {index + 1}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

function RoundResult({
  room,
  send,
}: {
  room: RoomView
  send: (command: ClientCommand) => void
}) {
  const winner = room.players.find((player) => player.id === room.winnerId)
  const isHost = room.me?.id === room.hostId
  const finished = room.phase === "finished"
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border p-6 text-center">
      <Trophy className="size-8" />
      <h2 className="mt-4 text-2xl font-black">
        {finished
          ? "Game over."
          : winner
            ? `${winner.name} takes the point.`
            : "No winner this round."}
      </h2>
      {finished && (
        <p className="mt-2 text-sm text-muted-foreground">
          The table has spoken. Final scores are on the left.
        </p>
      )}
      {isHost && (
        <Button
          className="mt-5 rounded-md"
          onClick={() => send({ type: finished ? "rematch" : "next_round" })}
        >
          {finished ? <RotateCcw /> : <ChevronRight />}
          {finished ? " Back to lobby" : " Next round"}
        </Button>
      )}
    </div>
  )
}

function ScoreRail({
  room,
  send,
}: {
  room: RoomView
  send: (command: ClientCommand) => void
}) {
  const isHost = room.me?.id === room.hostId
  return (
    <aside className="rounded-2xl border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black tracking-wider uppercase">
          Scoreboard
        </h2>
        <Users className="size-4" />
      </div>
      <div className="mt-4 space-y-2">
        {[...room.players]
          .sort((a, b) => b.score - a.score)
          .map((player) => (
            <div
              key={player.id}
              className={cn(
                "flex items-center gap-2 rounded-lg p-2",
                player.id === room.winnerId && "bg-muted"
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  player.connected ? "bg-green-500" : "bg-muted-foreground"
                )}
              />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                {player.name}
              </span>
              <strong className="text-sm">{player.score}</strong>
              {isHost && !player.connected && player.id !== room.hostId && (
                <button
                  aria-label={`Remove ${player.name}`}
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    send({ type: "remove_player", playerId: player.id })
                  }
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          ))}
      </div>
    </aside>
  )
}

function SettingsForm({
  settings,
  onChange,
  compact = false,
}: {
  settings: GameSettings
  onChange: (settings: GameSettings) => void
  compact?: boolean
}) {
  const set = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) =>
    onChange({ ...settings, [key]: value })
  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Game ends"
          value={settings.endCondition}
          onChange={(value) =>
            set("endCondition", value as "points" | "rounds")
          }
          options={[
            ["points", "First to points"],
            ["rounds", "Fixed rounds"],
          ]}
        />
        <Field
          label={
            settings.endCondition === "points" ? "Points to win" : "Rounds"
          }
          value={settings.target}
          onChange={(value) => set("target", value)}
        />
      </div>
      {!compact && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Winner selection"
              value={settings.mode}
              onChange={(value) => set("mode", value as "czar" | "democracy")}
              options={[
                ["czar", "Rotating czar"],
                ["democracy", "Group vote"],
              ]}
            />
            <Field
              label="Hand size"
              value={settings.handSize}
              onChange={(value) => set("handSize", value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Player cap"
              value={settings.playerCap}
              onChange={(value) => set("playerCap", value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Pick timer seconds"
              value={settings.submitTimerSeconds ?? 0}
              onChange={(value) =>
                set("submitTimerSeconds", value === 0 ? null : value)
              }
            />
            <Field
              label="Judge timer seconds"
              value={settings.judgeTimerSeconds ?? 0}
              onChange={(value) =>
                set("judgeTimerSeconds", value === 0 ? null : value)
              }
            />
          </div>
          <Toggle
            label="Rando Cardrissian"
            checked={settings.rando}
            onChange={(value) => set("rando", value)}
          />
          <label className="block text-xs font-bold tracking-wider uppercase">
            Custom answers{" "}
            <span className="text-muted-foreground normal-case">
              (one per line)
            </span>
          </label>
          <Textarea
            value={settings.customAnswers.join("\n")}
            onChange={(event) =>
              set("customAnswers", lines(event.target.value))
            }
          />
          <label className="block text-xs font-bold tracking-wider uppercase">
            Custom prompts{" "}
            <span className="text-muted-foreground normal-case">
              (use _ for blanks)
            </span>
          </label>
          <Textarea
            value={settings.customPrompts
              .map((prompt) => prompt.text)
              .join("\n")}
            onChange={(event) =>
              set("customPrompts", prompts(event.target.value))
            }
          />
        </>
      )}
    </div>
  )
}

function RulesSummary({ settings }: { settings: GameSettings }) {
  const rules = [
    settings.mode === "czar" ? "Rotating card czar" : "Democratic vote",
    settings.endCondition === "points"
      ? `First to ${settings.target} points`
      : `${settings.target} rounds`,
    `${settings.handSize} cards per hand`,
    `${settings.playerCap} player seats`,
    settings.rando ? "Rando Cardrissian enabled" : "Rando Cardrissian off",
    settings.submitTimerSeconds
      ? `${settings.submitTimerSeconds}s submission timer`
      : "No turn timer",
    settings.judgeTimerSeconds
      ? `${settings.judgeTimerSeconds}s judging timer`
      : "No judging timer",
  ]
  return (
    <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
      {rules.map((rule) => (
        <li key={rule} className="flex gap-2">
          <Check className="mt-0.5 size-4 shrink-0 text-foreground" />
          {rule}
        </li>
      ))}
    </ul>
  )
}

function PromptCard({ text, pick }: { text: string; pick: number }) {
  return (
    <motion.div
      initial={{ rotate: -4, y: -12 }}
      animate={{ rotate: -2, y: 0 }}
      className="flex aspect-[5/7] w-full max-w-56 flex-col rounded-xl bg-foreground p-5 text-background shadow-xl"
    >
      <p className="text-lg leading-tight font-black">{formatCard(text)}</p>
      <span className="mt-auto text-[10px] font-black tracking-wider uppercase">
        Pick {pick}
      </span>
    </motion.div>
  )
}

function AnswerCard({
  text,
  selected,
  order,
  onClick,
}: {
  text: string
  selected: boolean
  order: number
  onClick: () => void
}) {
  return (
    <motion.button
      layout
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative aspect-[5/7] w-36 shrink-0 rounded-xl border bg-card p-4 text-left shadow-sm transition",
        selected && "-translate-y-2 ring-2 ring-foreground"
      )}
      onClick={onClick}
    >
      {order > 0 && (
        <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-foreground text-xs font-black text-background">
          {order}
        </span>
      )}
      <span className="text-xs leading-snug font-bold">{formatCard(text)}</span>
    </motion.button>
  )
}

function RoomBar({
  room,
  connection,
}: {
  room: RoomView
  connection: Connection
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2">
      <div className="flex items-center gap-2">
        <Badge className="font-mono tracking-[0.16em]">{room.code}</Badge>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {connection === "online" ? (
            <Wifi className="size-3" />
          ) : (
            <WifiOff className="size-3" />
          )}
          {connection}
        </span>
        {room.spectator && <Badge>Spectating</Badge>}
      </div>
      <Invite code={room.code} small />
    </div>
  )
}

function Header({ code }: { code?: string }) {
  return (
    <header className="flex items-center justify-between">
      <button
        className="text-sm font-black tracking-[-0.05em]"
        onClick={() => location.assign("/")}
      >
        Web Against Humanity
      </button>
      {code && <Badge>{code}</Badge>}
    </header>
  )
}

function Invite({ code, small = false }: { code: string; small?: boolean }) {
  const [copied, setCopied] = React.useState(false)
  async function copy() {
    await navigator.clipboard.writeText(`${location.origin}/room/${code}`)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }
  return (
    <Button
      size={small ? "sm" : "default"}
      variant="outline"
      className="rounded-md"
      onClick={copy}
    >
      {copied ? <Check /> : <Share2 />}
      {copied ? "Copied" : "Invite"}
    </Button>
  )
}

function DeckRow({
  pack,
  checked,
  onChange,
}: {
  pack: PackSummary
  checked: boolean
  onChange: () => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="min-w-0 flex-1 truncate text-xs font-semibold">
        {pack.name}
      </span>
      {pack.official && <Badge>Official</Badge>}
    </label>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block text-[10px] font-bold tracking-wider uppercase">
      {label}
      <Input
        className="mt-1"
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[][]
  onChange: (value: string) => void
}) {
  return (
    <label className="block text-[10px] font-bold tracking-wider uppercase">
      {label}
      <select
        className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-xs normal-case"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([value, label]) => (
          <option value={value} key={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between text-xs font-semibold">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

function Deadline({ deadline }: { deadline: number }) {
  const [seconds, setSeconds] = React.useState(() =>
    Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
  )
  React.useEffect(() => {
    const interval = window.setInterval(
      () => setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))),
      1000
    )
    return () => window.clearInterval(interval)
  }, [deadline])
  return (
    <Badge>
      <Timer className="size-3" /> {seconds}s
    </Badge>
  )
}

function ErrorToast({
  error,
  close,
}: {
  error: string | null
  close: () => void
}) {
  if (!error) return null
  return (
    <div className="fixed right-4 bottom-4 z-50 flex max-w-sm items-center gap-3 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-xl">
      <span>{error}</span>
      <button onClick={close}>
        <X className="size-4" />
      </button>
    </div>
  )
}

function ErrorText({ children }: { children: string | null }) {
  return children ? (
    <p className="mt-3 text-xs font-semibold text-red-600">{children}</p>
  ) : null
}

function LoadingTable({ connection }: { connection: Connection }) {
  return (
    <div className="flex min-h-[70svh] flex-col items-center justify-center">
      <LoaderCircle className="size-7 animate-spin" />
      <p className="mt-4 text-sm text-muted-foreground">
        Connecting to the table ({connection})...
      </p>
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="text-xs font-bold tracking-wider text-muted-foreground uppercase"
      onClick={onClick}
    >
      ← Back
    </button>
  )
}

function PanelMotion({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
    >
      {children}
    </motion.div>
  )
}

function Footer() {
  return (
    <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-5 py-6 text-[10px] leading-relaxed text-muted-foreground sm:px-8">
      <span>Unofficial, free fan project. Adult content.</span>
      <span>
        Card text from{" "}
        <a className="underline" href="https://www.crhallberg.com/cah/">
          JSON Against Humanity
        </a>
        . Cards Against Humanity® writing is{" "}
        <a
          className="underline"
          href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
        >
          CC BY-NC-SA 4.0
        </a>
        .
      </span>
    </footer>
  )
}

function phaseLabel(room: RoomView) {
  if (room.phase === "submitting") return "Pick a card"
  if (room.phase === "judging")
    return room.settings.mode === "czar" ? "Czar is choosing" : "Vote now"
  if (room.phase === "finished") return "Game over"
  return "Round complete"
}

function formatCard(text: string) {
  return text.replaceAll("**", "").replaceAll("_", "________")
}

function lines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

function prompts(value: string) {
  return lines(value).map((text) => ({
    text,
    pick: Math.min(3, Math.max(1, (text.match(/_/g) ?? []).length)),
  }))
}

function saveToken(code: string, token: string) {
  localStorage.setItem(`room:${code}`, token)
}

function readToken(code: string) {
  return localStorage.getItem(`room:${code}`)
}

function removeToken(code: string) {
  localStorage.removeItem(`room:${code}`)
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  const body = (await response.json()) as T & { error?: string }
  if (!response.ok) throw new Error(body.error ?? "Request failed.")
  return body
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong."
}
