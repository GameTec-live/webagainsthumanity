export type GameMode = "czar" | "democracy"
export type EndCondition = "points" | "rounds"
export type RoomStatus = "lobby" | "playing" | "finished"
export type GamePhase =
  | "lobby"
  | "submitting"
  | "judging"
  | "result"
  | "finished"

export type AnswerCard = { id: string; text: string }
export type PromptCard = { id: string; text: string; pick: number }
export type PackSummary = {
  id: string
  name: string
  description: string
  official: boolean
  whiteCount: number
  blackCount: number
}

export type GameSettings = {
  selectedPacks: string[]
  customAnswers: string[]
  customPrompts: Array<{ text: string; pick: number }>
  mode: GameMode
  rando: boolean
  playerCap: number
  handSize: number
  endCondition: EndCondition
  target: number
  submitTimerSeconds: number | null
  judgeTimerSeconds: number | null
}

export type Player = {
  id: string
  name: string
  score: number
  hand: string[]
  connected: boolean
  joinedAt: number
  disconnectedAt: number | null
}

export type Submission = {
  id: string
  playerId: string
  cards: string[]
  votes: number
}

export type RoomState = {
  version: 1
  code: string
  hostId: string
  status: RoomStatus
  phase: GamePhase
  settings: GameSettings
  players: Player[]
  prompt: PromptCard | null
  answers: Record<string, AnswerCard>
  prompts: Record<string, PromptCard>
  answerDeck: string[]
  promptDeck: string[]
  answerDiscard: string[]
  promptDiscard: string[]
  judgeId: string | null
  submissions: Submission[]
  votes: Record<string, string>
  winnerId: string | null
  round: number
  deadline: number | null
  updatedAt: number
  expiresAt: number
}

export type PublicPlayer = Omit<Player, "hand"> & { cardCount: number }

export type RoomView = Omit<
  RoomState,
  | "players"
  | "answers"
  | "prompts"
  | "answerDeck"
  | "promptDeck"
  | "answerDiscard"
  | "promptDiscard"
  | "submissions"
  | "votes"
> & {
  players: PublicPlayer[]
  me: (PublicPlayer & { hand: AnswerCard[] }) | null
  submissions: Array<{
    id: string
    cards: AnswerCard[]
    votes: number | null
    playerId: string | null
  }>
  hasVoted: boolean
  hasSubmitted: boolean
  spectator: boolean
}

export type ClientCommand =
  | { type: "settings"; settings: GameSettings }
  | { type: "start" }
  | { type: "submit"; cardIds: string[] }
  | { type: "choose"; submissionId: string }
  | { type: "vote"; submissionId: string }
  | { type: "next_round" }
  | { type: "remove_player"; playerId: string }
  | { type: "skip" }
  | { type: "rematch" }

export type ServerMessage =
  | { type: "snapshot"; room: RoomView }
  | { type: "error"; message: string }
  | { type: "removed"; message: string }

export const DEFAULT_SETTINGS: GameSettings = {
  selectedPacks: [],
  customAnswers: [],
  customPrompts: [],
  mode: "czar",
  rando: false,
  playerCap: 10,
  handSize: 10,
  endCondition: "points",
  target: 7,
  submitTimerSeconds: null,
  judgeTimerSeconds: null,
}

export function validateSettings(settings: GameSettings) {
  if (settings.playerCap < 3 || settings.playerCap > 12) {
    throw new Error("Player cap must be between 3 and 12.")
  }
  if (settings.handSize < 5 || settings.handSize > 15) {
    throw new Error("Hand size must be between 5 and 15.")
  }
  const maxTarget = settings.endCondition === "rounds" ? 30 : 20
  if (settings.target < 1 || settings.target > maxTarget) {
    throw new Error(`Target must be between 1 and ${maxTarget}.`)
  }
  for (const timer of [
    settings.submitTimerSeconds,
    settings.judgeTimerSeconds,
  ]) {
    if (timer !== null && (timer < 30 || timer > 300)) {
      throw new Error("Timers must be between 30 and 300 seconds.")
    }
  }
  if (
    settings.customAnswers.length > 100 ||
    settings.customPrompts.length > 100
  ) {
    throw new Error("A room may contain up to 100 custom cards of each type.")
  }
  if (
    settings.customAnswers.some(
      (text) => text.trim().length < 1 || text.length > 240
    ) ||
    settings.customPrompts.some(
      ({ text, pick }) =>
        text.trim().length < 1 || text.length > 240 || pick < 1 || pick > 3
    )
  ) {
    throw new Error(
      "Custom cards must contain 1 to 240 characters and prompts must pick 1 to 3 cards."
    )
  }
}

export function shuffle<T>(items: T[], random = Math.random) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

function draw(
  deck: string[],
  discard: string[],
  amount: number,
  random = Math.random
) {
  const cards: string[] = []
  while (cards.length < amount) {
    if (deck.length === 0) {
      deck.push(...shuffle(discard.splice(0), random))
    }
    const card = deck.pop()
    if (!card) break
    cards.push(card)
  }
  return cards
}

export function startGame(
  room: RoomState,
  now = Date.now(),
  random = Math.random
) {
  if (room.status !== "lobby") throw new Error("The game has already started.")
  if (room.players.length < 3)
    throw new Error("At least 3 players are required.")
  validateSettings(room.settings)
  if (Object.keys(room.answers).length < room.settings.handSize * 3) {
    throw new Error("Choose decks with more answer cards.")
  }
  if (Object.keys(room.prompts).length === 0) {
    throw new Error("Choose decks with prompt cards.")
  }
  room.status = "playing"
  room.answerDeck = shuffle(Object.keys(room.answers), random)
  room.promptDeck = shuffle(Object.keys(room.prompts), random)
  room.answerDiscard = []
  room.promptDiscard = []
  room.players.forEach((player) => {
    player.score = 0
    player.hand = draw(
      room.answerDeck,
      room.answerDiscard,
      room.settings.handSize,
      random
    )
  })
  room.round = 0
  beginRound(room, now, random)
}

export function beginRound(
  room: RoomState,
  now = Date.now(),
  random = Math.random
) {
  if (room.prompt) room.promptDiscard.push(room.prompt.id)
  room.submissions
    .filter((submission) => submission.playerId === "rando")
    .forEach((submission) => room.answerDiscard.push(...submission.cards))
  const promptId = draw(room.promptDeck, room.promptDiscard, 1, random)[0]
  if (!promptId)
    throw new Error("The selected packs do not contain prompt cards.")
  room.round += 1
  room.phase = "submitting"
  room.prompt = room.prompts[promptId]
  room.submissions = []
  room.votes = {}
  room.winnerId = null
  const connected = room.players.filter((player) => player.connected)
  room.judgeId =
    room.settings.mode === "czar"
      ? (connected[(room.round - 1) % connected.length]?.id ?? null)
      : null
  room.deadline = deadline(now, room.settings.submitTimerSeconds)
  room.updatedAt = now
}

export function submitCards(
  room: RoomState,
  playerId: string,
  cardIds: string[],
  now = Date.now(),
  random = Math.random
) {
  if (room.phase !== "submitting" || !room.prompt) {
    throw new Error("Cards cannot be submitted right now.")
  }
  if (room.judgeId === playerId)
    throw new Error("The card czar does not submit.")
  const player = requiredPlayer(room, playerId)
  if (
    cardIds.length !== room.prompt.pick ||
    new Set(cardIds).size !== cardIds.length
  ) {
    throw new Error(`Choose exactly ${room.prompt.pick} card(s).`)
  }
  if (room.submissions.some((entry) => entry.playerId === playerId)) {
    throw new Error("You have already submitted.")
  }
  if (!cardIds.every((cardId) => player.hand.includes(cardId))) {
    throw new Error("One of those cards is not in your hand.")
  }
  player.hand = player.hand.filter((card) => !cardIds.includes(card))
  room.answerDiscard.push(...cardIds)
  room.submissions.push({
    id: makeId("submission"),
    playerId,
    cards: cardIds,
    votes: 0,
  })
  player.hand.push(
    ...draw(room.answerDeck, room.answerDiscard, cardIds.length, random)
  )
  if (hasAllSubmissions(room)) revealSubmissions(room, now, random)
}

export function revealSubmissions(
  room: RoomState,
  now = Date.now(),
  random = Math.random
) {
  if (room.phase !== "submitting") return
  if (room.settings.rando && room.prompt) {
    room.submissions.push({
      id: makeId("rando"),
      playerId: "rando",
      cards: draw(
        room.answerDeck,
        room.answerDiscard,
        room.prompt.pick,
        random
      ),
      votes: 0,
    })
  }
  room.submissions = shuffle(room.submissions, random)
  if (room.submissions.length === 0) {
    finishRound(room, null, now)
    return
  }
  room.phase = "judging"
  room.deadline = deadline(now, room.settings.judgeTimerSeconds)
  room.updatedAt = now
}

export function chooseWinner(
  room: RoomState,
  actorId: string,
  submissionId: string
) {
  if (room.phase !== "judging") throw new Error("There is nothing to judge.")
  if (room.settings.mode !== "czar" || room.judgeId !== actorId) {
    throw new Error("Only the card czar can choose the winner.")
  }
  const submission = requiredSubmission(room, submissionId)
  finishRound(room, submission.playerId)
}

export function castVote(
  room: RoomState,
  playerId: string,
  submissionId: string
) {
  if (room.phase !== "judging" || room.settings.mode !== "democracy") {
    throw new Error("Voting is not open.")
  }
  const submission = requiredSubmission(room, submissionId)
  if (submission.playerId === playerId)
    throw new Error("You cannot vote for yourself.")
  requiredPlayer(room, playerId)
  room.votes[playerId] = submissionId
  room.submissions.forEach((entry) => {
    entry.votes = Object.values(room.votes).filter(
      (id) => id === entry.id
    ).length
  })
  if (
    room.players
      .filter((player) => player.connected)
      .every((player) => room.votes[player.id])
  ) {
    resolveVotes(room)
  }
}

export function resolveVotes(
  room: RoomState,
  now = Date.now(),
  random = Math.random
) {
  const highest = Math.max(...room.submissions.map((entry) => entry.votes), 0)
  const tied = room.submissions.filter((entry) => entry.votes === highest)
  const winner = tied[Math.floor(random() * tied.length)]
  finishRound(room, winner?.playerId ?? null, now)
}

export function finishRound(
  room: RoomState,
  winnerId: string | null,
  now = Date.now()
) {
  room.winnerId = winnerId
  const winner = room.players.find((player) => player.id === winnerId)
  if (winner) winner.score += 1
  const reachedTarget =
    room.settings.endCondition === "points"
      ? Boolean(winner && winner.score >= room.settings.target)
      : room.round >= room.settings.target
  room.phase = reachedTarget ? "finished" : "result"
  room.status = reachedTarget ? "finished" : "playing"
  room.deadline = null
  room.updatedAt = now
}

export function expirePhase(
  room: RoomState,
  now = Date.now(),
  random = Math.random
) {
  if (!room.deadline || room.deadline > now) return
  if (room.phase === "submitting") {
    revealSubmissions(room, now, random)
  } else if (room.phase === "judging") {
    if (room.settings.mode === "democracy") resolveVotes(room, now, random)
    else {
      const winner =
        room.submissions[Math.floor(random() * room.submissions.length)]
      finishRound(room, winner?.playerId ?? null, now)
    }
  }
}

export function projectRoom(
  room: RoomState,
  viewerId: string | null,
  spectator = false
): RoomView {
  const players = room.players.map(({ hand, ...player }) => ({
    ...player,
    cardCount: hand.length,
  }))
  const me = players.find((player) => player.id === viewerId)
  const own = room.players.find((player) => player.id === viewerId)
  const revealed =
    room.phase === "judging" ||
    room.phase === "result" ||
    room.phase === "finished"
  return {
    version: room.version,
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    phase: room.phase,
    settings: room.settings,
    prompt: room.prompt,
    judgeId: room.judgeId,
    winnerId: room.winnerId,
    round: room.round,
    deadline: room.deadline,
    updatedAt: room.updatedAt,
    expiresAt: room.expiresAt,
    players,
    me:
      me && own
        ? {
            ...me,
            hand: own.hand.map((id) => room.answers[id]).filter(Boolean),
          }
        : null,
    submissions: revealed
      ? room.submissions.map((entry) => ({
          id: entry.id,
          cards: entry.cards.map((id) => room.answers[id]).filter(Boolean),
          votes: room.settings.mode === "democracy" ? entry.votes : null,
          playerId:
            room.phase === "result" || room.phase === "finished"
              ? entry.playerId
              : null,
        }))
      : [],
    hasVoted: viewerId !== null && Boolean(room.votes[viewerId]),
    hasSubmitted:
      viewerId !== null &&
      room.submissions.some((submission) => submission.playerId === viewerId),
    spectator,
  }
}

export function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`
}

function requiredPlayer(room: RoomState, playerId: string) {
  const player = room.players.find((entry) => entry.id === playerId)
  if (!player) throw new Error("Player not found.")
  return player
}

function requiredSubmission(room: RoomState, submissionId: string) {
  const submission = room.submissions.find((entry) => entry.id === submissionId)
  if (!submission) throw new Error("Submission not found.")
  return submission
}

function hasAllSubmissions(room: RoomState) {
  return room.players
    .filter((player) => player.connected && player.id !== room.judgeId)
    .every((player) =>
      room.submissions.some((entry) => entry.playerId === player.id)
    )
}

function deadline(now: number, seconds: number | null) {
  return seconds === null ? null : now + seconds * 1000
}
