import { describe, it, expect } from "vitest";
import { splitShots, referencesIn } from "@/lib/shotBreakdown";

const VISUAL = "SHOT 1 [00:00-00:04]: Close profile. The homeowner raises their gaze toward the Ceiling crack. SHOT 2 [00:04-00:07]: Cut to a roof-edge angle. Three Team members crouch toward the Roof damage, revealing the blocked Gutter. SHOT 3 [00:07-00:10]: The bearded Team member pulls sealant along the join. STYLE: Realistic spring daylight, 50mm lens feel.";

describe("splitShots", () => {
  it("pulls the shots apart and drops the style line", () => {
    const shots = splitShots(VISUAL);
    expect(shots.map((s) => s.number)).toEqual([1, 2, 3]);
    expect(shots[0].text).toMatch(/homeowner raises/);
    expect(shots[2].text).not.toMatch(/STYLE/);
  });
  it("returns nothing for a scene without shots", () => {
    expect(splitShots("A slow push in on the end card.")).toEqual([]);
    expect(splitShots("")).toEqual([]);
  });
});

describe("referencesIn", () => {
  const refs = [{ name: "Team" }, { name: "Roof" }, { name: "Gutter" }, { name: "Ceiling" }, { name: "Van" }];
  it("finds the references a shot names, whole words only", () => {
    const shots = splitShots(VISUAL);
    expect(referencesIn(shots[0].text, refs).map((r) => r.name)).toEqual(["Ceiling"]);
    expect(referencesIn(shots[1].text, refs).map((r) => r.name)).toEqual(["Team", "Roof", "Gutter"]);
    expect(referencesIn("The vanguard arrives", refs)).toEqual([]);
  });
});
