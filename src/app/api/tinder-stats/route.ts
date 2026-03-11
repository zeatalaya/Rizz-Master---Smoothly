import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fetchTinderStats } from "@/lib/tinder-api";

export async function GET() {
  try {
    const session = await getSession();

    if (!session.tinderToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const stats = await fetchTinderStats(session.tinderToken);

    // Cache the user's name in session
    if (stats.myName && !session.userName) {
      session.userName = stats.myName;
      await session.save();
    }

    return NextResponse.json(stats);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("401")) {
      return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
