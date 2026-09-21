import { describe, it, expect } from "vitest";
import {
  DEFAULT_TEST,
  actualDuration,
  cameraHeight,
  conditionsKey,
  eligible,
  outcome,
  roundScore,
  roundCount,
  selectionsAt,
  sequence,
  summarize,
  type SessionResult,
} from "../src/model";
import { SCENARIOS } from "../src/scenarios";
import { validSession, validSettings } from "../src/storage";
describe("training contract", () => {
  it("scores a nonempty subset without rewarding closed zones", () => {
    expect(outcome([1], [1, 2])).toBe("success");
    expect(outcome([1, 2], [1, 2])).toBe("success");
    expect(outcome([1, 9], [1, 2])).toBe("error");
    expect(outcome([], [1, 2])).toBe("skip");
  });
  it("always finishes whole rounds for every timing option", () => {
    for (const duration of [15, 30, 60])
      for (const exposure of [0.25, 0.5, 0.75, 1])
        for (const answer of [1, 2, 3, 5])
          for (const breakSeconds of [0, 0.5, 1, 2, 3]) {
            const s = {
              ...DEFAULT_TEST,
              duration,
              exposure,
              answer,
              breakSeconds,
            };
            expect(actualDuration(s)).toBeGreaterThanOrEqual(duration);
            expect(
              actualDuration(s) - (exposure + answer + (s.breakSeconds ?? 0)),
            ).toBeLessThan(duration);
          }
    expect(roundCount(DEFAULT_TEST)).toBe(9);
    expect(actualDuration(DEFAULT_TEST)).toBe(30.5);
    expect(
      actualDuration({ ...DEFAULT_TEST, exposure: 0.75, breakSeconds: 0 }),
    ).toBe(30.25);
  });
  it("has 48 identifiable scenes with blocks only near the net", () => {
    expect(SCENARIOS).toHaveLength(48);
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(48);
    expect(
      SCENARIOS.filter((s) => s.mode === "block" && s.view === "ground"),
    ).toHaveLength(12);
    expect(
      SCENARIOS.filter((s) => s.mode === "block" && s.view === "jump"),
    ).toHaveLength(12);
    expect(
      SCENARIOS.filter((s) => s.mode === "defense" && s.view === "ground"),
    ).toHaveLength(24);
    expect(
      SCENARIOS.filter((s) => s.mode === "defense" && s.view === "jump"),
    ).toHaveLength(0);
    for (const s of SCENARIOS) {
      expect(s.correct.length).toBeGreaterThan(0);
      expect(s.correct.every((z) => z >= 1 && z <= 9)).toBe(true);
      expect(s.veryWeak?.every((z) => s.correct.includes(z))).toBe(true);
      if (s.mode === "block") {
        expect(s.depth).toBe("near");
        expect(s.opponents[0]).toMatchObject({
          x: s.camera.x,
          pose: "block",
        });
      } else {
        expect(s.view).toBe("ground");
        expect(s.opponents.every((p) => p.pose !== "block")).toBe(true);
      }
    }
    for (const position of ["left", "center", "right"] as const)
      for (const depth of ["near", "middle", "far"] as const)
        expect(
          eligible(SCENARIOS, {
            ...DEFAULT_TEST,
            mode: "defense",
            views: ["ground"],
            positions: [position],
            depths: [depth],
          }).length,
        ).toBeGreaterThan(0);
  });
  it("uses line positions and only opens a deep diagonal against a far sideline defender", () => {
    expect(
      SCENARIOS.some((s) =>
        s.opponents.some((p) => Math.abs(p.x) >= 3.9 || p.z <= -7.9),
      ),
    ).toBe(true);
    const leftCross = SCENARIOS.filter(
      (s) =>
        s.mode === "defense" &&
        s.depth === "far" &&
        s.position === "left" &&
        s.correct.includes(9),
    );
    const rightCross = SCENARIOS.filter(
      (s) =>
        s.mode === "defense" &&
        s.depth === "far" &&
        s.position === "right" &&
        s.correct.includes(7),
    );
    expect(leftCross).not.toHaveLength(0);
    expect(rightCross).not.toHaveLength(0);
    expect(
      leftCross.every((s) =>
        s.opponents.some((p) => p.x <= -3.9 && p.z <= -6),
      ),
    ).toBe(true);
    expect(
      rightCross.every((s) =>
        s.opponents.some((p) => p.x >= 3.9 && p.z <= -6),
      ),
    ).toBe(true);
    for (const scenario of SCENARIOS)
      for (const [index, player] of scenario.opponents.entries())
        if (player.pose.startsWith("run")) {
          const other = scenario.opponents[index ? 0 : 1],
            third = 8 / 3,
            freeX =
              scenario.correct.reduce(
                (sum, zone) => sum + (((zone - 1) % 3) - 1) * third,
                0,
              ) / scenario.correct.length,
            expectedX =
              other.x < -third / 2
                ? third / 2
                : other.x > third / 2
                  ? -third / 2
                  : freeX < 0
                    ? -third
                    : freeX > 0
                      ? third
                      : player.x < 0
                        ? third
                        : -third;
          expect(player.target?.x).toBeCloseTo(expectedX);
          expect(player.target?.z).toBeCloseTo(-16 / 3);
        }
    expect(SCENARIOS[0].opponents[1].target).toEqual({
      x: 4 / 3,
      z: -16 / 3,
    });
    for (const scenario of SCENARIOS.slice(18, 21)) {
      expect(scenario.opponents[1].pose).toBe("runRight");
      expect(scenario.opponents[1].target?.z).toBeCloseTo(-16 / 3);
    }
  });
  it("rates catalogue situations 3 through 20 and scores a round from 0 to 2", () => {
    const expected = [
      { weak: [1, 3, 9], veryWeak: [6] },
      { weak: [1, 3, 9], veryWeak: [6] },
      { weak: [9, 6], veryWeak: [1] },
      { weak: [6, 5], veryWeak: [1] },
      { weak: [7, 4, 5], veryWeak: [3] },
      { weak: [5, 4], veryWeak: [3] },
      { weak: [1, 3, 7], veryWeak: [4] },
      { weak: [1, 3, 7], veryWeak: [4] },
      { weak: [], veryWeak: [4, 7, 1] },
      { weak: [], veryWeak: [4, 7, 1] },
      { weak: [6], veryWeak: [3] },
      { weak: [6, 2], veryWeak: [3] },
      { weak: [4, 6], veryWeak: [1, 3] },
      { weak: [4, 6, 7, 9], veryWeak: [1, 3] },
      { weak: [4, 5], veryWeak: [1] },
      { weak: [4, 5, 7], veryWeak: [1] },
      { weak: [6, 9], veryWeak: [3] },
      { weak: [], veryWeak: [3, 9, 6] },
    ];
    expected.forEach(({ weak, veryWeak }, index) => {
      const scenario = SCENARIOS[index + 2];
      expect(scenario.correct).toEqual([...weak, ...veryWeak]);
      expect(scenario.veryWeak).toEqual(veryWeak);
    });
    const scenario = SCENARIOS[2],
      result = (selected: number[], outcome: "success" | "error") => ({
        scenario,
        selected,
        events: [],
        firstMs: null,
        outcome,
      });
    expect(roundScore(result([1], "success"))).toBe(1);
    expect(roundScore(result([6], "success"))).toBe(2);
    expect(roundScore(result([1, 3, 6], "success"))).toBe(4);
    expect(roundScore(result([6, 2], "error"))).toBe(0);
    expect(
      summarize([
        result([1], "success"),
        result([6], "success"),
        result([], "error"),
      ]),
    ).toMatchObject({ score: 3, maxScore: 15 });
  });
  it("shuffles decks without duplicates until exhausted or adjacent repeats", () => {
    const pool = SCENARIOS.slice(0, 3),
      deck = sequence(pool, 30, () => 0.3);
    expect(deck).toHaveLength(30);
    for (let i = 0; i < 30; i += 3)
      expect(new Set(deck.slice(i, i + 3).map((s) => s.id)).size).toBe(3);
    expect(deck.every((s, i) => !i || s.id !== deck[i - 1].id)).toBe(true);
    expect(sequence([], 5)).toEqual([]);
    expect(sequence(pool.slice(0, 1), 4)).toHaveLength(4);
  });
  it("reconstructs exact selections, including deselection, at event boundaries", () => {
    const events = [
      { zone: 2, at: 100 },
      { zone: 3, at: 200 },
      { zone: 2, at: 350 },
    ];
    expect(selectionsAt(events, 99)).toEqual([]);
    expect(selectionsAt(events, 100)).toEqual([2]);
    expect(selectionsAt(events, 349)).toEqual([2, 3]);
    expect(selectionsAt(events, 350)).toEqual([3]);
  });
  it("uses height only for presentation, validates numeric limits and normalizes filters", () => {
    expect(cameraHeight(DEFAULT_TEST, "ground")).toBe(1.7);
    expect(cameraHeight(DEFAULT_TEST, "jump")).toBe(2.2);
    expect(validSettings(DEFAULT_TEST)).toBe(true);
    for (const eyes of [99, 211, NaN, 170.5])
      expect(validSettings({ ...DEFAULT_TEST, eyes })).toBe(false);
    expect(validSettings({ ...DEFAULT_TEST, views: [] })).toBe(false);
    expect(validSettings({ ...DEFAULT_TEST, net: 261 })).toBe(false);
    expect(conditionsKey(DEFAULT_TEST)).toBe(
      conditionsKey({
        ...DEFAULT_TEST,
        positions: [...DEFAULT_TEST.positions].reverse(),
      }),
    );
    expect(conditionsKey(DEFAULT_TEST)).not.toBe(
      conditionsKey({ ...DEFAULT_TEST, net: 224 }),
    );
  });
  it("validates complete persisted replays and calculates median without skips", () => {
    const rounds = sequence(SCENARIOS, 12).map((scenario, i) => {
      const selected = i === 0 ? [] : [scenario.correct[0]],
        events = i === 0 ? [] : [{ at: i * 100, zone: scenario.correct[0] }];
      return {
        scenario,
        selected,
        events,
        firstMs: events[0]?.at ?? null,
        outcome: outcome(selected, scenario.correct),
      };
    });
    const session: SessionResult = {
      id: "test",
      date: new Date().toISOString(),
      settings: { ...DEFAULT_TEST, breakSeconds: 0 },
      rounds,
    };
    expect(validSession(session)).toBe(true);
    const { breakSeconds, ...legacy } = session.settings;
    expect(validSession({ ...session, settings: legacy })).toBe(true);
    expect(conditionsKey(legacy)).toBe(conditionsKey(session.settings));
    expect(validSettings({ ...session.settings, breakSeconds: -1 })).toBe(
      false,
    );
    expect(summarize(rounds)).toMatchObject({
      success: 11,
      skip: 1,
      median: 600,
    });
    expect(validSession({ ...session, rounds: rounds.slice(1) })).toBe(false);
    expect(
      validSession({
        ...session,
        rounds: rounds.map((r, i) =>
          i === 1 ? { ...r, events: [{ at: 3000, zone: 1 }] } : r,
        ),
      }),
    ).toBe(false);
    expect(summarize([]).median).toBeNull();
  });
});
