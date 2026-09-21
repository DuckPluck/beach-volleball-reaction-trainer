import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { CourtScene } from "./CourtScene";
import { Game } from "./Game";
import { Settings } from "./Settings";
import { Results, Statistics } from "./Stats";
import { Review } from "./Review";
import { Share } from "./Share";
import { Choice, Icon, MultiChoice, Modal } from "./ui";
import { unlockAudio } from "./audio";
import { SCENARIOS } from "./scenarios";
import {
  DEFAULT_PREFS,
  DEFAULT_TEST,
  DISCLAIMER,
  actualDuration,
  depthLabels,
  eligible,
  modeLabels,
  positionLabels,
  roundCount,
  sequence,
  viewLabels,
  type Preferences,
  type Scenario,
  type SessionResult,
  type TestSettings,
} from "./model";
import {
  HISTORY_KEY,
  SETTINGS_KEY,
  loadHistory,
  loadSettings,
  write,
} from "./storage";
type Page =
  | "home"
  | "settings"
  | "stats"
  | "game"
  | "results"
  | "practice"
  | "catalog"
  | "replay";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
const initialSettings = loadSettings(),
  initialHistory = loadHistory();
if (initialSettings.test.mode === "defense")
  initialSettings.test.views = ["ground"];
export default function App() {
  const [settings, setSettings] = useState(initialSettings.test),
    [prefs, setPrefs] = useState(initialSettings.prefs),
    [sessions, setSessions] = useState(initialHistory.sessions),
    [page, setPage] = useState<Page>("home"),
    [notice, setNotice] = useState(
      initialSettings.error || initialHistory.error,
    ),
    [historyBlocked, setHistoryBlocked] = useState(
      Boolean(initialHistory.error),
    ),
    [result, setResult] = useState<SessionResult | null>(null),
    [run, setRun] = useState<{
      deck: Scenario[];
      settings: TestSettings;
      prefs: Preferences;
    } | null>(null),
    [share, setShare] = useState(false),
    [help, setHelp] = useState(false),
    [install, setInstall] = useState<InstallEvent | null>(null),
    [resetId, setResetId] = useState(0);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: () =>
      setNotice(
        "Офлайн-режим пока не удалось подготовить. Приложение доступно в текущей вкладке.",
      ),
  });
  const [updating, setUpdating] = useState(false);
  useEffect(() => {
    const fn = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", fn);
    return () => window.removeEventListener("beforeinstallprompt", fn);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(prefs.reduceMotion);
  }, [prefs.reduceMotion]);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (page !== "game")
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>("main")?.focus(),
      );
  }, [page]);
  const saveSettings = (test: TestSettings, p: Preferences) => {
    setSettings(test);
    setPrefs(p);
    const error = write(SETTINGS_KEY, { version: 1, test, prefs: p });
    if (error) setNotice(error);
  };
  const start = (s = settings) => {
    const pool = eligible(SCENARIOS, s);
    if (!pool.length) {
      setNotice("Для этих условий нет ситуаций. Измени режим или позиции.");
      return;
    }
    void unlockAudio();
    setRun({
      deck: sequence(pool, roundCount(s)),
      settings: structuredClone(s),
      prefs: { ...prefs },
    });
    setPage("game");
    setNotice("");
  };
  const complete = (session: SessionResult) => {
    setResult(session);
    setPage("results");
    setRun(null);
    const next = [session, ...sessions];
    setSessions(next);
    if (historyBlocked) {
      setNotice(
        "Результат доступен в этой вкладке. Сохранение остановлено, чтобы не перезаписать недоступную историю. Скачай карточку результата.",
      );
      return;
    }
    const error = write(HISTORY_KEY, { version: 1, sessions: next });
    if (error) setNotice(error);
  };
  const removeHistory = () => {
    try {
      localStorage.removeItem(HISTORY_KEY);
      setSessions([]);
      setHistoryBlocked(false);
      setNotice("История удалена. Настройки сохранены.");
    } catch {
      setNotice(
        "Не удалось удалить историю. Браузер запретил доступ к хранилищу.",
      );
    }
  };
  const filtered = eligible(SCENARIOS, settings);
  const active = page === "game";
  return (
    <div className="app-shell">
      {!active && (
        <header className="header">
          <button
            className="brand"
            aria-label="Beach Read · Главная"
            onClick={() => setPage("home")}
          >
            <Icon name="court" />
            <span>
              beach read<small>тренажёр чтения защиты</small>
            </span>
          </button>
          <nav aria-label="Главное меню">
            <button
              aria-label="Тренировка"
              className={page === "home" ? "active" : ""}
              onClick={() => setPage("home")}
            >
              <Icon name="court" />
              <span>Тренировка</span>
            </button>
            <button
              aria-label="Статистика"
              className={page === "stats" ? "active" : ""}
              onClick={() => setPage("stats")}
            >
              <Icon name="chart" />
              <span>Статистика</span>
            </button>
            <button
              aria-label="Настройки"
              className={page === "settings" ? "active" : ""}
              onClick={() => setPage("settings")}
            >
              <Icon name="settings" />
              <span>Настройки</span>
            </button>
          </nav>
          <button
            className="header-share icon-button"
            aria-label="Поделиться приложением"
            onClick={() => setShare(true)}
          >
            <Icon name="share" />
          </button>
        </header>
      )}
      {notice && !active && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button
            className="icon-button"
            aria-label="Скрыть сообщение"
            onClick={() => setNotice("")}
          >
            <Icon name="close" />
          </button>
        </div>
      )}
      <main tabIndex={-1}>
        {page === "home" && (
          <section className="home">
            <div className="home-heading">
              <span className="eyebrow">
                <span className="status-dot" /> пляжный волейбол · чтение игры
              </span>
              <h1>
                Читай поле.
                <br />
                <em>Находи свободное.</em>
              </h1>
              <p>
                Короткий взгляд на защиту. Быстрое решение.
                <br />
                Тренируй то, что происходит до удара.
              </p>
            </div>
            <div className="test-controls">
              <Choice
                label="Режим"
                values={["all", "block", "defense"] as const}
                value={settings.mode}
                onChange={(mode) =>
                  saveSettings(
                    {
                      ...settings,
                      mode,
                      views:
                        mode === "defense"
                          ? ["ground"]
                          : ["ground", "jump"],
                    },
                    prefs,
                  )
                }
                format={(m) => modeLabels[m]}
              />
              <div className="timing-controls">
                <Choice
                  label="Тест"
                  values={[15, 30, 60]}
                  value={settings.duration}
                  onChange={(duration) =>
                    saveSettings({ ...settings, duration }, prefs)
                  }
                  format={(v) => `${v} с`}
                />
                <Choice
                  label="Показ"
                  values={[0.25, 0.5, 0.75, 1]}
                  value={settings.exposure}
                  onChange={(exposure) =>
                    saveSettings({ ...settings, exposure }, prefs)
                  }
                  format={(v) => `${v} с`}
                />
                <Choice
                  label="Ответ"
                  values={[1, 2, 3, 5]}
                  value={settings.answer}
                  onChange={(answer) =>
                    saveSettings({ ...settings, answer }, prefs)
                  }
                  format={(v) => `${v} с`}
                />
                <Choice
                  label="Перерыв"
                  values={[0, 0.5, 1, 2, 3]}
                  value={settings.breakSeconds ?? 0}
                  onChange={(breakSeconds) =>
                    saveSettings({ ...settings, breakSeconds }, prefs)
                  }
                  format={(v) => (v === 0 ? "нет" : `${v} с`)}
                />
              </div>
            </div>
            <div className="home-preview">
              <CourtScene
                scenario={filtered[0] ?? SCENARIOS[0]}
                settings={settings}
              />
              <div className="preview-shade" />
              <div className="preview-caption">
                <span className="eyebrow">один взгляд меняет решение</span>
                <span>
                  {settings.eyes} см · сетка {settings.net} см
                </span>
              </div>
              <div className="preview-tag">
                <span className="status-dot" /> POV
              </div>
            </div>
            <div className="start-row">
              <div>
                <span className="mono">
                  {roundCount(settings)} ситуаций{" "}
                  <span className="muted">/</span>{" "}
                  {Number(actualDuration(settings).toFixed(2))} секунд
                </span>
                <small>
                  Каждый раунд{" "}
                  {(settings.exposure + settings.answer).toLocaleString(
                    "ru-RU",
                  )}{" "}
                  с
                  {(settings.breakSeconds ?? 0) > 0 &&
                    ` · перерыв ${settings.breakSeconds?.toLocaleString("ru-RU")} с`}
                </small>
              </div>
              <button
                className="primary start-button"
                onClick={() => start()}
                disabled={!filtered.length}
              >
                Начать <Icon name="arrow" />
              </button>
            </div>
            <section className="mode-panel" aria-labelledby="mode-heading">
              <h2 id="mode-heading">Ракурсы и позиции</h2>
              <div className="mode-options">
                <MultiChoice
                  label="Ракурс"
                  values={
                    settings.mode === "defense"
                      ? ["ground"]
                      : ["ground", "jump"]
                  }
                  value={settings.views}
                  onChange={(views) =>
                    saveSettings({ ...settings, views }, prefs)
                  }
                  labels={viewLabels}
                />
                <MultiChoice
                  label="Позиция"
                  values={["left", "center", "right"]}
                  value={settings.positions}
                  onChange={(positions) =>
                    saveSettings({ ...settings, positions }, prefs)
                  }
                  labels={positionLabels}
                />
                {settings.views.includes("ground") &&
                  settings.mode !== "block" && (
                  <MultiChoice
                    label="Глубина с песка"
                    values={["near", "middle", "far"]}
                    value={settings.depths}
                    onChange={(depths) =>
                      saveSettings({ ...settings, depths }, prefs)
                    }
                    labels={depthLabels}
                  />
                  )}
                <p className="fine-print">
                  В наборе {filtered.length} ситуаций. После исчерпания они
                  перемешиваются заново.
                </p>
              </div>
            </section>
            <div className="how-it-works">
              <div>
                <span className="step-number">01</span>
                <p>
                  Посмотри
                  <small>Запомни расстановку за {settings.exposure} с</small>
                </p>
              </div>
              <div>
                <span className="step-number">02</span>
                <p>
                  Найди<small>Выбери слабые зоны за {settings.answer} с</small>
                </p>
              </div>
              <div>
                <span className="step-number">03</span>
                <p>
                  Разбери<small>Узнай, что осталось незамеченным</small>
                </p>
              </div>
            </div>
          </section>
        )}
        {page === "settings" && (
          <Settings
            key={resetId}
            settings={settings}
            prefs={prefs}
            onSettings={(s) => saveSettings(s, prefs)}
            onPrefs={(p) => saveSettings(settings, p)}
            onReset={() => {
              saveSettings(structuredClone(DEFAULT_TEST), { ...DEFAULT_PREFS });
              setResetId((x) => x + 1);
              setNotice("Исходные настройки восстановлены. История сохранена.");
            }}
          />
        )}
        {page === "stats" && (
          <>
            <Statistics
              hasUnreadableHistory={historyBlocked}
              sessions={sessions}
              current={settings}
              onOpen={(s) => {
                setResult(s);
                setPage("results");
              }}
              onDelete={removeHistory}
            />
            {historyBlocked && (
              <button className="danger" onClick={() => setHelp(true)}>
                Справка о сохранении
              </button>
            )}
          </>
        )}
        {page === "game" && run && (
          <Game
            deck={run.deck}
            settings={run.settings}
            prefs={run.prefs}
            onComplete={complete}
            onAbort={(m) => {
              setRun(null);
              setPage("home");
              setNotice(m);
            }}
          />
        )}
        {page === "results" && result && (
          <Results
            session={result}
            onRestart={() => start(result.settings)}
            onPractice={() => setPage("practice")}
            onReplay={() => setPage("replay")}
            onShare={() => setShare(true)}
          />
        )}
        {(page === "practice" || page === "replay") && result && (
          <Review
            key={page + result.id}
            practice={page === "practice"}
            session={result}
            settings={result.settings}
            onClose={() => setPage("results")}
          />
        )}
        {page === "catalog" && (
          <Review
            key="catalog"
            practice
            allSituations
            settings={settings}
            onClose={() => setPage("home")}
          />
        )}
      </main>
      {!active && (
        <footer>
          <div>
            <button onClick={() => setHelp(true)}>Как это работает</button>
            <span className="footer-dot">·</span>
            <button onClick={() => setPage("catalog")}>Все ситуации</button>
            <span className="footer-dot">·</span>
            <span>Данные на устройстве</span>
          </div>
          <div>
            {install && (
              <button
                onClick={async () => {
                  try {
                    await install.prompt();
                    await install.userChoice;
                    setInstall(null);
                  } catch {
                    setNotice("Установка недоступна. Попробуй меню браузера.");
                  }
                }}
              >
                Установить приложение
              </button>
            )}
            <span className="mono">beach read / 01</span>
          </div>
        </footer>
      )}
      {!active && needRefresh && (
        <div className="pwa-notice" role="status">
          <span>Доступна новая версия.</span>
          <button
            disabled={updating}
            onClick={async () => {
              setUpdating(true);
              try {
                await updateServiceWorker(true);
              } catch {
                setNotice("Не удалось обновить приложение. Попробуй позже.");
                setUpdating(false);
              }
            }}
          >
            Обновить
          </button>
          <button onClick={() => setNeedRefresh(false)}>Позже</button>
        </div>
      )}
      {!active && offlineReady && (
        <div className="pwa-notice" role="status">
          <span>Всё готово для работы офлайн.</span>
          <button onClick={() => setOfflineReady(false)}>Понятно</button>
        </div>
      )}
      {share && (
        <Share
          session={page === "results" && result ? result : undefined}
          onClose={() => setShare(false)}
        />
      )}
      {help && (
        <Modal title="Как читать защиту" onClose={() => setHelp(false)}>
          <p>
            Сначала ты видишь поле с позиции игрока, затем выбираешь зоны на
            схеме сверху. Сетка внизу, ближайшие зоны 1–3, средние 4–6, дальние
            7–9.
          </p>
          <p>
            Отметь хотя бы одну слабую зону и ни одной закрытой. Можно изменить
            выбор до конца времени ответа. Первый выбор определяет время
            реакции, итоговый набор определяет успех.
          </p>
          <p>{DISCLAIMER}</p>
          <p>
            История хранится только в этом браузере. Очистка данных сайта удалит
            её. При ошибке сохранения результат остаётся в текущей вкладке:
            можно скачать карточку. Установка и офлайн доступны в поддерживаемом
            браузере через HTTPS или localhost.
          </p>
          <button className="primary" onClick={() => setHelp(false)}>
            Понятно
          </button>
        </Modal>
      )}
    </div>
  );
}
