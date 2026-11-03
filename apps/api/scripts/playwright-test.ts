/// <reference lib="dom" />
import { chromium, Browser, Page } from "playwright";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = "http://localhost:5173";
const API_URL = "http://localhost:3000/api/v1";
const SCREENSHOTS_DIR = path.join(__dirname, "..", "..", "..", "playwright_screenshots");
const ADMIN_EMAIL = "admin@sis-mali.local";
const ADMIN_PASSWORD = "Admin@2026";

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: any;
}

async function loginViaApi(): Promise<LoginResult> {
  const res = await axios.post(
    API_URL + "/auth/login",
    { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    { timeout: 15000, headers: { "Content-Type": "application/json" } }
  );
  const d = res.data.data || res.data;
  return {
    accessToken: d.accessToken,
    refreshToken: d.refreshToken,
    user: d.user,
  };
}

async function setupAuthToken(page: Page, auth: LoginResult) {
  await page.addInitScript((a) => {
    try {
      const w = window as any;
      w.localStorage.setItem("sis_access_token", a.accessToken);
      w.localStorage.setItem("sis_refresh_token", a.refreshToken);
      if (a.user) {
        w.localStorage.setItem("sis_user", JSON.stringify(a.user));
      }
    } catch (e) { /* ignore */ }
  }, auth);
}

async function main() {
  console.log("=== Playwright test SIS-MALI ===");

  const auth = await loginViaApi();
  console.log("Login API OK, token", auth.accessToken.length, "chars");

  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    locale: "fr-FR",
  });
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await setupAuthToken(page, auth);

  // TEST 1 : /class-subjects
  console.log("\n--- TEST 1 : /class-subjects ---");
  await page.goto(BASE_URL + "/class-subjects", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2500);

  const screenshot1 = path.join(SCREENSHOTS_DIR, "01_class-subjects.png");
  await page.screenshot({ path: screenshot1, fullPage: true });
  console.log("Screenshot :", screenshot1);

  const title1 = await page.locator("h1").first().textContent().catch(() => null);
  console.log("Titre h1 :", title1);

  const hasAnneeLabel = await page.locator("text=Annee scolaire").count();
  console.log("Label 'Annee scolaire' present :", hasAnneeLabel > 0);

  // TEST 2 : /coefficients
  console.log("\n--- TEST 2 : /coefficients ---");
  await page.goto(BASE_URL + "/coefficients", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2500);

  const screenshot2 = path.join(SCREENSHOTS_DIR, "02_coefficients.png");
  await page.screenshot({ path: screenshot2, fullPage: true });
  console.log("Screenshot :", screenshot2);

  const title2 = await page.locator("h1").first().textContent().catch(() => null);
  console.log("Titre h1 :", title2);

  const hasNiveau = await page.locator("text=Niveau (2e cycle)").count();
  console.log("Label 'Niveau (2e cycle)' present :", hasNiveau > 0);

  // TEST 3 : interactions
  console.log("\n--- TEST 3 : selection niveau + historique ---");
  try {
    const selectTrigger = page.locator('button:has-text("Choisir un niveau")').first();
    const count = await selectTrigger.count();
    console.log("Bouton 'Choisir un niveau' trouve :", count);
    if (count > 0) {
      await selectTrigger.click();
      await page.waitForTimeout(800);
      const firstOption = page.locator('[role="option"]').first();
      const optionCount = await firstOption.count();
      if (optionCount > 0) {
        const optionText = await firstOption.textContent();
        console.log("Option selectionnee :", optionText);
        await firstOption.click();
        await page.waitForTimeout(3000);

        const screenshot3 = path.join(SCREENSHOTS_DIR, "03_coefficients_niveau_selectionne.png");
        await page.screenshot({ path: screenshot3, fullPage: true });
        console.log("Screenshot :", screenshot3);

        const histBtn = page.locator('button[title="Voir l\'historique"]').first();
        const histCount = await histBtn.count();
        console.log("Boutons Historique presents :", histCount);
        if (histCount > 0) {
          await histBtn.click();
          await page.waitForTimeout(1500);
          const screenshot4 = path.join(SCREENSHOTS_DIR, "04_historique_ouvert.png");
          await page.screenshot({ path: screenshot4, fullPage: true });
          console.log("Screenshot :", screenshot4);

          const hasAuditTitle = await page.locator("text=Historique des modifications").count();
          console.log("Titre 'Historique des modifications' visible :", hasAuditTitle > 0);
        }
      }
    }
  } catch (e: any) {
    console.log("Interaction echouee :", e.message);
  }

  // Rapport
  console.log("\n=== RAPPORT FINAL ===");
  console.log("Console errors :", consoleErrors.length);
  consoleErrors.slice(0, 10).forEach((e, i) => console.log("  [" + i + "] " + e.substring(0, 200)));

  const files = fs.readdirSync(SCREENSHOTS_DIR).filter((f) => f.endsWith(".png"));
  console.log("Fichiers PNG :", files.length);
  files.forEach((f) => {
    const stat = fs.statSync(path.join(SCREENSHOTS_DIR, f));
    console.log("  " + f + " (" + Math.round(stat.size / 1024) + " Ko)");
  });

  await browser.close();
  console.log("\n=== TERMINE ===");
}

main().catch((e) => {
  console.error("ERREUR FATALE :", e.message);
  process.exit(1);
});