import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { ChevronRight, LoaderCircle, LogIn, Play, Search } from "lucide-react"

import { DEFAULT_SETTINGS, type GameSettings, type PackSummary } from "@/game"
import { api, message, saveToken } from "@/app/data"
import { BackButton, ErrorText, Header, PanelMotion } from "@/app/shared"
import { DeckRow, SettingsForm } from "@/app/settings"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

export function LandingPage() {
  const [view, setView] = React.useState<"start" | "create" | "join">("start")
  return (
    <main className="relative isolate flex flex-1 overflow-x-hidden lg:overflow-y-hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-5 sm:px-8">
        <Header />
        <div className="grid flex-1 items-center gap-12 py-8 lg:min-h-0 lg:grid-cols-5 lg:py-6">
          <section className="lg:col-span-3">
            <h1 className="max-w-3xl text-6xl leading-none font-black tracking-tighter sm:text-8xl">
              Bad cards.
              <br />
              Good company.
            </h1>
            <p className="mt-7 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              A fast, private, browser-based party game. Create a table, pick
              your decks, and invite the people who understand your worst jokes.
            </p>
          </section>
          <motion.section
            layout
            className="rounded-2xl border border-border bg-background/90 p-5 shadow-2xl shadow-black/10 backdrop-blur lg:col-span-2 lg:max-h-full lg:overflow-hidden"
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
      <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
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
  const [deckSearch, setDeckSearch] = React.useState("")
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
  const filteredPacks = packs.filter((pack) =>
    `${pack.name} ${pack.description}`
      .toLowerCase()
      .includes(deckSearch.trim().toLowerCase())
  )
  const selectPacks = (selectedPacks: string[]) =>
    setSettings((current) => ({ ...current, selectedPacks }))
  const basePacks = packs.filter((pack) =>
    /(?:^|\b)(?:base|main)(?:\b|$)/i.test(`${pack.id} ${pack.name}`)
  )
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
    <PanelMotion className="lg:flex lg:max-h-full lg:flex-col">
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
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Button
          size="xs"
          variant="outline"
          onClick={() => selectPacks(packs.map((pack) => pack.id))}
        >
          All
        </Button>
        <Button size="xs" variant="outline" onClick={() => selectPacks([])}>
          None
        </Button>
        <Button
          size="xs"
          variant="outline"
          onClick={() =>
            selectPacks(
              packs.filter((pack) => pack.official).map((pack) => pack.id)
            )
          }
        >
          Official only
        </Button>
        <Button
          size="xs"
          variant="outline"
          disabled={basePacks.length === 0}
          onClick={() => selectPacks(basePacks.map((pack) => pack.id))}
        >
          Base game
        </Button>
      </div>
      <label className="relative mt-3 block">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          value={deckSearch}
          placeholder="Search decks"
          onChange={(event) => setDeckSearch(event.target.value)}
        />
      </label>
      <div className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1 lg:min-h-0 lg:flex-1">
        {loading && packs.length === 0 ? (
          <LoaderCircle className="mx-auto my-8 size-5 animate-spin text-muted-foreground" />
        ) : (
          filteredPacks.map((pack) => (
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
        {!loading && filteredPacks.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No decks match that search.
          </p>
        )}
      </div>
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

export function JoinRoom({
  onBack,
  initialCode = "",
  initialError = null,
}: {
  onBack?: () => void
  initialCode?: string
  initialError?: string | null
}) {
  const [code, setCode] = React.useState(initialCode)
  const [name, setName] = React.useState("")
  const [error, setError] = React.useState<string | null>(initialError)
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
        className="mt-2 font-mono text-lg font-bold tracking-widest uppercase"
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
