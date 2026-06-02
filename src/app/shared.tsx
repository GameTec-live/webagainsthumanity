import * as React from "react"
import { motion } from "motion/react"
import {
  Check,
  Copy,
  LoaderCircle,
  Share2,
  Timer,
  Wifi,
  WifiOff,
  X,
} from "lucide-react"

import type { RoomView } from "@/game"
import type { Connection } from "@/app/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function Header() {
  return (
    <header className="flex items-center justify-between">
      <button
        className="text-sm font-black tracking-tight"
        onClick={() => location.assign("/")}
      >
        Web Against Humanity
      </button>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-5 py-6 text-xs leading-relaxed text-muted-foreground sm:px-8">
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

export function RoomBar({
  room,
  connection,
}: {
  room: RoomView
  connection: Connection
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y py-3">
      <div className="flex items-center gap-2">
        <RoomCode code={room.code} />
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
      <Invite code={room.code} />
    </div>
  )
}

function RoomCode({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false)
  async function copy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }
  return (
    <button
      className="flex items-center gap-2 text-left"
      title="Copy room code"
      onClick={copy}
    >
      <span>
        <span className="block text-xs font-bold tracking-widest text-muted-foreground uppercase">
          Room code
        </span>
        <strong className="font-mono text-xl tracking-widest">{code}</strong>
      </span>
      {copied ? (
        <Check className="size-4 text-muted-foreground" />
      ) : (
        <Copy className="size-4 text-muted-foreground" />
      )}
    </button>
  )
}

export function Invite({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false)
  const timeout = React.useRef<number>(undefined)
  React.useEffect(() => () => window.clearTimeout(timeout.current), [])
  async function copy() {
    await navigator.clipboard.writeText(`${location.origin}/room/${code}`)
    setCopied(true)
    window.clearTimeout(timeout.current)
    timeout.current = window.setTimeout(() => setCopied(false), 1600)
  }
  return (
    <div className="relative">
      <Button variant="outline" className="h-9 rounded-md px-3" onClick={copy}>
        {copied ? <Check /> : <Share2 />}
        {copied ? "Copied" : "Invite"}
      </Button>
    </div>
  )
}

export function Deadline({ deadline }: { deadline: number }) {
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

export function ErrorToast({
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

export function ErrorText({ children }: { children: string | null }) {
  return children ? (
    <p className="mt-3 text-xs font-semibold text-red-600">{children}</p>
  ) : null
}

export function LoadingTable({ connection }: { connection: Connection }) {
  return (
    <div className="flex min-h-[70svh] flex-col items-center justify-center">
      <LoaderCircle className="size-7 animate-spin" />
      <p className="mt-4 text-sm text-muted-foreground">
        Connecting to the table ({connection})...
      </p>
    </div>
  )
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="text-xs font-bold tracking-wider text-muted-foreground uppercase"
      onClick={onClick}
    >
      ← Back
    </button>
  )
}

export function PanelMotion({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}
