import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 720, height: 520 } });
await page.goto(
  (process.env.TEST_URL || "http://127.0.0.1:5174") + "/tests/scenes.html",
);
const images = [];
for (let i = 0; i < 48; i++) {
  await page.getByRole("combobox").selectOption(String(i));
  await page.waitForFunction(
    (i) => document.documentElement.dataset.ready === String(i),
    i,
  );
  const png = await page.locator("canvas").screenshot();
  images.push({
    png: png.toString("base64"),
    label: await page.locator("option:checked").textContent(),
  });
}
for (let sheet = 0; sheet < 3; sheet++) {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.setContent(
    '<body style="margin:0;background:#202225;color:#eee;font:12px monospace"><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">' +
      images
        .slice(sheet * 16, sheet * 16 + 16)
        .map(
          (x) =>
            `<div><img style="width:100%" src="data:image/png;base64,${x.png}"/><p>${x.label}</p></div>`,
        )
        .join("") +
      "</div>",
  );
  await page.screenshot({
    path: `/tmp/beach-scenes-${sheet + 1}.png`,
    fullPage: true,
  });
}
console.log("48 scenes rendered; 3 contact sheets saved.");
await browser.close();
