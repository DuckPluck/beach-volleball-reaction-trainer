import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(process.env.TEST_URL || "http://127.0.0.1:5174");
const check = async (name) => {
  await page.addScriptTag({
    path: process.env.AXE_PATH || "/tmp/beach-axe.min.js",
  });
  const result = await page.evaluate(
    async () =>
      await axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
        },
      }),
  );
  console.log(
    name,
    JSON.stringify(
      result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ),
  );
  assert.equal(
    result.violations.length,
    0,
    `${name}: accessibility violations`,
  );
};
await check("home");
await page.getByRole("button", { name: "Настройки", exact: true }).click();
await check("settings");
await page
  .getByRole("button", { name: "Сбросить настройки", exact: true })
  .click();
await check("reset dialog");
await page.keyboard.press("Escape");
await page.getByRole("button", { name: "Статистика", exact: true }).click();
await check("empty statistics");
await page.evaluate(async () => {
  const { SCENARIOS } = await import("/src/scenarios.ts");
  const { DEFAULT_TEST, roundCount } = await import("/src/model.ts");
  const rounds = SCENARIOS.slice(0, roundCount(DEFAULT_TEST)).map(
    (scenario, i) => {
      const selected = i === 0 ? [] : i === 1 ? [5] : [scenario.correct[0]];
      const events = selected.map((zone) => ({ zone, at: 300 + i * 60 }));
      return {
        scenario,
        selected,
        events,
        firstMs: events[0]?.at ?? null,
        outcome: i === 0 ? "skip" : i === 1 ? "error" : "success",
      };
    },
  );
  localStorage.setItem(
    "beach-read.history.v1",
    JSON.stringify({
      version: 1,
      sessions: [
        {
          id: "qa-session",
          date: new Date().toISOString(),
          settings: DEFAULT_TEST,
          rounds,
        },
      ],
    }),
  );
});
await page.reload();
await page.getByRole("button", { name: "Статистика", exact: true }).click();
await check("statistics");
await page.locator(".history-item").click();
await check("results");
await page.getByRole("button", { name: "Поделиться", exact: true }).click();
await page
  .getByRole("img", { name: "Карточка результата Beach Read" })
  .waitFor();
await check("share dialog");
await page.keyboard.press("Escape");
await page.getByRole("button", { name: "Реплей", exact: true }).click();
await page
  .getByRole("button", { name: "Показать разбор", exact: true })
  .click();
await check("replay");
await page.getByRole("button", { name: "Показать сцену", exact: true }).click();
assert.equal(await page.locator(".review-scene").isVisible(), true);
await page.getByRole("button", { name: "К результатам", exact: true }).click();
await page.getByRole("button", { name: "Практика", exact: true }).click();
await page.getByRole("button", { name: "Выбрать зоны", exact: true }).click();
await check("practice");
for (const width of [280, 320, 390, 414]) {
  await page.setViewportSize({ width, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    `practice width ${width}`,
  );
}
console.log(
  "PASS: 9 live accessibility states, replay scene toggle, mobile practice layout.",
);
await browser.close();
