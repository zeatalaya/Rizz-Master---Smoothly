#!/usr/bin/env node
/**
 * Automated Tinder web login — opens tinder.com, lets user login normally,
 * extracts the auth token, and passes it to the local app.
 *
 * Usage: node login.mjs
 */

import puppeteer from "puppeteer";

const APP_PORT = 3069;
const APP_URL = `http://localhost:${APP_PORT}`;

async function main() {
  console.log("\n🔥 Rizz Master — Tinder Web Login\n");
  console.log("Opening Tinder in a browser window...");
  console.log("Login normally (Google, Facebook, or Phone).");
  console.log("Your auth token will be extracted automatically.\n");

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--window-size=420,750", "--disable-blink-features=AutomationControlled"],
  });

  const page = (await browser.pages())[0] || await browser.newPage();

  // Intercept API requests to capture the auth token
  let authToken = null;

  await page.setRequestInterception(true);
  page.on("request", (req) => {
    // Check outgoing requests for X-Auth-Token header
    const token = req.headers()["x-auth-token"];
    if (token && !authToken) {
      authToken = token;
      console.log("✓ Auth token captured!");
    }
    req.continue();
  });

  // Also monitor responses for token in body
  page.on("response", async (res) => {
    if (authToken) return;
    const url = res.url();
    // Tinder login endpoints that return tokens
    if (url.includes("gotinder.com") && url.includes("auth")) {
      try {
        const text = await res.text();
        // Try to find api_token or auth_token in JSON responses
        const match = text.match(/"api_token"\s*:\s*"([^"]+)"/);
        if (match) {
          authToken = match[1];
          console.log("✓ Auth token captured from login response!");
        }
      } catch {
        // ignore non-text responses
      }
    }
  });

  await page.goto("https://tinder.com", { waitUntil: "networkidle2" });

  console.log("⏳ Waiting for you to login...");
  console.log("   (this window will close automatically after login)\n");

  // Poll for auth token — check both network interception and localStorage
  const token = await new Promise((resolve) => {
    const interval = setInterval(async () => {
      // Check if we got it from network interception
      if (authToken) {
        clearInterval(interval);
        resolve(authToken);
        return;
      }

      // Check localStorage for token
      try {
        const stored = await page.evaluate(() => {
          // Tinder web stores tokens in various localStorage keys
          for (const key of Object.keys(localStorage)) {
            const val = localStorage.getItem(key);
            if (val && key.toLowerCase().includes("token")) {
              try {
                const parsed = JSON.parse(val);
                if (typeof parsed === "string" && parsed.length > 20) return parsed;
                if (parsed?.api_token) return parsed.api_token;
                if (parsed?.token) return parsed.token;
              } catch {
                if (typeof val === "string" && val.length > 20 && val.length < 200) return val;
              }
            }
          }
          // Also check for TinderWeb specific storage
          const tKey = Object.keys(localStorage).find(k => k.includes("TinderWeb"));
          if (tKey) {
            try {
              const d = JSON.parse(localStorage.getItem(tKey));
              if (d?.APIToken) return d.APIToken;
              if (d?.api_token) return d.api_token;
              if (d?.authToken) return d.authToken;
            } catch { /* ignore */ }
          }
          return null;
        });
        if (stored) {
          clearInterval(interval);
          resolve(stored);
        }
      } catch {
        // page may have navigated, ignore
      }
    }, 1500);

    // Also check if browser was closed
    browser.on("disconnected", () => {
      clearInterval(interval);
      resolve(null);
    });
  });

  if (!token) {
    console.log("❌ No token captured. Browser was closed before login completed.");
    process.exit(1);
  }

  console.log(`\n✓ Got auth token (${token.slice(0, 8)}...${token.slice(-4)})`);

  // Close browser
  await browser.close();

  // Send token to local app
  console.log("Connecting to Rizz Master...");
  try {
    const res = await fetch(`${APP_URL}/api/auth/set-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`✓ Logged in as ${data.userName || "User"}!`);
      console.log(`\n🚀 Opening dashboard...\n`);
      // Open the app in default browser
      const { exec } = await import("child_process");
      exec(`open "${APP_URL}"`);
    } else {
      console.log(`\n⚠️  Token might be invalid. Try pasting it manually at ${APP_URL}`);
      console.log(`Token: ${token}\n`);
    }
  } catch {
    // App might not be running locally — show token for manual use
    console.log(`\n⚠️  Local app not running. Start it with: npm run rizz`);
    console.log(`Then paste this token using "Use auth token instead":`);
    console.log(`\n${token}\n`);
  }
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
