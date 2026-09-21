import { useState } from "react";
import {
  actualDuration,
  conditionsKey,
  modeLabels,
  summarize,
  type RoundResult,
  type SessionResult,
  type TestSettings,
} from "./model";
import { Choice, Icon, Modal, ZoneBoard } from "./ui";
export const ms = (v: number | null) =>
  v === null ? "нет данных" : `${(v / 1000).toFixed(2)} с`;
export const date = (v: string) =>
  new Date(v).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
export function Metrics({ rounds }: { rounds: RoundResult[] }) {
  const s = summarize(rounds);
  return (
    <div className="metrics">
      <div className="metric main-metric">
        <span>успешность</span>
        <strong>
          {s.accuracy}
          <small>%</small>
        </strong>
      </div>
      <div className="metric">
        <span>первый выбор · медиана</span>
        <strong>
          {s.median === null ? "нет данных" : (s.median / 1000).toFixed(2)}
          {s.median !== null && <small>с</small>}
        </strong>
      </div>
      <div className="metric">
        <span>верно / ошибка / пропуск</span>
        <strong className="outcomes">
          <span>{s.success}</span>
          <i>/</i>
          <span>{s.error}</span>
          <i>/</i>
          <span>{s.skip}</span>
        </strong>
      </div>
      <div className="metric">
        <span>очки</span>
        <strong>
          {s.score}
          <small>/ {s.maxScore}</small>
        </strong>
      </div>
    </div>
  );
}
export function LineChart({
  values,
  labels,
  max,
  title,
  statuses,
}: {
  values: (number | null)[];
  labels: string[];
  max: number;
  title: string;
  statuses?: string[];
}) {
  const x = (i: number) =>
      45 + (values.length === 1 ? 0.5 : i / (values.length - 1)) * 840,
    y = (v: number) => 175 - (v / max) * 140;
  const path = values
    .map((v, i) =>
      v === null
        ? ""
        : `${i === 0 || values[i - 1] === null ? "M" : "L"}${x(i)},${y(v)}`,
    )
    .join(" ");
  return (
    <div className="chart">
      <div className="section-heading">
        <h2>{title}</h2>
        <span className="eyebrow">
          {values.length} {statuses ? "раундов" : "тестов"}
        </span>
      </div>
      <svg viewBox="0 0 920 215" role="img" aria-label={title}>
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line
              x1="45"
              y1={y(max * t)}
              x2="885"
              y2={y(max * t)}
              className="chart-grid"
            />
            <text x="32" y={y(max * t) + 4} textAnchor="end">
              {Number((max * t).toFixed(2))}
            </text>
          </g>
        ))}
        <path d={path} className="chart-line" />
        {values.map((v, i) => (
          <g key={i}>
            <circle
              cx={x(i)}
              cy={v === null ? 185 : y(v)}
              r="4"
              className={`chart-point ${statuses?.[i] ?? ""}`}
            >
              <title>
                {labels[i]}: {v === null ? "нет ответа" : v.toFixed(2)}
                {statuses
                  ? ` · ${statuses[i] === "success" ? "верно" : statuses[i] === "error" ? "ошибка" : "пропуск"}`
                  : ""}
              </title>
            </circle>
            {(i === 0 || i === values.length - 1 || values.length <= 12) && (
              <text x={x(i)} y="207" textAnchor="middle">
                {i + 1}
              </text>
            )}
          </g>
        ))}
      </svg>
      <details className="chart-data">
        <summary>Данные графика</summary>
        <div className="data-list">
          {values.map((v, i) => (
            <span key={i}>
              {labels[i]}: {v === null ? "нет ответа" : Number(v.toFixed(2))}
              {statuses
                ? ` · ${statuses[i] === "success" ? "верно" : statuses[i] === "error" ? "ошибка" : "пропуск"}`
                : ""}
            </span>
          ))}
        </div>
      </details>
    </div>
  );
}
export function Results({
  session,
  onRestart,
  onPractice,
  onReplay,
  onShare,
}: {
  session: SessionResult;
  onRestart: () => void;
  onPractice: () => void;
  onReplay: () => void;
  onShare: () => void;
}) {
  return (
    <section className="results">
      <div className="page-heading">
        <span className="eyebrow">
          {modeLabels[session.settings.mode].toLowerCase()} ·{" "}
          {actualDuration(session.settings)} с · {date(session.date)}
        </span>
        <h1>Поле прочитано.</h1>
        <p>Каждая ситуация помогает заметить чуть больше.</p>
      </div>
      <Metrics rounds={session.rounds} />
      <LineChart
        values={session.rounds.map((r) =>
          r.firstMs === null ? null : r.firstMs / 1000,
        )}
        labels={session.rounds.map((_, i) => `Раунд ${i + 1}`)}
        max={session.settings.answer}
        title="Время первого выбора, с"
        statuses={session.rounds.map((r) => r.outcome)}
      />
      <div className="chart-legend">
        <span className="legend-success">верно</span>
        <span className="legend-error">ошибка</span>
        <span>пропуск</span>
      </div>
      <div className="actions result-actions">
        <button className="primary" onClick={onRestart}>
          <Icon name="replay" /> Начать сначала
        </button>
        <button onClick={onPractice}>Практика</button>
        <button onClick={onReplay}>
          <Icon name="play" /> Реплей
        </button>
        <button onClick={onShare}>
          <Icon name="share" /> Поделиться
        </button>
      </div>
      <p className="fine-print">
        Показ {session.settings.exposure} с · ответ {session.settings.answer} с
        · перерыв {session.settings.breakSeconds ?? 0} с · глаза{" "}
        {session.settings.eyes} см · прыжок {session.settings.jump} см · сетка{" "}
        {session.settings.net} см
      </p>
    </section>
  );
}
export function Statistics({
  sessions,
  current,
  onOpen,
  onDelete,
  hasUnreadableHistory = false,
}: {
  sessions: SessionResult[];
  current: TestSettings;
  onOpen: (s: SessionResult) => void;
  onDelete: () => void;
  hasUnreadableHistory?: boolean;
}) {
  const [same, setSame] = useState(true),
    [mode, setMode] = useState("all"),
    [duration, setDuration] = useState(0),
    [heat, setHeat] = useState<"wrong" | "missed">("wrong"),
    [confirm, setConfirm] = useState(false);
  const filtered = sessions.filter(
    (s) =>
      (!same || conditionsKey(s.settings) === conditionsKey(current)) &&
      (mode === "all" ||
        s.settings.mode === (mode === "general" ? "all" : mode)) &&
      (!duration || s.settings.duration === duration),
  );
  const rounds = filtered.flatMap((s) => s.rounds),
    counts = Array(9).fill(0) as number[];
  for (const r of rounds)
    for (const z of heat === "wrong"
      ? r.selected.filter((z) => !r.scenario.correct.includes(z))
      : r.scenario.correct.filter((z) => !r.selected.includes(z)))
      counts[z - 1]++;
  return (
    <section>
      <div className="page-heading">
        <span className="eyebrow">твоя история на этом устройстве</span>
        <h1>Статистика</h1>
        <p>Замечай прогресс. Возвращайся к сложным расстановкам.</p>
      </div>
      <div className="stats-filters">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={same}
            onChange={(e) => setSame(e.target.checked)}
          />
          Только текущие условия
        </label>
        <select
          aria-label="Тип теста в истории"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="all">Все типы</option>
          <option value="general">Общий</option>
          <option value="block">Против блока</option>
          <option value="defense">Два защитника</option>
        </select>
        <select
          aria-label="Длительность в истории"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        >
          <option value="0">Любое время</option>
          {[15, 30, 60].map((d) => (
            <option key={d} value={d}>
              {d} с
            </option>
          ))}
        </select>
      </div>
      {!filtered.length ? (
        <div className="empty-state">
          <Icon name="chart" />
          <h2>
            {sessions.length
              ? "Нет тестов с такими условиями"
              : "Твой первый результат впереди"}
          </h2>
          <p>
            {sessions.length
              ? "Измени фильтры или пройди новый тест."
              : "Пройди тест, и здесь появятся графики и карта ошибок."}
          </p>
        </div>
      ) : (
        <>
          <Metrics rounds={rounds} />
          <div className="stats-charts">
            <LineChart
              title="Успешность, %"
              values={[...filtered]
                .reverse()
                .map((s) => summarize(s.rounds).accuracy)}
              labels={[...filtered].reverse().map((s) => date(s.date))}
              max={100}
            />
            <LineChart
              title="Первый выбор, с"
              values={[...filtered].reverse().map((s) => {
                const m = summarize(s.rounds).median;
                return m === null ? null : m / 1000;
              })}
              labels={[...filtered].reverse().map((s) => date(s.date))}
              max={Math.max(...filtered.map((s) => s.settings.answer))}
            />
          </div>
          <div className="heatmap-section">
            <div>
              <h2>Где теряются решения</h2>
              <p>Посмотри, какие части поля труднее читать.</p>
              <Choice
                label="На карте"
                values={["wrong", "missed"] as const}
                value={heat}
                onChange={setHeat}
                format={(v) =>
                  v === "wrong"
                    ? "Ошибочные выборы"
                    : "Неотмеченные слабые зоны"
                }
              />
              <p className="fine-print">
                Неотмеченные зоны показывают полноту обзора. Их пропуск не
                делает раунд ошибочным, если выбрана другая слабая зона без
                закрытых.
              </p>
            </div>
            <ZoneBoard selected={[]} disabled counts={counts} />
          </div>
          <div className="section-heading">
            <h2>Прошедшие тесты</h2>
            <span>{filtered.length}</span>
          </div>
          <div className="history-list">
            {filtered.map((s) => (
              <button
                key={s.id}
                className="history-item"
                onClick={() => onOpen(s)}
              >
                <span>
                  {date(s.date)}
                  <small>
                    {modeLabels[s.settings.mode]} · {actualDuration(s.settings)}{" "}
                    с
                  </small>
                </span>
                <strong>{summarize(s.rounds).accuracy}%</strong>
                <span>{ms(summarize(s.rounds).median)}</span>
                <Icon name="arrow" />
              </button>
            ))}
          </div>
        </>
      )}
      {(sessions.length > 0 || hasUnreadableHistory) && (
        <button
          className="danger delete-history"
          onClick={() => setConfirm(true)}
        >
          Удалить историю
        </button>
      )}
      {confirm && (
        <Modal title="Удалить всю историю?" onClose={() => setConfirm(false)}>
          <p>
            Все результаты и реплеи на этом устройстве будут удалены. Отменить
            это действие нельзя. Настройки останутся.
          </p>
          <div className="actions">
            <button onClick={() => setConfirm(false)}>Отмена</button>
            <button
              className="danger"
              onClick={() => {
                onDelete();
                setConfirm(false);
              }}
            >
              Удалить историю
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
