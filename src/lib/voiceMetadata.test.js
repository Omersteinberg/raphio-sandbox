import { describe, it, expect } from "vitest";
import { sortVoicesByRegion } from "./voiceMetadata";

const voice = (key, accent) => ({ key, accent });

const LIST = [
  voice("bella", "American"),
  voice("charlie", "Australian"),
  voice("george", "British"),
  voice("amelia", "Australian"),
  voice("roger", "American"),
];

const keys = (voices) => voices.map((v) => v.key);

describe("sortVoicesByRegion", () => {
  it("lifts voices with the caller's accent to the front", () => {
    expect(keys(sortVoicesByRegion(LIST, "Australian"))).toEqual([
      "charlie",
      "amelia",
      "bella",
      "george",
      "roger",
    ]);
  });

  it("preserves relative order within both partitions", () => {
    const sorted = sortVoicesByRegion(LIST, "American");
    // bella before roger (boosted), and charlie before george before amelia (rest).
    expect(keys(sorted)).toEqual(["bella", "roger", "charlie", "george", "amelia"]);
  });

  it("matches accent case-insensitively", () => {
    expect(keys(sortVoicesByRegion(LIST, "bRiTiSh"))[0]).toBe("george");
  });

  it("is a no-op when no accent is known", () => {
    expect(keys(sortVoicesByRegion(LIST, ""))).toEqual(keys(LIST));
    expect(keys(sortVoicesByRegion(LIST, null))).toEqual(keys(LIST));
    expect(keys(sortVoicesByRegion(LIST))).toEqual(keys(LIST));
  });

  it("leaves the list unchanged when no voice carries the accent", () => {
    expect(keys(sortVoicesByRegion(LIST, "Irish"))).toEqual(keys(LIST));
  });

  it("reads the accent off ElevenLabs labels when the flat field is absent", () => {
    const labelled = [
      { key: "bella", accent: "American" },
      { key: "orla", labels: { accent: "Irish" } },
    ];
    expect(keys(sortVoicesByRegion(labelled, "Irish"))).toEqual(["orla", "bella"]);
  });

  it("tolerates an empty list", () => {
    expect(sortVoicesByRegion([], "American")).toEqual([]);
  });
});
