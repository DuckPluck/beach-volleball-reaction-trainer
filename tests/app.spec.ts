import { test, expect } from "@playwright/test";
import { DEFAULT_TEST } from "../src/model";
const settingsKey = "beach-read.settings.v1",
  historyKey = "beach-read.history.v1";
test("settings preview, validation, reset and mobile layouts", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Читай поле/ })).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await page.getByLabel("Высота глаз", { exact: false }).fill("180");
  await page.getByLabel("Подъём в прыжке", { exact: false }).fill("70");
  await page.getByRole("button", { name: "В прыжке", exact: true }).click();
  await expect(page.locator(".preview-measures")).toContainText("250 см");
  await page.getByLabel("Высота глаз", { exact: false }).fill("99");
  await expect(page.locator("[aria-invalid=true]")).toBeVisible();
  expect(
    JSON.parse(
      (await page.evaluate((k) => localStorage.getItem(k), settingsKey))!,
    ).test.eyes,
  ).toBe(180);
  await page.getByLabel("Высота глаз", { exact: false }).fill("180");
  await page.getByLabel("Высота сетки", { exact: false }).selectOption("224");
  await expect(page.locator(".preview-measures")).toContainText("224 см");
  await page.reload();
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await expect(page.getByLabel("Высота глаз", { exact: false })).toHaveValue(
    "180",
  );
  await page
    .getByRole("button", { name: "Сбросить настройки", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Сбросить настройки", exact: true })
    .click();
  await expect(page.getByLabel("Высота глаз", { exact: false })).toHaveValue(
    "170",
  );
  await page.screenshot({
    path: "test-results/settings-desktop.png",
    fullPage: true,
  });
  for (const width of [280, 320, 390, 414, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Beach Read · Главная", exact: true })
    .click();
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("full timed test, exact replay, practice, sharing and history", async ({
  page,
}) => {
  await page.addInitScript(
    ({ settingsKey, settings }) => {
      localStorage.setItem(
        settingsKey,
        JSON.stringify({
          version: 1,
          test: {
            ...settings,
            duration: 15,
            exposure: 0.25,
            answer: 1,
            breakSeconds: 0,
          },
          prefs: {
            cue: false,
            click: false,
            volume: 50,
            timer: true,
            reduceMotion: true,
          },
        }),
      );
    },
    { settingsKey, settings: DEFAULT_TEST },
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Начать", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Где свободно?" }),
  ).toBeVisible({ timeout: 15000 });
  await page.keyboard.press("1");
  await page.keyboard.press("9");
  await page.keyboard.press("9");
  await expect(
    page.getByRole("button", { name: "Зона 1", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: "test-results/answer.png" });
  await expect(
    page.getByRole("heading", { name: "Поле прочитано." }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.locator(".metrics")).toContainText("очки");
  const history = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)!),
    historyKey,
  );
  expect(history.sessions[0].rounds).toHaveLength(12);
  expect(history.sessions[0].rounds[0].selected).toEqual([1]);
  expect(history.sessions[0].rounds[0].events).toHaveLength(3);
  await page.screenshot({ path: "test-results/results.png", fullPage: true });
  await page.getByRole("button", { name: "Реплей", exact: true }).click();
  await page
    .getByRole("button", { name: "Воспроизвести", exact: true })
    .click();
  await expect(page.locator(".explanation")).toBeVisible();
  await expect(page.locator(".explanation")).toContainText("Было выбрано: 1");
  await page.getByRole("button", { name: "К результатам" }).click();
  await page.getByRole("button", { name: "Практика", exact: true }).click();
  await page.getByRole("button", { name: "Выбрать зоны", exact: true }).click();
  await page.getByRole("button", { name: "Зона 1", exact: true }).click();
  await page
    .getByRole("button", { name: "Проверить ответ", exact: true })
    .click();
  await expect(page.locator(".explanation")).toBeVisible();
  await expect(page.locator(".zone-player-marker")).toHaveCount(2);
  await expect(page.locator(".explanation")).not.toContainText("Твой выбор");
  await page.getByRole("button", { name: "К результатам" }).click();
  await page.getByRole("button", { name: "Поделиться", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Карточка результата Beach Read" }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Скачать PNG" }).click();
  expect((await download).suggestedFilename()).toBe("beach-read.png");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Статистика", exact: true }).click();
  await expect(page.locator(".history-item")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: "Статистика", exact: true }).click();
  await expect(page.locator(".history-item")).toHaveCount(1);
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await page
    .getByRole("button", { name: "Сбросить настройки", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Сбросить настройки", exact: true })
    .click();
  expect(
    await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)!).sessions.length,
      historyKey,
    ),
  ).toBe(1);
});
test("hidden tab aborts without persisting a test", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Начать", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Приготовься" }),
  ).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("status")).toContainText("вкладка была скрыта");
  expect(
    await page.evaluate((k) => localStorage.getItem(k), historyKey),
  ).toBeNull();
});

test("unreadable history is preserved until explicit deletion", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("beach-read.history.v1", "{broken"),
  );
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("не перезаписана");
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await page.getByLabel("Высота глаз", { exact: false }).fill("175");
  expect(
    await page.evaluate(() => localStorage.getItem("beach-read.history.v1")),
  ).toBe("{broken");
  await page.getByRole("button", { name: "Статистика", exact: true }).click();
  await page
    .getByRole("button", { name: "Удалить историю", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Удалить историю", exact: true })
    .click();
  expect(
    await page.evaluate(() => localStorage.getItem("beach-read.history.v1")),
  ).toBeNull();
});

test("mode filters stay nonempty and timing shows complete rounds", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("group", { name: "Показ", exact: true })
    .getByRole("button", { name: "0.75 с", exact: true })
    .click();
  await expect(page.locator(".start-row")).toContainText(
    "9 ситуаций / 32.75 секунд",
  );
  await expect(page.locator(".start-row small")).toHaveText(
    "Каждый раунд 2,75 с · перерыв 1 с",
  );
  await expect(
    page.getByRole("group", { name: "Ракурс", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("group", { name: "Ракурс", exact: true })
    .getByRole("button", { name: "С песка", exact: true })
    .click();
  await expect(
    page
      .getByRole("group", { name: "Ракурс", exact: true })
      .getByRole("button", { name: "В прыжке", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await expect(
    page.getByRole("group", { name: "Тест", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Оставшееся время").uncheck();
  await page.getByRole("button", { name: "Тренировка", exact: true }).click();
  await page.getByRole("button", { name: "Начать", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Приготовься" }),
  ).toBeVisible();
  await expect(page.locator(".phase-time")).toHaveCount(0);
  await page.getByRole("button", { name: "Завершить", exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("beach-read.history.v1")),
  ).toBeNull();
});

test("breaks separate rounds, ignore input and never follow the final answer", async ({
  page,
}) => {
  await page.addInitScript(
    ({ settingsKey, settings }) => {
      localStorage.setItem(
        settingsKey,
        JSON.stringify({
          version: 1,
          test: {
            ...settings,
            duration: 15,
            exposure: 0.25,
            answer: 1,
            breakSeconds: 1,
          },
          prefs: {
            cue: false,
            click: false,
            volume: 50,
            timer: true,
            reduceMotion: true,
          },
        }),
      );
    },
    { settingsKey, settings: DEFAULT_TEST },
  );
  await page.goto("/");
  await expect(
    page
      .getByRole("group", { name: "Перерыв", exact: true })
      .getByRole("button", { name: "1 с", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Начать", exact: true }).click();
  await page.evaluate(() => {
    const phases: { name: string; at: number }[] = [];
    (window as unknown as { phases: typeof phases }).phases = phases;
    new MutationObserver(() => {
      const name = document.querySelector("h1")?.textContent || "";
      if (phases.at(-1)?.name !== name)
        phases.push({ name, at: performance.now() });
    }).observe(document.querySelector("main")!, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  });
  await expect(
    page.getByRole("heading", { name: "Перерыв", exact: true }),
  ).toBeVisible({ timeout: 12000 });
  await expect(
    page.locator(".break-countdown > span"),
  ).toHaveText("Приготовьтесь...");
  await expect(page.locator(".break-countdown p")).toContainText("с");
  await expect(
    page.getByRole("group", { name: "Выбери слабые зоны", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("5");
  await expect(
    page.getByRole("heading", { name: "Поле прочитано." }),
  ).toBeVisible({ timeout: 25000 });
  const session = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)!).sessions[0],
    historyKey,
  );
  expect(session.rounds).toHaveLength(8);
  expect(
    session.rounds.every(
      (r: { selected: number[] }) => r.selected.length === 0,
    ),
  ).toBe(true);
  const phases = await page.evaluate(
    () =>
      (window as unknown as { phases: { name: string; at: number }[] }).phases,
  );
  expect(phases.filter((p) => p.name === "Перерыв")).toHaveLength(7);
  phases.forEach((phase, i) => {
    if (phase.name === "Перерыв")
      expect(phases[i + 1].at - phase.at).toBeGreaterThanOrEqual(950);
  });
  expect(phases.at(-2)?.name).toBe("Где свободно?");
  await page.getByRole("button", { name: "Реплей", exact: true }).click();
  await page
    .getByRole("button", { name: "Воспроизвести", exact: true })
    .click();
  await expect(
    page.getByText("Приготовьтесь...", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".break-countdown p")).toContainText("с");
});

test("all situations preselects every zone and switches between scheme and POV", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Все ситуации", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Все ситуации", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".review-toolbar")).toContainText("1 / 48");
  await expect(page.locator(".review-scene")).toBeVisible();
  const zones = page.locator(".zones button");
  await expect(zones).toHaveCount(0);
  await page
    .getByRole("button", { name: "Выбрать зоны", exact: true })
    .click();
  await expect(zones).toHaveCount(9);
  expect(
    await zones.evaluateAll((buttons) =>
      buttons.every((button) => button.getAttribute("aria-pressed") === "true"),
    ),
  ).toBe(true);
  await expect(page.locator(".zones button.correct")).toHaveCount(3);
  await expect(page.locator(".zones button.very-weak")).toHaveCount(3);
  await expect(page.locator(".zones button.wrong")).toHaveCount(6);
  await expect(page.locator(".zone-player-marker")).toHaveCount(2);
  await page.getByRole("button", { name: "Дальше", exact: false }).click();
  await expect(page.locator(".review-toolbar")).toContainText("2 / 48");
  await expect(page.locator(".review-scene")).toBeVisible();
  await expect(zones).toHaveCount(0);
  await page
    .getByRole("button", { name: "Выбрать зоны", exact: true })
    .click();
  await expect(zones).toHaveCount(9);
  expect(
    await zones.evaluateAll((buttons) =>
      buttons.every((button) => button.getAttribute("aria-pressed") === "true"),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Дальше", exact: false }).click();
  await expect(page.locator(".review-toolbar")).toContainText("3 / 48");
  await page
    .getByRole("button", { name: "Выбрать зоны", exact: true })
    .click();
  await expect(page.locator(".zones button.correct")).toHaveCount(4);
  await expect(page.locator(".zones button.very-weak")).toHaveCount(1);
  await expect(page.locator(".zones button.correct:not(.very-weak)")).toHaveCount(
    3,
  );
  await page.screenshot({ path: "test-results/all-situations.png" });
});
