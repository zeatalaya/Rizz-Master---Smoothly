import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { token, userId } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Validate the token by calling Tinder's profile API
    const profileRes = await fetch("https://api.gotinder.com/v2/profile?include=user", {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Tinder Android Version 14.22.0",
        "X-Auth-Token": token,
        platform: "android",
        "app-version": "4525",
      },
    });

    let userName = "User";
    if (profileRes.ok) {
      const data = await profileRes.json();
      userName = data?.data?.user?.name || "User";
    }

    // Seal the token in the encrypted session
    const session = await getSession();
    session.tinderToken = token;
    session.userName = userName;
    if (userId) session.phone = userId;
    await session.save();

    return NextResponse.json({ success: true, userName });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to set token" },
      { status: 500 }
    );
  }
}
