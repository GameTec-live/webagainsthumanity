import { describe, expect, it } from "vitest"

import {
  DEFAULT_SETTINGS,
  beginRound,
  castVote,
  chooseWinner,
  projectRoom,
  resolveVotes,
  startGame,
  submitCards,
  type RoomState,
} from "./index"

function room(overrides: Partial<RoomState> = {}): RoomState {
  const answers = Object.fromEntries(
    Array.from({ length: 40 }, (_, index) => [
      `a${index}`,
      { id: `a${index}`, text: `answer ${index}` },
    ])
  )
  return {
    version: 1,
    code: "ABC123",
    hostId: "p1",
    status: "lobby",
    phase: "lobby",
    settings: { ...DEFAULT_SETTINGS, handSize: 5, selectedPacks: ["test"] },
    players: ["p1", "p2", "p3"].map((id, index) => ({
      id,
      name: id,
      score: 0,
      hand: [],
      connected: true,
      joinedAt: index,
      disconnectedAt: null,
    })),
    prompt: null,
    answers,
    prompts: {
      q1: { id: "q1", text: "Why _?", pick: 1 },
      q2: { id: "q2", text: "_ and _.", pick: 2 },
      q3: { id: "q3", text: "Who _?", pick: 1 },
    },
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
    updatedAt: 0,
    expiresAt: 1000,
    ...overrides,
  }
}

describe("game engine", () => {
  it("starts with full hands and rotates the czar", () => {
    const state = room()
    startGame(state, 0, () => 0)
    expect(state.players.every((player) => player.hand.length === 5)).toBe(true)
    expect(state.judgeId).toBe("p1")
    beginRound(state, 1, () => 0)
    expect(state.judgeId).toBe("p2")
  })

  it("rejects an unusable deck before starting", () => {
    const state = room({ prompts: {} })
    expect(() => startGame(state, 0, () => 0)).toThrow(
      "Choose decks with prompt cards."
    )
  })

  it("keeps prompt card order and hides unrevealed submissions", () => {
    const state = room()
    startGame(state, 0, () => 0)
    state.prompt = state.prompts.q2
    const player = state.players[1]
    const cards = player.hand.slice(0, 2)
    submitCards(state, player.id, cards, 1, () => 0)
    const view = projectRoom(state, player.id)
    expect(state.submissions[0].cards).toEqual(cards)
    expect(view.submissions).toEqual([])
    expect(view.submissionProgress).toEqual({
      submitted: 1,
      total: 2,
      pendingPlayerName: "p3",
    })
    expect(view.hasSubmitted).toBe(true)
    expect(view).not.toHaveProperty("answers")
    expect(view).not.toHaveProperty("answerDeck")
  })

  it("awards a czar-selected point", () => {
    const state = room()
    startGame(state, 0, () => 0)
    submitCards(state, "p2", [state.players[1].hand[0]], 1, () => 0)
    submitCards(state, "p3", [state.players[2].hand[0]], 1, () => 0)
    const winnerId = state.submissions[0].playerId
    chooseWinner(state, "p1", state.submissions[0].id)
    expect(state.players.find((player) => player.id === winnerId)?.score).toBe(
      1
    )
    expect(state.phase).toBe("result")
  })

  it("resolves democratic vote ties with the supplied random source", () => {
    const state = room()
    state.settings.mode = "democracy"
    startGame(state, 0, () => 0)
    state.players.forEach((player) =>
      submitCards(state, player.id, [player.hand[0]], 1, () => 0)
    )
    castVote(
      state,
      "p1",
      state.submissions.find((entry) => entry.playerId === "p2")!.id
    )
    castVote(
      state,
      "p2",
      state.submissions.find((entry) => entry.playerId === "p1")!.id
    )
    resolveVotes(state, 2, () => 0)
    expect(state.winnerId).toBeTruthy()
    expect(state.phase).toBe("result")
  })
})
