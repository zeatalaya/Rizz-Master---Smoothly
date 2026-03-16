import { NextResponse } from "next/server";
import { isDstackAvailable } from "@/lib/dstack";

export async function GET() {
  // Check if Puppeteer/Chrome is available (local dev with display)
  let puppeteer = false;
  try {
    const mod = await import("puppeteer");
    const browser = await mod.default.launch({
      headless: true,
      args: ["--no-sandbox"],
    });
    await browser.close();
    // Only enable if not in Docker (no display for headed mode)
    puppeteer = !process.env.DSTACK_SIMULATOR_ENDPOINT && process.env.NODE_ENV !== "production";
  } catch {
    puppeteer = false;
  }

  const tee = await isDstackAvailable();

  return NextResponse.json({ puppeteer, tee });
}
