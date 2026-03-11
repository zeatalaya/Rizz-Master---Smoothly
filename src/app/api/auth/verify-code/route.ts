import { NextRequest, NextResponse } from "next/server";
import { verifyCode, loginWithToken } from "@/lib/tinder-auth";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    const session = await getSession();

    if (!session.phone) {
      return NextResponse.json({ error: "No phone number in session. Start over." }, { status: 400 });
    }

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Verification code is required" }, { status: 400 });
    }

    // Step 1: Validate OTP → get refresh token
    const verifyResult = await verifyCode(session.phone, code);
    if (!verifyResult.refreshToken) {
      return NextResponse.json({ error: verifyResult.error || "Invalid code" }, { status: 400 });
    }

    // Step 2: Exchange refresh token for auth token
    const loginResult = await loginWithToken(verifyResult.refreshToken, session.phone);
    if (!loginResult.authToken) {
      return NextResponse.json({ error: loginResult.error || "Login failed" }, { status: 400 });
    }

    // Seal the auth token inside the encrypted session (TEE boundary)
    session.tinderToken = loginResult.authToken;
    session.refreshToken = verifyResult.refreshToken;
    await session.save();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed" },
      { status: 500 }
    );
  }
}
