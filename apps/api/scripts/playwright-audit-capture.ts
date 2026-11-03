/// <reference lib="dom" />
import { chromium, Browser, Page } from "playwright";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = "http://localhost:5173";
const API_URL = "http://localhost:3000/api/v1";
const SCREENSHOTS_DIR = path.join(__dirname, "..", "..", "..", "playwright_screenshots");

if (!fs.existsSync(SCREENSHOTS_DIR)) { fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true }); }

async function loginViaApi() {
  const res = await axios.post(API_URL + "/auth/login",
    { identifier: "admin@sis-mali.local", password: "Admin@2026" },
    { timeout: 15000 });
  const d = res.data.data || res.data;
  return { accessToken: d.accessToken, refreshToken: d.refreshToken, user: d.user };
}

async function main() {
  console.log("=== Playwright AuditPanel capture ===");
  const auth = await loginViaApi();
  console.log("Login OK");

  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1200 }, locale: "fr-FR" });
  const page = await context.newPage();

  await page.addInitScript((a: any) => {
    try {
      const w = window as any;
      w.localStorage.setItem("sis_access_token", a.accessToken);
      w.localStorage.setItem("sis_refresh_token", a.refreshToken);
      if (a.user) w.localStorage.setItem("sis_user", JSON.stringify(a.user));
    } catch (e) {}
  }, auth);

  // 1. Aller sur /coefficients
  await page.goto(BASE_URL + "/coefficients", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  // 2. Ouvrir select niveau et choisir "7eme"
  const selectTrigger = page.locator('button:has-text("Choisir un niveau")').first();
  await selectTrigger.click();
  await page.waitForTimeout(500);

  // Chercher l'option 7eme
  const options = page.locator('[role="option"]');
  const count = await options.count();
  console.log("Options niveau disponibles :", count);
  let clicked = false;
  for (let i = 0; i < count; i++) {
    const txt = await options.nth(i).textContent();
    if (txt && (txt.includes("7") || txt.includes("sept"))) {
      console.log("Selection :", txt);
      await options.nth(i).click();
      clicked = true;
      break;
    }
  }
  if (!clicked && count > 0) {
    console.log("Fallback : premiere option");
    await options.nth(0).click();
  }
  await page.waitForTimeout(2500);

  const screenshot1 = path.join(SCREENSHOTS_DIR, "05_coefficients_avec_matiere.png");
  await page.screenshot({ path: screenshot1, fullPage: true });
  console.log("Screenshot :", screenshot1);

  // 3. Cliquer sur le bouton Historique (premier de la liste)
  const histBtn = page.locator('button[title="Voir l\'historique"]').first();
  const histCount = await histBtn.count();
  console.log("Boutons Historique trouves :", histCount);

  if (histCount > 0) {
    await histBtn.click();
    await page.waitForTimeout(2000);

    const screenshot2 = path.join(SCREENSHOTS_DIR, "06_historique_ouvert.png");
    await page.screenshot({ path: screenshot2, fullPage: true });
    console.log("Screenshot :", screenshot2);

    // Verifier la presence du panneau
    const hasPanel = await page.locator("text=Historique des modifications").count();
    console.log("Panneau 'Historique des modifications' visible :", hasPanel > 0);

    const hasCreate = await page.locator("text=CREATE").count();
    const hasUpdate = await page.locator("text=UPDATE").count();
    console.log("Badge CREATE :", hasCreate, "| Badge UPDATE :", hasUpdate);
  }

  // Rapport
  const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith(".png"));
  console.log("\n=== FICHIERS PNG ===");
  files.forEach(f => {
    const stat = fs.statSync(path.join(SCREENSHOTS_DIR, f));
    console.log("  " + f + " (" + Math.round(stat.size / 1024) + " Ko)");
  });

  await browser.close();
  console.log("=== TERMINE ===");
}

main().catch(e => { console.error("ERREUR :", e.message); process.exit(1); });