import { describe, expect, it } from "vitest"

import { parseCustomPack } from "./data"

describe("parseCustomPack", () => {
  it("imports strings and infers black card picks from blanks", () => {
    expect(
      parseCustomPack(
        JSON.stringify({
          name: "Office pack",
          white: ["A status meeting."],
          black: ["_ and _.", { text: "Why _?", pick: 3 }],
        }),
        "fallback.json"
      )
    ).toEqual({
      name: "Office pack",
      white: ["A status meeting."],
      black: [
        { text: "_ and _.", pick: 2 },
        { text: "Why _?", pick: 3 },
      ],
    })
  })

  it("uses the file name when the pack has no name", () => {
    expect(
      parseCustomPack('{"white":["answer"],"black":["prompt"]}', "pack.json")
        .name
    ).toBe("pack.json")
  })

  it("rejects malformed cards", () => {
    expect(() =>
      parseCustomPack('{"white":[1],"black":[]}', "pack.json")
    ).toThrow("Every white card must be a string.")
  })
})
