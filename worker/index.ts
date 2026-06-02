import { DurableObject } from "cloudflare:workers"
import {
  beginRound,
  castVote,
  chooseWinner,
  expirePhase,
  finishRound,
  makeId,
  projectRoom,
  resolveVotes,
  revealSubmissions,
  startGame,
  submitCards,
  validateSettings,
  type AnswerCard,
  type ClientCommand,
  type GameSettings,
  type PackSummary,
  type PromptCard,
  type RoomState,
  type ServerMessage,
} from "@/game"

const DECK_URL =
  "https://raw.githubusercontent.com/crhallberg/json-against-humanity/latest/cah-all-compact.json"
const ROOM_TTL = 24 * 60 * 60 * 1000
const RECONNECT_GRACE = 15 * 60 * 1000
const TICKET_TTL = 30 * 1000
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

type Env = {
  ROOMS: DurableObjectNamespace<GameRoom>
}

type CompactPack = {
  name: string
  description?: string
  official?: boolean
  white: number[]
  black: number[]
}

type CompactDeck = {
  white: string[]
  black: Array<{ text: string; pick?: number }>
  packs: Record<string, CompactPack>
}

type Session = { playerId: string | null; spectator: boolean; name: string }
type SocketAttachment = Session & { token: string }
type CreateBody = { name: string; settings: GameSettings }
type JoinBody = { name: string }

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith("/api/"))
      return new Response("Not found", { status: 404 })
    try {
      if (request.method === "GET" && url.pathname === "/api/decks") {
        const deck = await getCompactDeck()
        return json({ packs: summarizePacks(deck) })
      }
      if (request.method === "POST" && url.pathname === "/api/rooms") {
        const body = (await request.json()) as CreateBody
        validateName(body.name)
        validateSettings(body.settings)
        if (body.settings.selectedPacks.length === 0) {
          throw new Error("Choose at least one deck.")
        }
        const deck = await getCompactDeck()
        const cards = selectCards(deck, body.settings)
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const code = createCode()
          const stub = env.ROOMS.getByName(code)
          const result = await stub.create(
            code,
            body.name,
            body.settings,
            cards
          )
          if (result) return json(result, 201)
        }
        throw new Error("Could not allocate a room code. Please try again.")
      }
      const roomMatch = url.pathname.match(
        /^\/api\/rooms\/([A-Z0-9]{6})(?:\/(join|ws-ticket|ws|state))?$/
      )
      if (!roomMatch) return json({ error: "Not found." }, 404)
      const [, code, action = "state"] = roomMatch
      const stub = env.ROOMS.getByName(code)
      if (request.method === "POST" && action === "join") {
        const body = (await request.json()) as JoinBody
        validateName(body.name)
        return json(await stub.join(body.name))
      }
      if (request.method === "POST" && action === "ws-ticket") {
        return json(await stub.issueTicket(readToken(request)))
      }
      if (request.method === "GET" && action === "state") {
        return json(await stub.view(readToken(request)))
      }
      if (request.method === "GET" && action === "ws") {
        return stub.fetch(request)
      }
      return json({ error: "Not found." }, 404)
    } catch (error) {
      return json({ error: message(error) }, 400)
    }
  },
} satisfies ExportedHandler<Env>

export class GameRoom extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
  }

  async create(
    code: string,
    name: string,
    settings: GameSettings,
    cards: { answers: AnswerCard[]; prompts: PromptCard[] }
  ) {
    if (await this.ctx.storage.get("room")) return null
    const now = Date.now()
    const playerId = makeId("player")
    const token = makeId("session")
    const room: RoomState = {
      version: 1,
      code,
      hostId: playerId,
      status: "lobby",
      phase: "lobby",
      settings,
      players: [
        {
          id: playerId,
          name,
          score: 0,
          hand: [],
          connected: true,
          joinedAt: now,
          disconnectedAt: null,
        },
      ],
      prompt: null,
      answers: Object.fromEntries(cards.answers.map((card) => [card.id, card])),
      prompts: Object.fromEntries(cards.prompts.map((card) => [card.id, card])),
      answerDeck: [],
      promptDeck: [],
      answerDiscard: [],
      promptDiscard: [],
      judgeId: null,
      submissions: [],
      votes: {},
      winnerId: null,
      round: 0,
      deadline: null,
      updatedAt: now,
      expiresAt: now + ROOM_TTL,
    }
    await this.save(room)
    await this.ctx.storage.put(`session:${token}`, {
      playerId,
      spectator: false,
      name,
    } satisfies Session)
    return { code, token }
  }

  async join(name: string) {
    const room = await this.room()
    const token = makeId("session")
    if (room.status !== "lobby") {
      await this.ctx.storage.put(`session:${token}`, {
        playerId: null,
        spectator: true,
        name,
      } satisfies Session)
      return { code: room.code, token, spectator: true }
    }
    if (room.players.length >= room.settings.playerCap)
      throw new Error("This room is full.")
    const playerId = makeId("player")
    room.players.push({
      id: playerId,
      name,
      score: 0,
      hand: [],
      connected: true,
      joinedAt: Date.now(),
      disconnectedAt: null,
    })
    await this.ctx.storage.put(`session:${token}`, {
      playerId,
      spectator: false,
      name,
    } satisfies Session)
    await this.touchSaveBroadcast(room)
    return { code: room.code, token, spectator: false }
  }

  async issueTicket(token: string) {
    await this.session(token)
    const ticket = makeId("ticket")
    await this.ctx.storage.put(`ticket:${ticket}`, {
      token,
      expiresAt: Date.now() + TICKET_TTL,
    })
    return { ticket }
  }

  async view(token: string) {
    const room = await this.room()
    const session = await this.session(token)
    return projectRoom(room, session.playerId, session.spectator)
  }

  async fetch(request: Request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade.", { status: 426 })
    }
    const ticket = new URL(request.url).searchParams.get("ticket")
    if (!ticket) return new Response("Missing ticket.", { status: 401 })
    const ticketValue = await this.ctx.storage.get<{
      token: string
      expiresAt: number
    }>(`ticket:${ticket}`)
    if (!ticketValue || ticketValue.expiresAt < Date.now()) {
      return new Response("Invalid ticket.", { status: 401 })
    }
    await this.ctx.storage.delete(`ticket:${ticket}`)
    const session = await this.session(ticketValue.token)
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    this.ctx.acceptWebSocket(server)
    server.serializeAttachment({
      ...session,
      token: ticketValue.token,
    } satisfies SocketAttachment)
    if (session.playerId) {
      const room = await this.room()
      const player = room.players.find((entry) => entry.id === session.playerId)
      if (player) {
        player.connected = true
        player.disconnectedAt = null
        await this.touchSaveBroadcast(room)
      }
    }
    await this.sendSnapshot(server)
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    try {
      if (typeof raw !== "string")
        throw new Error("Binary messages are not supported.")
      const command = JSON.parse(raw) as ClientCommand
      const attachment = ws.deserializeAttachment() as SocketAttachment
      const room = await this.room()
      await this.applyCommand(room, attachment, command)
      await this.touchSaveBroadcast(room)
    } catch (error) {
      this.send(ws, { type: "error", message: message(error) })
    }
  }

  async webSocketClose(ws: WebSocket) {
    const attachment = ws.deserializeAttachment() as SocketAttachment | null
    if (!attachment?.playerId) return
    const room = await this.room()
    const player = room.players.find(
      (entry) => entry.id === attachment.playerId
    )
    if (!player) return
    player.connected = false
    player.disconnectedAt = Date.now()
    await this.touchSaveBroadcast(room)
  }

  async alarm() {
    const room = await this.room()
    const now = Date.now()
    if (room.expiresAt <= now) {
      await this.ctx.storage.deleteAll()
      this.ctx.getWebSockets().forEach((ws) => ws.close(1000, "Room expired."))
      return
    }
    room.players = room.players.filter((player) => {
      if (player.connected || player.disconnectedAt === null) return true
      return player.disconnectedAt + RECONNECT_GRACE > now
    })
    if (!room.players.some((player) => player.id === room.hostId))
      this.transferHost(room)
    expirePhase(room, now)
    await this.save(room)
    this.broadcast(room)
  }

  private async applyCommand(
    room: RoomState,
    actor: SocketAttachment,
    command: ClientCommand
  ) {
    if (!actor.playerId) throw new Error("Spectators cannot change the game.")
    switch (command.type) {
      case "settings":
        this.requireHost(room, actor.playerId)
        if (room.status !== "lobby")
          throw new Error("Settings are locked during play.")
        validateSettings(command.settings)
        if (
          command.settings.selectedPacks.join() !==
          room.settings.selectedPacks.join()
        ) {
          throw new Error("Deck selection is locked after room creation.")
        }
        room.settings = command.settings
        this.replaceCustomCards(room)
        return
      case "start":
        this.requireHost(room, actor.playerId)
        startGame(room)
        return
      case "submit":
        submitCards(room, actor.playerId, command.cardIds)
        return
      case "choose":
        chooseWinner(room, actor.playerId, command.submissionId)
        return
      case "vote":
        castVote(room, actor.playerId, command.submissionId)
        return
      case "next_round":
        this.requireHost(room, actor.playerId)
        if (room.phase !== "result")
          throw new Error("The round is not complete.")
        beginRound(room)
        return
      case "skip":
        this.requireHost(room, actor.playerId)
        if (room.phase === "submitting") revealSubmissions(room)
        else if (room.phase === "judging" && room.settings.mode === "democracy")
          resolveVotes(room)
        else if (room.phase === "judging") {
          finishRound(
            room,
            room.submissions[
              Math.floor(Math.random() * room.submissions.length)
            ]?.playerId ?? null
          )
        }
        return
      case "remove_player":
        this.requireHost(room, actor.playerId)
        if (command.playerId === room.hostId)
          throw new Error("The host cannot remove themselves.")
        room.players = room.players.filter(
          (player) => player.id !== command.playerId
        )
        return
      case "rematch":
        this.requireHost(room, actor.playerId)
        if (room.status !== "finished")
          throw new Error("The game has not finished.")
        room.status = "lobby"
        room.phase = "lobby"
        room.round = 0
        room.prompt = null
        room.submissions = []
        room.players.forEach((player) => {
          player.hand = []
          player.score = 0
        })
    }
  }

  private replaceCustomCards(room: RoomState) {
    Object.keys(room.answers)
      .filter((id) => id.startsWith("custom-answer:"))
      .forEach((id) => delete room.answers[id])
    Object.keys(room.prompts)
      .filter((id) => id.startsWith("custom-prompt:"))
      .forEach((id) => delete room.prompts[id])
    room.settings.customAnswers.forEach((text, index) => {
      room.answers[`custom-answer:${index}`] = {
        id: `custom-answer:${index}`,
        text,
      }
    })
    room.settings.customPrompts.forEach(({ text, pick }, index) => {
      room.prompts[`custom-prompt:${index}`] = {
        id: `custom-prompt:${index}`,
        text,
        pick,
      }
    })
  }

  private transferHost(room: RoomState) {
    room.hostId =
      [...room.players].sort(
        (a, b) =>
          Number(b.connected) - Number(a.connected) || a.joinedAt - b.joinedAt
      )[0]?.id ?? ""
  }

  private requireHost(room: RoomState, playerId: string) {
    if (room.hostId !== playerId) throw new Error("Only the host can do that.")
  }

  private async room() {
    const room = await this.ctx.storage.get<RoomState>("room")
    if (!room) throw new Error("Room not found.")
    return room
  }

  private async session(token: string) {
    const session = await this.ctx.storage.get<Session>(`session:${token}`)
    if (!session) throw new Error("Invalid room session.")
    return session
  }

  private async touchSaveBroadcast(room: RoomState) {
    room.updatedAt = Date.now()
    room.expiresAt = room.updatedAt + ROOM_TTL
    await this.save(room)
    this.broadcast(room)
  }

  private async save(room: RoomState) {
    await this.ctx.storage.put("room", room)
    const wakeAt = [
      room.expiresAt,
      room.deadline,
      ...room.players.map((player) =>
        player.disconnectedAt ? player.disconnectedAt + RECONNECT_GRACE : null
      ),
    ]
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b)[0]
    if (wakeAt) await this.ctx.storage.setAlarm(wakeAt)
  }

  private broadcast(room: RoomState) {
    this.ctx.getWebSockets().forEach((ws) => {
      const actor = ws.deserializeAttachment() as SocketAttachment
      this.send(ws, {
        type: "snapshot",
        room: projectRoom(room, actor.playerId, actor.spectator),
      })
    })
  }

  private async sendSnapshot(ws: WebSocket) {
    const actor = ws.deserializeAttachment() as SocketAttachment
    this.send(ws, { type: "snapshot", room: await this.view(actor.token) })
  }

  private send(ws: WebSocket, payload: ServerMessage) {
    ws.send(JSON.stringify(payload))
  }
}

async function getCompactDeck() {
  const request = new Request(DECK_URL, {
    cf: { cacheTtl: 86400, cacheEverything: true },
  })
  const response = await fetch(request)
  if (!response.ok) throw new Error("Deck catalog is temporarily unavailable.")
  return (await response.json()) as CompactDeck
}

function summarizePacks(deck: CompactDeck): PackSummary[] {
  return Object.entries(deck.packs)
    .map(([id, pack]) => ({
      id,
      name: pack.name,
      description: pack.description ?? "",
      official: Boolean(pack.official),
      whiteCount: pack.white.length,
      blackCount: pack.black.length,
    }))
    .sort(
      (a, b) =>
        Number(b.official) - Number(a.official) || a.name.localeCompare(b.name)
    )
}

function selectCards(deck: CompactDeck, settings: GameSettings) {
  const answerIds = new Set<number>()
  const promptIds = new Set<number>()
  settings.selectedPacks.forEach((packId) => {
    const pack = deck.packs[packId]
    if (!pack) throw new Error(`Deck "${packId}" was not found.`)
    pack.white.forEach((id) => answerIds.add(id))
    pack.black.forEach((id) => promptIds.add(id))
  })
  const answers = [...answerIds].map((id) => ({
    id: `answer:${id}`,
    text: deck.white[id],
  }))
  settings.customAnswers.forEach((text, index) => {
    answers.push({ id: `custom-answer:${index}`, text })
  })
  const prompts = [...promptIds].map((id) => ({
    id: `prompt:${id}`,
    text: deck.black[id].text,
    pick: deck.black[id].pick ?? 1,
  }))
  settings.customPrompts.forEach(({ text, pick }, index) => {
    prompts.push({ id: `custom-prompt:${index}`, text, pick })
  })
  if (answers.length < settings.handSize * 3)
    throw new Error("Choose decks with more answer cards.")
  if (prompts.length === 0) throw new Error("Choose decks with prompt cards.")
  return { answers, prompts }
}

function readToken(request: Request) {
  const value = request.headers.get("Authorization")
  if (!value?.startsWith("Bearer ")) throw new Error("Missing room session.")
  return value.slice("Bearer ".length)
}

function createCode() {
  return Array.from(
    { length: 6 },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  ).join("")
}

function validateName(value: string) {
  if (!value || value.trim().length < 2 || value.trim().length > 24) {
    throw new Error("Display name must contain 2 to 24 characters.")
  }
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong."
}

function json(value: unknown, status = 200) {
  return Response.json(value, { status })
}
