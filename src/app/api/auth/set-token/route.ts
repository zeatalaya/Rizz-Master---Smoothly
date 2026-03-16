import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

async function sealToken(token: string, userId?: string) {
  const session = await getSession();
  session.tinderToken = token;
  session.verifiedAt = new Date().toISOString();
  if (userId) session.phone = userId;

  // Try to get user name (may fail from datacenter IP, that's ok)
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
      session.userName = data?.data?.user?.name || "User";
    }
  } catch {
    session.userName = "User";
  }

  await session.save();
  return session.userName || "User";
}

// POST — called from client-side JS (LoginFlow token input)
export async function POST(req: NextRequest) {
  try {
    const { token, userId } = await req.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }
    const userName = await sealToken(token, userId);
    return NextResponse.json({ success: true, userName });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to set token" },
      { status: 500 }
    );
  }
}

// GET — called via browser redirect from login.mjs (sets cookie in browser context)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  await sealToken(token);
  return NextResponse.redirect(new URL("/", req.url));
}
