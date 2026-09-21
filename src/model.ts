export type Mode = "all" | "block" | "defense";
export type View = "ground" | "jump";
export type Position = "left" | "center" | "right";
export type Depth = "near" | "middle" | "far";
export type Pose = "ready" | "runLeft" | "runRight" | "block";
export type Player = {
  x: number;
  z: number;
  pose: Pose;
  target?: { x: number; z: number };
};
export type Scenario = {
  id: string;
  title: string;
  mode: Exclude<Mode, "all">;
  view: View;
  position: Position;
  depth: Depth;
  camera: { x: number; z: number };
  opponents: [Player, Player];
  partner: Player;
  correct: number[];
  veryWeak?: number[];
  explanation: string;
};
export type TestSettings = {
  duration: number;
  exposure: number;
  answer: number;
  breakSeconds?: number;
  mode: Mode;
  views: View[];
  positions: Position[];
  depths: Depth[];
  eyes: number;
  jump: number;
  net: number;
};
export type Preferences = {
  cue: boolean;
  click: boolean;
  volume: number;
  timer: boolean;
  reduceMotion: boolean;
};
export type SelectionEvent = { at: number; zone: number };
export type RoundResult = {
  scenario: Scenario;
  selected: number[];
  events: SelectionEvent[];
  firstMs: number | null;
  outcome: "success" | "error" | "skip";
};
export type SessionResult = {
  id: string;
  date: string;
  settings: TestSettings;
  rounds: RoundResult[];
};
export const DEFAULT_TEST: TestSettings = {
  duration: 30,
  exposure: 0.5,
  answer: 2,
  breakSeconds: 1,
  mode: "all",
  views: ["ground", "jump"],
  positions: ["left", "center", "right"],
  depths: ["near", "middle", "far"],
  eyes: 170,
  jump: 50,
  net: 243,
};
export const DEFAULT_PREFS: Preferences = {
  cue: true,
  click: false,
  volume: 50,
  timer: true,
  reduceMotion: false,
};
export const modeLabels: Record<Mode, string> = {
  all: "Общий",
  block: "Против блока",
  defense: "Два защитника",
};
export const viewLabels: Record<View, string> = {
  ground: "С песка",
  jump: "В прыжке",
};
export const positionLabels: Record<Position, string> = {
  left: "Слева",
  center: "По центру",
  right: "Справа",
};
export const depthLabels: Record<Depth, string> = {
  near: "Ближе к сетке",
  middle: "Середина",
  far: "Глубина",
};
export const DISCLAIMER =
  "Оцениваем свободные зоны защиты. Возможность конкретного удара над сеткой и блоком не рассчитывается. Ситуации ещё не проверены тренером.";
export const roundCount = (s: TestSettings) =>
  Math.ceil(
    (s.duration + (s.breakSeconds ?? 0)) /
      (s.exposure + s.answer + (s.breakSeconds ?? 0)),
  );
export const actualDuration = (s: TestSettings) =>
  roundCount(s) * (s.exposure + s.answer) +
  (roundCount(s) - 1) * (s.breakSeconds ?? 0);
export const cameraHeight = (s: TestSettings, view: View) =>
  (s.eyes + (view === "jump" ? s.jump : 0)) / 100;
export function outcome(
  selected: number[],
  correct: number[],
): RoundResult["outcome"] {
  return selected.length === 0
    ? "skip"
    : selected.every((z) => correct.includes(z))
      ? "success"
      : "error";
}
export function zoneScore(scenario: Scenario, zone: number) {
  return (scenario.veryWeak ?? scenario.correct).includes(zone) ? 2 : 1;
}
export function roundScore(round: RoundResult) {
  if (round.outcome !== "success") return 0;
  return round.selected.reduce(
    (score, zone) => score + zoneScore(round.scenario, zone),
    0,
  );
}
export function summarize(rounds: RoundResult[]) {
  const success = rounds.filter((r) => r.outcome === "success").length;
  const skip = rounds.filter((r) => r.outcome === "skip").length;
  const times = rounds
    .flatMap((r) =>
      r.outcome === "skip" || r.firstMs === null ? [] : [r.firstMs],
    )
    .sort((a, b) => a - b);
  const mid = Math.floor(times.length / 2);
  return {
    success,
    skip,
    error: rounds.length - success - skip,
    score: rounds.reduce((sum, round) => sum + roundScore(round), 0),
    maxScore: rounds.reduce(
      (sum, round) =>
        sum +
        round.scenario.correct.reduce(
          (score, zone) => score + zoneScore(round.scenario, zone),
          0,
        ),
      0,
    ),
    accuracy: rounds.length ? Math.round((success / rounds.length) * 100) : 0,
    median: times.length
      ? (times[mid] + times[Math.floor((times.length - 1) / 2)]) / 2
      : null,
  };
}
export const conditionsKey = (s: TestSettings) =>
  JSON.stringify({
    ...DEFAULT_TEST,
    ...s,
    breakSeconds: s.breakSeconds ?? 0,
    views: [...s.views].sort(),
    positions: [...s.positions].sort(),
    depths: [...s.depths].sort(),
  });
export function eligible(scenarios: Scenario[], s: TestSettings) {
  return scenarios.filter(
    (x) =>
      (s.mode === "all" || x.mode === s.mode) &&
      s.views.includes(x.view) &&
      s.positions.includes(x.position) &&
      (x.view === "jump" ||
        (s.mode === "block" && x.mode === "block") ||
        s.depths.includes(x.depth)),
  );
}
export function sequence(
  pool: Scenario[],
  count: number,
  random = Math.random,
): Scenario[] {
  if (!pool.length) return [];
  const result: Scenario[] = [];
  while (result.length < count) {
    const deck = [...pool];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    if (deck.length > 1 && deck[0].id === result.at(-1)?.id)
      [deck[0], deck[1]] = [deck[1], deck[0]];
    result.push(...deck.slice(0, count - result.length));
  }
  return result;
}
export function selectionsAt(events: SelectionEvent[], elapsed: number) {
  const selected = new Set<number>();
  for (const e of events)
    if (e.at <= elapsed) {
      if (selected.has(e.zone)) selected.delete(e.zone);
      else selected.add(e.zone);
    }
  return [...selected].sort((a, b) => a - b);
}
