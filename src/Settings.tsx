import { useId, useMemo, useState } from "react";
import { CourtScene } from "./CourtScene";
import { SCENARIOS } from "./scenarios";
import { Choice, Icon, Modal, Toggle } from "./ui";
import { beep, unlockAudio } from "./audio";
import {
  cameraHeight,
  type Preferences,
  type TestSettings,
  type View,
} from "./model";
function HeightInput({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState(String(value)),
    id = useId();
  const valid =
    draft.trim() !== "" &&
    Number.isInteger(Number(draft)) &&
    Number(draft) >= min &&
    Number(draft) <= max;
  return (
    <div className="setting-row">
      <label htmlFor={id}>
        <span className="setting-title">{label}</span>
        <small>{hint}</small>
      </label>
      <div className="number-control">
        <span>
          <input
            id={id}
            aria-invalid={!valid}
            aria-describedby={`${id}-hint`}
            type="number"
            min={min}
            max={max}
            step="1"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              const n = Number(e.target.value);
              if (
                e.target.value.trim() &&
                Number.isInteger(n) &&
                n >= min &&
                n <= max
              )
                onChange(n);
            }}
          />
          <span>см</span>
        </span>
        <small id={`${id}-hint`} className={!valid ? "error-text" : ""}>
          {valid ? `${min}–${max} см` : `Введи целое число от ${min} до ${max}`}
        </small>
      </div>
    </div>
  );
}
export function Settings({
  settings,
  prefs,
  onSettings,
  onPrefs,
  onReset,
}: {
  settings: TestSettings;
  prefs: Preferences;
  onSettings: (s: TestSettings) => void;
  onPrefs: (p: Preferences) => void;
  onReset: () => void;
}) {
  const [view, setView] = useState<View>("ground"),
    [custom, setCustom] = useState(
      ![243, 224, 212, 200].includes(settings.net),
    ),
    [reset, setReset] = useState(false);
  const scene = useMemo(
    () => SCENARIOS.find((scenario) => scenario.view === view) ?? SCENARIOS[0],
    [view],
  );
  return (
    <section className="settings-page">
      <div className="page-heading">
        <span className="eyebrow">подстрой под себя</span>
        <h1>Настройки</h1>
        <p>Знакомая высота. Привычный взгляд на поле.</p>
      </div>
      <div className="settings-layout">
        <div>
          <section className="settings-section">
            <h2>Камера и площадка</h2>
            <HeightInput
              label="Высота глаз"
              hint="Уровень камеры, когда ты стоишь на песке."
              value={settings.eyes}
              min={100}
              max={210}
              onChange={(eyes) => onSettings({ ...settings, eyes })}
            />
            <HeightInput
              label="Подъём в прыжке"
              hint="Прибавляется к высоте глаз в сценах у сетки."
              value={settings.jump}
              min={0}
              max={120}
              onChange={(jump) => onSettings({ ...settings, jump })}
            />
            <div className="setting-row">
              <label htmlFor="net-standard">
                <span className="setting-title">Высота сетки</span>
                <small>Измеряется в центре площадки.</small>
              </label>
              <select
                id="net-standard"
                value={custom ? "custom" : String(settings.net)}
                onChange={(e) => {
                  setCustom(e.target.value === "custom");
                  if (e.target.value !== "custom")
                    onSettings({ ...settings, net: Number(e.target.value) });
                }}
              >
                <option value="243">243 см · мужчины</option>
                <option value="224">224 см · женщины / до 16 лет</option>
                <option value="212">212 см · до 14 лет</option>
                <option value="200">200 см · до 12 лет</option>
                <option value="custom">Своё значение</option>
              </select>
            </div>
            {custom && (
              <HeightInput
                label="Своя высота сетки"
                hint="Для привычных условий тренировки."
                value={settings.net}
                min={180}
                max={260}
                onChange={(net) => onSettings({ ...settings, net })}
              />
            )}
            <p className="fine-print">
              Значения для возрастных групп включают указанный возраст.{" "}
              <a
                href="https://www.fivb.com/wp-content/uploads/2025/02/FIVB-BeachVolleyball_Rules2025_2028-EN-v01.pdf#page=15"
                target="_blank"
                rel="noreferrer"
              >
                Правила FIVB 2025–2028, п. 2.1
              </a>
              . Диапазоны ручного ввода заданы для приложения и не являются
              нормативами.
            </p>
          </section>
          <section className="settings-section">
            <div className="section-heading">
              <h2>Звук</h2>
              <button
                className="text-button"
                onClick={async () => {
                  await unlockAudio();
                  beep({ ...prefs, cue: true });
                }}
              >
                <Icon name="sound" /> Проверить
              </button>
            </div>
            <Toggle
              label="Сигнал показа"
              description="Короткий пип, когда появляется поле."
              checked={prefs.cue}
              onChange={(cue) => onPrefs({ ...prefs, cue })}
            />
            <Toggle
              label="Звук выбора зоны"
              checked={prefs.click}
              onChange={(click) => onPrefs({ ...prefs, click })}
            />
            <label className="setting-row">
              <span className="setting-title">Громкость</span>
              <span className="range-control">
                <input
                  aria-label="Громкость"
                  type="range"
                  min="0"
                  max="100"
                  value={prefs.volume}
                  onChange={(e) =>
                    onPrefs({ ...prefs, volume: Number(e.target.value) })
                  }
                />
                <output>{prefs.volume}%</output>
              </span>
            </label>
          </section>
          <section className="settings-section">
            <h2>Отображение</h2>
            <Toggle
              label="Оставшееся время"
              description="Скрытие индикатора не останавливает таймер."
              checked={prefs.timer}
              onChange={(timer) => onPrefs({ ...prefs, timer })}
            />
            <Toggle
              label="Уменьшить анимации"
              description="Системная настройка уменьшения движения учитывается всегда."
              checked={prefs.reduceMotion}
              onChange={(reduceMotion) => onPrefs({ ...prefs, reduceMotion })}
            />
          </section>
          <div className="reset-row">
            <div>
              <h2>Начать с исходных настроек</h2>
              <p>Также сбросит время и режимы. История останется.</p>
            </div>
            <button className="danger" onClick={() => setReset(true)}>
              Сбросить настройки
            </button>
          </div>
        </div>
        <aside className="settings-preview">
          <div className="section-heading">
            <h2>Твой взгляд</h2>
            <span className="eyebrow">предпросмотр</span>
          </div>
          <CourtScene scenario={scene} settings={settings} />
          <Choice
            label="Положение"
            values={["ground", "jump"] as const}
            value={view}
            onChange={setView}
            format={(v) => (v === "ground" ? "С песка" : "В прыжке")}
          />
          <div className="preview-measures">
            <span>
              камера <b>{Math.round(cameraHeight(settings, view) * 100)} см</b>
            </span>
            <span>
              сетка <b>{settings.net} см</b>
            </span>
          </div>
          <p className="fine-print">
            Высоты меняют только обзор. Правильные зоны ситуации остаются
            прежними: траекторию и возможность удара приложение не рассчитывает.
          </p>
          <p className="fine-print">
            Время теста, ракурсы и позиции выбираются в главном меню.
          </p>
        </aside>
      </div>
      {reset && (
        <Modal title="Сбросить настройки?" onClose={() => setReset(false)}>
          <p>
            Вернутся исходные высоты, звук, отображение, время и режимы. История
            тестов сохранится.
          </p>
          <div className="actions">
            <button onClick={() => setReset(false)}>Отмена</button>
            <button
              className="danger"
              onClick={() => {
                onReset();
                setReset(false);
              }}
            >
              Сбросить настройки
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
