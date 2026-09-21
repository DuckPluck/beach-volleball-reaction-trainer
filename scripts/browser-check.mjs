import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
await page.goto(process.env.TEST_URL || "http://127.0.0.1:5174");
await page.waitForTimeout(1800);
await page.screenshot({ path: "/tmp/beach-home.png", fullPage: true });
for (const size of [192, 512]) {
  const svg = await readFile("public/favicon.svg", "utf8");
  const data = await page.evaluate(
    async ({ svg, size }) => {
      const img = new Image();
      img.src = "data:image/svg+xml;base64," + btoa(svg);
      await img.decode();
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#202225";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, size * 0.1, size * 0.1, size * 0.8, size * 0.8);
      return c.toDataURL("image/png").split(",")[1];
    },
    { svg, size },
  );
  await writeFile(`public/icon-${size}.png`, Buffer.from(data, "base64"));
}
const css = await readFile("src/styles.css", "utf8");
await writeFile(
  "/tmp/beach-home-harness.html",
  await page.evaluate((css) => {
    const doc = document.documentElement.cloneNode(true);
    doc.querySelectorAll("script,link,style").forEach((n) => n.remove());
    const style = document.createElement("style");
    style.textContent = css;
    doc.querySelector("head").append(style);
    return "<!doctype html>" + doc.outerHTML;
  }, css),
);
await page.getByRole("button", { name: "Настройки", exact: true }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: "/tmp/beach-settings.png", fullPage: true });
await writeFile(
  "/tmp/beach-settings-harness.html",
  await page.evaluate((css) => {
    const doc = document.documentElement.cloneNode(true);
    doc.querySelectorAll("script,link,style").forEach((n) => n.remove());
    const style = document.createElement("style");
    style.textContent = css;
    doc.querySelector("head").append(style);
    return "<!doctype html>" + doc.outerHTML;
  }, css),
);
console.log("Screenshots, state harnesses and PWA icons created.");
await browser.close();
