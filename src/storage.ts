import {
  DEFAULT_PREFS,
  DEFAULT_TEST,
  outcome,
  roundCount,
  selectionsAt,
  type Preferences,
  type TestSettings,
  type SessionResult,
  type Scenario,
} from "./model";
export const SETTINGS_KEY = "beach-read.settings.v1",
  HISTORY_KEY = "beach-read.history.v1";
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const number = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const integer = (v: unknown, min: number, max: number) =>
  number(v, min, max) && Number.isInteger(v);
const list = (v: unknown, allowed: readonly unknown[]) =>
  Array.isArray(v) &&
  v.length > 0 &&
  v.length <= allowed.length &&
  new Set(v).size === v.length &&
  v.every((x) => allowed.includes(x));
export function validSettings(v: unknown): v is TestSettings {
  return (
    object(v) &&
    [15, 30, 60].includes(v.duration as number) &&
    [0.25, 0.5, 0.75, 1].includes(v.exposure as number) &&
    [1, 2, 3, 5].includes(v.answer as number) &&
    (v.breakSeconds === undefined ||
      [0, 0.5, 1, 2, 3].includes(v.breakSeconds as number)) &&
    ["all", "block", "defense"].includes(v.mode as string) &&
    list(v.views, ["ground", "jump"]) &&
    list(v.positions, ["left", "center", "right"]) &&
    list(v.depths, ["near", "middle", "far"]) &&
    integer(v.eyes, 100, 210) &&
    integer(v.jump, 0, 120) &&
    integer(v.net, 180, 260)
  );
}
function validPrefs(v: unknown): v is Preferences {
  return (
    object(v) &&
    ["cue", "click", "timer", "reduceMotion"].every(
      (k) => typeof v[k] === "boolean",
    ) &&
    integer(v.volume, 0, 100)
  );
}
function validScenario(v: unknown): v is Scenario {
  const player = (p: unknown) =>
    object(p) &&
    number(p.x, -4, 4) &&
    number(p.z, -8, 8) &&
    ["ready", "runLeft", "runRight", "block"].includes(p.pose as string) &&
    (p.target === undefined ||
      (object(p.target) &&
        number(p.target.x, -4, 4) &&
        number(p.target.z, -8, 0)));
  return (
    object(v) &&
    typeof v.id === "string" &&
    typeof v.title === "string" &&
    typeof v.explanation === "string" &&
    ["block", "defense"].includes(v.mode as string) &&
    ["ground", "jump"].includes(v.view as string) &&
    ["left", "center", "right"].includes(v.position as string) &&
    ["near", "middle", "far"].includes(v.depth as string) &&
    object(v.camera) &&
    number(v.camera.x, -4, 4) &&
    number(v.camera.z, 0.1, 8) &&
    Array.isArray(v.opponents) &&
    v.opponents.length === 2 &&
    v.opponents.every(player) &&
    player(v.partner) &&
    list(v.correct, [1, 2, 3, 4, 5, 6, 7, 8, 9]) &&
    (v.veryWeak === undefined ||
      (Array.isArray(v.veryWeak) &&
        v.veryWeak.length <= 9 &&
        new Set(v.veryWeak).size === v.veryWeak.length &&
        v.veryWeak.every(
          (zone) =>
            integer(zone, 1, 9) && (v.correct as unknown[]).includes(zone),
        )))
  );
}
export function validSession(v: unknown): v is SessionResult {
  if (
    !object(v) ||
    typeof v.id !== "string" ||
    typeof v.date !== "string" ||
    !Number.isFinite(Date.parse(v.date)) ||
    !validSettings(v.settings) ||
    !Array.isArray(v.rounds) ||
    v.rounds.length !== roundCount(v.settings)
  )
    return false;
  const answerMs = v.settings.answer * 1000;
  return v.rounds.every((r) => {
    if (
      !object(r) ||
      !validScenario(r.scenario) ||
      !Array.isArray(r.selected) ||
      !r.selected.every((z) => integer(z, 1, 9)) ||
      new Set(r.selected).size !== r.selected.length ||
      !Array.isArray(r.events) ||
      r.events.length > 2000
    )
      return false;
    let previous = -1;
    for (const e of r.events) {
      if (
        !object(e) ||
        !number(e.at, 0, answerMs) ||
        !integer(e.zone, 1, 9) ||
        (e.at as number) < previous
      )
        return false;
      previous = e.at as number;
    }
    const events = r.events as { at: number; zone: number }[];
    return (
      r.firstMs === (events[0]?.at ?? null) &&
      r.outcome === outcome(r.selected as number[], r.scenario.correct) &&
      JSON.stringify([...r.selected].sort()) ===
        JSON.stringify(selectionsAt(events, answerMs).sort())
    );
  });
}
export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw)
      return {
        test: structuredClone(DEFAULT_TEST),
        prefs: { ...DEFAULT_PREFS },
        error: "",
      };
    const v: unknown = JSON.parse(raw);
    if (
      !object(v) ||
      v.version !== 1 ||
      !validSettings(v.test) ||
      !validPrefs(v.prefs)
    )
      throw Error();
    return { test: { ...DEFAULT_TEST, ...v.test }, prefs: v.prefs, error: "" };
  } catch {
    return {
      test: structuredClone(DEFAULT_TEST),
      prefs: { ...DEFAULT_PREFS },
      error:
        "Не удалось прочитать настройки. Используются исходные значения; сохранённые данные не перезаписаны.",
    };
  }
}
export function loadHistory(): { sessions: SessionResult[]; error: string } {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return { sessions: [], error: "" };
    const v: unknown = JSON.parse(raw);
    if (
      !object(v) ||
      v.version !== 1 ||
      !Array.isArray(v.sessions) ||
      !v.sessions.every(validSession)
    )
      throw Error();
    return { sessions: v.sessions, error: "" };
  } catch {
    return {
      sessions: [],
      error:
        "История недоступна или повреждена. Она не перезаписана. Текущий результат можно скачать.",
    };
  }
}
export function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return "";
  } catch {
    return "Не удалось сохранить данные на устройстве. Возможно, хранилище заполнено или запрещено браузером.";
  }
}
