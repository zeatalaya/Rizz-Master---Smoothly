import { NextRequest, NextResponse } from "next/server";
import { validateToken } from "@/lib/tinder-auth";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string" || token.length < 10) {
      return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
    }

    // Validate the token against Tinder's API (server-side only — TEE boundary)
    const result = await validateToken(token.trim());

    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    // Seal the token inside the encrypted session
    const session = await getSession();
    session.tinderToken = token.trim();
    session.userName = result.name;
    await session.save();

    return NextResponse.json({ success: true, name: result.name });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to connect" },
      { status: 500 }
    );
  }
}
