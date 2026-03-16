import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  try {
    // Dynamic import — puppeteer only available locally (not on Vercel)
    const puppeteer = await import("puppeteer");

    const browser = await puppeteer.default.launch({
      headless: false,
      defaultViewport: null,
      args: [
        "--window-size=420,750",
        "--disable-blink-features=AutomationControlled",
        "--window-position=100,100",
      ],
    });

    const page = (await browser.pages())[0] || await browser.newPage();

    // Intercept network requests to capture auth token
    let authToken: string | null = null;

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const token = req.headers()["x-auth-token"];
      if (token && !authToken) {
        authToken = token;
      }
      req.continue();
    });

    page.on("response", async (res) => {
      if (authToken) return;
      const url = res.url();
      if (url.includes("gotinder.com") && url.includes("auth")) {
        try {
          const text = await res.text();
          const match = text.match(/"api_token"\s*:\s*"([^"]+)"/);
          if (match) authToken = match[1];
        } catch { /* ignore */ }
      }
    });

    await page.goto("https://tinder.com", { waitUntil: "networkidle2" });

    // Poll for auth token from network interception + localStorage
    const token = await new Promise<string | null>((resolve) => {
      const interval = setInterval(async () => {
        if (authToken) {
          clearInterval(interval);
          resolve(authToken);
          return;
        }
        try {
          const stored = await page.evaluate(() => {
            for (const key of Object.keys(localStorage)) {
              const val = localStorage.getItem(key);
              if (val && key.toLowerCase().includes("token")) {
                try {
                  const parsed = JSON.parse(val!);
                  if (typeof parsed === "string" && parsed.length > 20) return parsed;
                  if (parsed?.api_token) return parsed.api_token;
                  if (parsed?.token) return parsed.token;
                } catch {
                  if (typeof val === "string" && val.length > 20 && val.length < 200) return val;
                }
              }
            }
            const tKey = Object.keys(localStorage).find((k) => k.includes("TinderWeb"));
            if (tKey) {
              try {
                const d = JSON.parse(localStorage.getItem(tKey)!);
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
        } catch { /* page navigated */ }
      }, 1500);

      browser.on("disconnected", () => {
        clearInterval(interval);
        resolve(null);
      });
    });

    await browser.close().catch(() => {});

    if (!token) {
      return NextResponse.json({ error: "Login cancelled" }, { status: 400 });
    }

    // Try to get user name
    let userName = "User";
    try {
      const profileRes = await fetch("https://api.gotinder.com/v2/profile?include=user", {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Tinder Android Version 14.22.0",
          "X-Auth-Token": token,
          platform: "android",
          "app-version": "4525",
        },
      });
      if (profileRes.ok) {
        const data = await profileRes.json();
        userName = data?.data?.user?.name || "User";
      }
    } catch { /* ignore - may fail from some IPs */ }

    // Seal in session
    const session = await getSession();
    session.tinderToken = token;
    session.userName = userName;
    session.verifiedAt = new Date().toISOString();
    await session.save();

    return NextResponse.json({ success: true, userName });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Login failed" },
      { status: 500 }
    );
  }
}
