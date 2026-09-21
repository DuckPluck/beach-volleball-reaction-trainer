import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});
const context = await browser.newContext({
  baseURL: process.env.TEST_URL || "http://127.0.0.1:4173",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.TEST_URL || "http://127.0.0.1:4173");
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload();
await page.waitForFunction(() => !!navigator.serviceWorker.controller);
const manifest = await (await page.request.get("/manifest.webmanifest")).json();
assert.equal(manifest.name, "Beach Read · Читай защиту");
for (const icon of manifest.icons)
  assert.equal((await page.request.get("/" + icon.src)).status(), 200);
await page.evaluate(() =>
  localStorage.setItem(
    "beach-read.settings.v1",
    JSON.stringify({
      version: 1,
      test: {
        duration: 15,
        exposure: 0.25,
        answer: 1,
        breakSeconds: 0,
        mode: "all",
        views: ["ground", "jump"],
        positions: ["left", "center", "right"],
        depths: ["near", "middle", "far"],
        eyes: 170,
        jump: 50,
        net: 243,
      },
      prefs: {
        cue: false,
        click: false,
        volume: 50,
        timer: true,
        reduceMotion: false,
      },
    }),
  ),
);
await context.setOffline(true);
await page.reload();
await page.getByRole("button", { name: "Настройки", exact: true }).click();
await page.getByLabel("Высота глаз", { exact: false }).fill("176");
await page.getByRole("button", { name: "Тренировка", exact: true }).click();
await page.getByRole("button", { name: "Начать", exact: true }).click();
await page
  .getByRole("heading", { name: "Где свободно?" })
  .waitFor({ timeout: 10000 });
await page.keyboard.press("1");
await page
  .getByRole("heading", { name: "Поле прочитано." })
  .waitFor({ timeout: 30000 });
assert.equal(
  await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("beach-read.history.v1")).sessions[0]
        .rounds.length,
  ),
  12,
);
await page.screenshot({
  path: "/tmp/beach-offline-result.png",
  fullPage: true,
});
assert.deepEqual(errors, []);
console.log(
  "PASS: production manifest and icons, service worker control, offline reload, settings, complete offline test and saved result.",
);
await browser.close();
