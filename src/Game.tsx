import { useEffect, useRef, useState } from "react";
import { CourtScene } from "./CourtScene";
import { ZoneBoard } from "./ui";
import { beep } from "./audio";
import {
  outcome,
  viewLabels,
  positionLabels,
  type Preferences,
  type Scenario,
  type SessionResult,
  type TestSettings,
  type RoundResult,
  type SelectionEvent,
} from "./model";
type Phase = "loading" | "countdown" | "scene" | "answer" | "break";
export function Game({
  deck,
  settings,
  prefs,
  onComplete,
  onAbort,
}: {
  deck: Scenario[];
  settings: TestSettings;
  prefs: Preferences;
  onComplete: (s: SessionResult) => void;
  onAbort: (message: string) => void;
}) {
  const [index, setIndex] = useState(0),
    [phase, setPhase] = useState<Phase>("loading"),
    [remaining, setRemaining] = useState(3),
    [selected, setSelected] = useState<number[]>([]);
  const answers = useRef<RoundResult[]>([]),
    events = useRef<SelectionEvent[]>([]),
    selection = useRef<number[]>([]),
    deadline = useRef(0),
    start = useRef(0),
    finished = useRef(false),
    first = useRef(true),
    phaseRef = useRef(phase),
    preparedId = useRef("");
  phaseRef.current = phase;
  const callbacks = useRef({ onComplete, onAbort });
  callbacks.current = { onComplete, onAbort };
  const sceneScenario =
    deck[phase === "answer" ? Math.min(index + 1, deck.length - 1) : index];
  const ready = () => {
    preparedId.current = sceneScenario.id;
    if (phaseRef.current !== "loading" || finished.current) return;
    if (first.current) {
      first.current = false;
      setPhase("countdown");
    } else setPhase("scene");
  };
  useEffect(() => {
    const hidden = () => {
      if (document.hidden && !finished.current) {
        finished.current = true;
        callbacks.current.onAbort(
          "Тест прерван: вкладка была скрыта. Результат не записан.",
        );
      }
    };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, []);
  useEffect(() => {
    if (phase === "loading") return;
    const duration =
      phase === "countdown"
        ? 3
        : phase === "scene"
          ? settings.exposure
          : phase === "break"
            ? (settings.breakSeconds ?? 0)
            : settings.answer;
    start.current = performance.now();
    deadline.current = start.current + duration * 1000;
    setRemaining(duration);
    if (phase === "scene") beep(prefs);
    let frame = 0;
    const tick = () => {
      if (finished.current) return;
      const left = Math.max(0, (deadline.current - performance.now()) / 1000);
      setRemaining(left);
      if (left > 0) {
        frame = requestAnimationFrame(tick);
        return;
      }
      if (phase === "countdown") setPhase("scene");
      else if (phase === "break") {
        setPhase(preparedId.current === deck[index].id ? "scene" : "loading");
      } else if (phase === "scene") {
        events.current = [];
        selection.current = [];
        setSelected([]);
        setPhase("answer");
      } else {
        const result: RoundResult = {
          scenario: deck[index],
          selected: [...selection.current],
          events: [...events.current],
          firstMs: events.current[0]?.at ?? null,
          outcome: outcome(selection.current, deck[index].correct),
        };
        answers.current.push(result);
        if (index + 1 === deck.length) {
          finished.current = true;
          callbacks.current.onComplete({
            id:
              globalThis.crypto?.randomUUID?.() ??
              `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            date: new Date().toISOString(),
            settings,
            rounds: answers.current,
          });
        } else {
          setIndex((i) => i + 1);
          setPhase(
            (settings.breakSeconds ?? 0) > 0
              ? "break"
              : preparedId.current === deck[index + 1].id
                ? "scene"
                : "loading",
          );
        }
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, index, deck, settings, prefs]);
  const toggle = (zone: number) => {
    const now = performance.now();
    if (phase !== "answer" || now >= deadline.current || finished.current)
      return;
    events.current.push({
      zone,
      at: Math.max(0, now - start.current),
    });
    selection.current = selection.current.includes(zone)
      ? selection.current.filter((x) => x !== zone)
      : [...selection.current, zone];
    setSelected([...selection.current]);
    beep(prefs, "click");
  };
  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!e.repeat && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        toggleRef.current(Number(e.key));
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const scenario = deck[index];
  return (
    <section className="game" aria-label="Тест">
      <div className="game-status">
        <span>
          ситуация <b>{String(index + 1).padStart(2, "0")}</b> / {deck.length}
        </span>
        <span>
          {viewLabels[scenario.view].toLowerCase()} ·{" "}
          {positionLabels[scenario.position].toLowerCase()}
        </span>
        <button
          onClick={() => {
            finished.current = true;
            onAbort("Тест остановлен. Результат не записан.");
          }}
        >
          Завершить
        </button>
      </div>
      <div className="game-title">
        <h1>
          {phase === "answer"
            ? "Где свободно?"
            : phase === "scene"
              ? "Читай защиту"
              : phase === "countdown"
                ? "Приготовься"
                : phase === "break"
                  ? "Перерыв"
                  : "Готовим поле"}
        </h1>
        {prefs.timer && phase !== "loading" && phase !== "break" && (
          <span className="phase-time" aria-label="Осталось секунд">
            {phase === "countdown"
              ? Math.ceil(remaining)
              : remaining.toFixed(1)}
            <small>с</small>
          </span>
        )}
      </div>
      <p className="game-instruction">
        {phase === "answer"
          ? "Отметь хотя бы одну слабую зону. Повторный выбор снимает отметку."
          : phase === "break"
            ? "Следующая ситуация появится после паузы."
            : "Запомни позиции соперников. Затем выбери свободные зоны."}
      </p>
      <div className="game-stage">
        <div
          className={`scene-layer ${phase === "scene" ? "visible" : ""}`}
          aria-hidden={phase !== "scene"}
        >
          <CourtScene
            scenario={sceneScenario}
            settings={settings}
            onReady={ready}
            onError={(m) => {
              if (!finished.current) {
                finished.current = true;
                onAbort(m);
              }
            }}
          />
        </div>
        {phase === "answer" && (
          <ZoneBoard selected={selected} onToggle={toggle} />
        )}
        {phase === "break" && (
          <div className="countdown break-countdown" role="status">
            <span>Приготовьтесь...</span>
            {prefs.timer && <p>{remaining.toFixed(1)} с</p>}
          </div>
        )}
        {(phase === "loading" || phase === "countdown") && (
          <div className="countdown" role="status">
            <span>
              {phase === "countdown" ? Math.ceil(remaining) : "· · ·"}
            </span>
            <p>
              {phase === "countdown" ? "смотри на поле" : "подготовка сцены"}
            </p>
          </div>
        )}
      </div>
      <div className="game-bottom">
        <span>
          <kbd>1</kbd> … <kbd>9</kbd> или нажатие на зону
        </span>
        <span>
          {phase === "answer"
            ? `${selected.length} выбрано`
            : `${settings.exposure} с на наблюдение`}
        </span>
      </div>
      <div
        className="session-progress"
        aria-label={`Пройдено ${index} из ${deck.length}`}
      >
        <span style={{ width: `${(index / deck.length) * 100}%` }} />
      </div>
    </section>
  );
}
