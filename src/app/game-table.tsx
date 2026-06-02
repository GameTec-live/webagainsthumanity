import * as React from "react"
import { motion } from "motion/react"
import {
  ChevronRight,
  Crown,
  LoaderCircle,
  RotateCcw,
  Trophy,
  Users,
  X,
} from "lucide-react"

import type { RoomView } from "@/game"
import type { SendCommand } from "@/app/types"
import { formatCard, phaseLabel } from "@/app/data"
import { Deadline } from "@/app/shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export function GameTable({
  room,
  send,
}: {
  room: RoomView
  send: SendCommand
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
    <div className="py-5">
      <section className="min-w-0 rounded-2xl border p-4 sm:p-5">
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
        <Scoreboard room={room} send={send} />
        <div className="mt-5 flex flex-col gap-5 md:flex-row">
          <PromptCard
            text={room.prompt?.text ?? ""}
            pick={room.prompt?.pick ?? 1}
          />
          <div className="min-w-0 flex-1">
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
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
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

function SubmissionGrid({ room, send }: { room: RoomView; send: SendCommand }) {
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
              <span className="mt-auto text-xs font-black tracking-wider text-muted-foreground uppercase">
                Submission {index + 1}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

function RoundResult({ room, send }: { room: RoomView; send: SendCommand }) {
  const winner = room.players.find((player) => player.id === room.winnerId)
  const isHost = room.me?.id === room.hostId
  const finished = room.phase === "finished"
  return (
    <div className="relative flex min-h-64 flex-col items-center justify-center overflow-hidden rounded-xl border p-6 text-center">
      {finished && <Confetti />}
      <Trophy className="relative size-8" />
      <h2 className="relative mt-4 text-2xl font-black">
        {finished
          ? "Game over."
          : winner
            ? `${winner.name} takes the point.`
            : "No winner this round."}
      </h2>
      {finished && (
        <p className="relative mt-2 text-sm text-muted-foreground">
          The table has spoken. Final scores are above.
        </p>
      )}
      {finished && <WinnerPodium room={room} />}
      {isHost && (
        <Button
          className="relative mt-5 rounded-md"
          onClick={() => send({ type: finished ? "rematch" : "next_round" })}
        >
          {finished ? <RotateCcw /> : <ChevronRight />}
          {finished ? " Back to lobby" : " Next round"}
        </Button>
      )}
    </div>
  )
}

const CONFETTI = [
  ["8%", "bg-red-400", -18],
  ["14%", "bg-yellow-300", 12],
  ["20%", "bg-blue-400", -8],
  ["28%", "bg-green-400", 18],
  ["35%", "bg-pink-400", -14],
  ["43%", "bg-purple-400", 10],
  ["51%", "bg-yellow-300", -20],
  ["59%", "bg-blue-400", 16],
  ["66%", "bg-red-400", -10],
  ["73%", "bg-green-400", 20],
  ["81%", "bg-pink-400", -16],
  ["88%", "bg-purple-400", 14],
  ["94%", "bg-yellow-300", -12],
] as const

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {CONFETTI.map(([left, color, drift], index) => (
        <motion.span
          aria-hidden
          className={`absolute -top-3 h-2.5 w-1.5 rounded-sm ${color}`}
          initial={{ x: 0, y: -12, rotate: 0, opacity: 0 }}
          animate={{
            x: [0, drift, -drift / 2],
            y: [-12, 240],
            rotate: [0, 180, 360],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            delay: index * 0.16,
            duration: 3.2 + (index % 3) * 0.4,
            repeat: Infinity,
            repeatDelay: 0.8,
            ease: "linear",
          }}
          style={{ left }}
          key={`${left}-${color}`}
        />
      ))}
    </div>
  )
}

function WinnerPodium({ room }: { room: RoomView }) {
  const winners = [...room.players]
    .sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt)
    .slice(0, 3)
  const podium = [
    { player: winners[1], place: 2, height: "h-16" },
    { player: winners[0], place: 1, height: "h-24" },
    { player: winners[2], place: 3, height: "h-12" },
  ]
  return (
    <div className="relative mt-6 flex w-full max-w-md items-end justify-center gap-2">
      {podium.map(
        ({ player, place, height }) =>
          player && (
            <div
              className="flex min-w-0 flex-1 flex-col items-center"
              key={player.id}
            >
              {place === 1 && <Crown className="mb-1 size-5" />}
              <p className="max-w-full truncate text-sm font-black">
                {player.name}
              </p>
              <p className="mb-2 text-xs text-muted-foreground">
                {player.score} {player.score === 1 ? "point" : "points"}
              </p>
              <div
                className={`flex w-full items-start justify-center rounded-t-md border bg-muted pt-3 text-xl font-black ${height}`}
              >
                {place}
              </div>
            </div>
          )
      )}
    </div>
  )
}

function Scoreboard({ room, send }: { room: RoomView; send: SendCommand }) {
  const isHost = room.me?.id === room.hostId
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-y py-2">
      <h2 className="mr-1 flex items-center gap-2 text-xs font-black tracking-wider uppercase">
        <Users className="size-3.5" /> Scores
      </h2>
      <div className="flex flex-wrap gap-1.5">
        {[...room.players]
          .sort((a, b) => b.score - a.score)
          .map((player) => (
            <div
              key={player.id}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2 py-1",
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
              <strong className="text-xs">{player.score}</strong>
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
    </div>
  )
}

function PromptCard({ text, pick }: { text: string; pick: number }) {
  return (
    <motion.div
      initial={{ rotate: -4, y: -12 }}
      animate={{ rotate: -2, y: 0 }}
      className="flex aspect-3/4 w-full max-w-48 shrink-0 flex-col rounded-xl bg-foreground p-5 text-background shadow-xl"
    >
      <p className="text-lg leading-tight font-black">{formatCard(text)}</p>
      <span className="mt-auto text-xs font-black tracking-wider uppercase">
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
        "relative aspect-3/4 min-w-0 rounded-xl border bg-card p-4 text-left shadow-sm transition",
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
