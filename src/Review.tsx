import { useEffect, useMemo, useRef, useState } from "react";
import { CourtScene } from "./CourtScene";
import { SCENARIOS } from "./scenarios";
import { Icon, ZoneBoard } from "./ui";
import {
  DISCLAIMER,
  eligible,
  selectionsAt,
  sequence,
  viewLabels,
  type SessionResult,
  type TestSettings,
} from "./model";
const ALL_ZONES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export function Review({
  session,
  settings,
  practice,
  allSituations = false,
  onClose,
}: {
  session?: SessionResult;
  settings: TestSettings;
  practice: boolean;
  allSituations?: boolean;
  onClose: () => void;
}) {
  const deck = useMemo(() => {
    if (allSituations) return SCENARIOS;
    if (!session) return [];
    if (!practice) return session.rounds.map((r) => r.scenario);
    const failed = session.rounds
      .filter((r) => r.outcome !== "success")
      .map((r) => r.scenario);
    return failed.length ? failed : sequence(eligible(SCENARIOS, settings), 12);
  }, [session, settings, practice, allSituations]);
  const [index, setIndex] = useState(0),
    [selected, setSelected] = useState<number[]>(
      allSituations ? ALL_ZONES : [],
    ),
    [revealed, setRevealed] = useState(allSituations),
    [showScene, setShowScene] = useState(true),
    [playing, setPlaying] = useState(false),
    [elapsed, setElapsed] = useState(0),
    [ready, setReady] = useState(false);
  const position = useRef(0);
  const workMs = (settings.exposure + settings.answer) * 1000;
  const total =
    workMs +
    (!practice && index < deck.length - 1
      ? (settings.breakSeconds ?? 0) * 1000
      : 0);
  useEffect(() => {
    if (!playing || !ready) return;
    const start = performance.now() - position.current;
    let frame = 0;
    const tick = () => {
      const value = Math.min(total, performance.now() - start);
      position.current = value;
      setElapsed(value);
      if (value >= total) {
        setPlaying(false);
        setRevealed(true);
      } else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, ready, total, index]);
  const move = (next: number) => {
    setIndex(next);
    setSelected(allSituations ? ALL_ZONES : []);
    setRevealed(allSituations);
    setShowScene(true);
    setPlaying(false);
    setReady(false);
    position.current = 0;
    setElapsed(0);
  };
  const toggle = (z: number) => {
    if (!practice || revealed || showScene) return;
    setSelected((s) => (s.includes(z) ? s.filter((x) => x !== z) : [...s, z]));
  };
  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        !e.repeat &&
        /^[1-9]$/.test(e.key) &&
        !(e.target instanceof HTMLInputElement)
      ) {
        e.preventDefault();
        toggleRef.current(Number(e.key));
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const scenario = deck[index],
    round = session?.rounds[index],
    veryWeak = scenario.veryWeak ?? scenario.correct,
    weak = scenario.correct.filter((zone) => !veryWeak.includes(zone));
  const replayBreak =
    !practice && !revealed && elapsed >= workMs && elapsed < total;
  const replayScene = !revealed && elapsed < settings.exposure * 1000;
  const visible = practice ? showScene : replayScene;
  const replaySelection = selectionsAt(
    round?.events ?? [],
    Math.max(-1, elapsed - settings.exposure * 1000),
  );
  return (
    <section className="review-page">
      <div className="page-heading">
        <span className="eyebrow">
          {allSituations
            ? "48 ситуаций · все зоны раскрыты"
            : practice
              ? "без таймера · учись на ошибках"
              : "повтор твоего теста"}
        </span>
        <h1>{allSituations ? "Все ситуации" : practice ? "Практика" : "Реплей"}</h1>
        <p>
          {allSituations
            ? "Переключайся между POV и схемой. Все зоны на схеме уже отмечены."
            : practice
            ? "Посмотри на расстановку, затем выбери слабые зоны."
            : "Исходная сцена, твои нажатия и разбор каждого решения."}
        </p>
      </div>
      <div className="review-toolbar">
        <span>
          {index + 1} / {deck.length} · {viewLabels[scenario.view]}
        </span>
        <button onClick={onClose}>
          {allSituations ? "На главную" : "К результатам"}
        </button>
      </div>
      <div className="review-stage">
        <div
          className={visible ? "review-scene" : "review-scene concealed"}
          aria-hidden={!visible}
        >
          <CourtScene
            scenario={scenario}
            settings={settings}
            onReady={() => setReady(true)}
          />
        </div>
        {replayBreak && (
          <div className="countdown break-countdown" role="status">
            <span>Приготовьтесь...</span>
            <p>{((total - elapsed) / 1000).toFixed(1)} с</p>
          </div>
        )}
        {!visible && !replayBreak && (
          <ZoneBoard
            selected={
              practice
                ? selected
                : revealed
                  ? (round?.selected ?? [])
                  : replaySelection
            }
            onToggle={toggle}
            correct={revealed ? scenario.correct : undefined}
            veryWeak={revealed ? veryWeak : undefined}
            disabled={!practice || revealed}
            opponents={
              practice && revealed ? scenario.opponents : undefined
            }
            attackX={scenario.camera.x}
          />
        )}
      </div>
      <div className="actions review-actions">
        {practice ? (
          <>
            <button onClick={() => setShowScene((v) => !v)}>
              {showScene ? "Выбрать зоны" : "Посмотреть сцену"}
            </button>
            {!showScene && !revealed && (
              <button
                className="primary"
                disabled={!selected.length}
                onClick={() => setRevealed(true)}
              >
                Проверить ответ
              </button>
            )}
          </>
        ) : (
          <>
            <button
              className="primary"
              disabled={!ready}
              onClick={() => {
                if (position.current >= total) {
                  position.current = 0;
                  setElapsed(0);
                  setRevealed(false);
                }
                setPlaying((v) => !v);
              }}
            >
              <Icon name={playing ? "replay" : "play"} />
              {playing ? "Пауза" : "Воспроизвести"}
            </button>
            <button
              onClick={() => {
                setPlaying(false);
                if (revealed) {
                  position.current = 0;
                  setElapsed(0);
                }
                setRevealed((v) => !v);
              }}
            >
              {revealed ? "Показать сцену" : "Показать разбор"}
            </button>
            <span className="mono">
              {(elapsed / 1000).toFixed(1)} / {total / 1000} с
            </span>
          </>
        )}
        <div className="review-nav">
          <button disabled={index === 0} onClick={() => move(index - 1)}>
            Назад
          </button>
          <button
            disabled={index === deck.length - 1}
            onClick={() => move(index + 1)}
          >
            Дальше <Icon name="arrow" />
          </button>
        </div>
      </div>
      {revealed && (
        <div className="explanation" role="status">
          <span className="eyebrow">
            {practice
              ? allSituations
                ? "Разбор всех зон"
                : selected.every((z) => scenario.correct.includes(z))
                ? "Верно"
                : "Есть закрытые зоны"
              : "Разбор ситуации"}
          </span>
          <h2>{scenario.title}</h2>
          <p>{scenario.explanation}</p>
          <p>
            Слабые зоны · 1 очко: <strong>{weak.join(", ") || "нет"}</strong>.{" "}
            Очень слабые · 2 очка:{" "}
            <strong>{veryWeak.join(", ") || "нет"}</strong>.
            {!allSituations && (
              <>
                {" "}
                {practice ? "Твой выбор" : "Было выбрано"}:{" "}
                {(practice ? selected : (round?.selected ?? [])).join(", ") ||
                  "нет ответа"}.
              </>
            )}
          </p>
        </div>
      )}
      <p className="fine-print">{DISCLAIMER}</p>
    </section>
  );
}
