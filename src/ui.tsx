import { useEffect, useId, useRef, type ReactNode } from "react";
import type { Player } from "./model";
export function Icon({
  name,
}: {
  name:
    | "court"
    | "chart"
    | "settings"
    | "share"
    | "play"
    | "arrow"
    | "sound"
    | "close"
    | "replay";
}) {
  const paths: Record<typeof name, ReactNode> = {
    court: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M4 12h16M12 3v18M4 8h16M4 16h16" />
      </>
    ),
    chart: (
      <>
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </>
    ),
    settings: (
      <>
        <path d="M20 7h-9" />
        <path d="M14 17H5" />
        <circle cx="17" cy="17" r="3" />
        <circle cx="7" cy="7" r="3" />
      </>
    ),
    share: (
      <>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
        <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
      </>
    ),
    play: <polygon points="6 3 20 12 6 21 6 3" />,
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </>
    ),
    sound: (
      <>
        <path d="m11 5-6 4H2v6h3l6 4V5ZM15 8a5 5 0 0 1 0 8m3-11a9 9 0 0 1 0 14" />
      </>
    ),
    close: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
    replay: (
      <>
        <path d="M3 11a9 9 0 1 1 2.6 7M3 4v7h7" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
export function Choice<T extends string | number>({
  label,
  values,
  value,
  onChange,
  format = String,
}: {
  label: string;
  values: readonly T[];
  value: T;
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  return (
    <div className="choice">
      <span className="choice-label">{label}</span>
      <div className="segments" role="group" aria-label={label}>
        {values.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
          >
            {format(v)}
          </button>
        ))}
      </div>
    </div>
  );
}
export function MultiChoice<T extends string>({
  label,
  values,
  value,
  onChange,
  labels,
}: {
  label: string;
  values: T[];
  value: T[];
  onChange: (v: T[]) => void;
  labels: Record<T, string>;
}) {
  return (
    <div className="choice">
      <span className="choice-label">{label}</span>
      <div className="segments" role="group" aria-label={label}>
        {values.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={value.includes(v)}
            disabled={value.includes(v) && value.length === 1}
            onClick={() =>
              onChange(
                value.includes(v)
                  ? value.filter((x) => x !== v)
                  : [...value, v],
              )
            }
          >
            {labels[v]}
          </button>
        ))}
      </div>
    </div>
  );
}
export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="setting-row">
      <span>
        <span className="setting-title">{label}</span>
        {description && <small>{description}</small>}
      </span>
      <input
        className="switch"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => previous?.focus();
  }, []);
  return (
    <dialog
      aria-labelledby={titleId}
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button className="icon-button" aria-label="Закрыть" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ZoneBoard({
  selected,
  onToggle,
  correct,
  veryWeak,
  disabled = false,
  counts,
  opponents,
  attackX = 0,
  label = "Выбери слабые зоны",
}: {
  selected: number[];
  onToggle?: (zone: number) => void;
  correct?: number[];
  veryWeak?: number[];
  disabled?: boolean;
  counts?: number[];
  opponents?: [Player, Player];
  attackX?: number;
  label?: string;
}) {
  return (
    <div className="zone-board">
      <div className="board-top">
        <span>поле соперника</span>
        <span>8 × 8 м</span>
      </div>
      <div className="zones" role="group" aria-label={label}>
        {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((z) => (
          <button
            type="button"
            key={z}
            style={
              {
                "--heat": counts
                  ? Math.min((counts[z - 1] || 0) / Math.max(...counts, 1), 1)
                  : 0,
              } as React.CSSProperties
            }
            className={`${selected.includes(z) ? "selected" : ""} ${correct?.includes(z) ? "correct" : ""} ${veryWeak?.includes(z) ? "very-weak" : ""} ${correct && selected.includes(z) && !correct.includes(z) ? "wrong" : ""} ${counts ? "heat" : ""}`}
            disabled={disabled}
            aria-label={`Зона ${z}${correct ? (veryWeak?.includes(z) ? ", очень слабая, 2 очка" : correct.includes(z) ? ", слабая, 1 очко" : ", закрытая") : ""}${counts ? `, ${counts[z - 1]} ошибок` : ""}`}
            aria-pressed={selected.includes(z)}
            onClick={() => onToggle?.(z)}
          >
            <span>{z}</span>
            {correct && (
              <small>
                {veryWeak?.includes(z)
                  ? "2 очка"
                  : correct.includes(z)
                    ? "1 очко"
                  : selected.includes(z)
                    ? "ошибка"
                    : ""}
              </small>
            )}
            {counts && <small>{counts[z - 1]}</small>}
          </button>
        ))}
        {opponents && (
          <div className="zone-players" aria-hidden="true">
            {opponents.map((player, index) => {
              const running = player.pose.startsWith("run"),
                dx = player.target
                  ? player.target.x - player.x
                  : running
                  ? player.pose === "runLeft"
                    ? -1
                    : 1
                  : attackX - player.x,
                dz = player.target
                  ? player.target.z - player.z
                  : running
                    ? 0.65
                    : Math.max(0.5, -player.z + 1),
                angle = (Math.atan2(dx, -dz) * 180) / Math.PI;
              return (
                <span
                  className={`zone-player-marker ${running ? "running" : ""}`}
                  key={index}
                  style={{
                    left: `${Math.max(0, Math.min(100, ((player.x + 4) / 8) * 100))}%`,
                    top: `${Math.max(0, Math.min(100, ((player.z + 8) / 8) * 100))}%`,
                  }}
                >
                  <svg
                    className="player-direction"
                    viewBox="0 0 20 40"
                    style={{ transform: `translate(-50%, -50%) rotate(${angle}deg)` }}
                  >
                    <path d="M10 36V3M4 10l6-7 6 7" />
                  </svg>
                  <span>{index + 1}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>
      {opponents && (
        <span className="sr-only">
          Показаны позиции и направления движения двух соперников.
        </span>
      )}
      <div className="board-net">
        <span>сетка</span>
      </div>
      <div className="board-player">твоя сторона</div>
    </div>
  );
}
