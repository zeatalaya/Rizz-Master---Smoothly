import { NextRequest, NextResponse } from "next/server";
import { verifyPhoneOtp, verifyEmailOtp, validateToken } from "@/lib/tinder-auth";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { code, type, phone, refreshToken: clientRefreshToken } = await req.json();
    const session = await getSession();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    // Use client-provided values as fallback (session may not persist across serverless calls)
    const refreshToken = session.refreshToken || clientRefreshToken;
    const phoneNumber = session.phone || phone;

    console.log("[verify-code] session.refreshToken:", !!session.refreshToken, "clientRefreshToken:", !!clientRefreshToken, "phone:", phoneNumber);

    if (!refreshToken) {
      return NextResponse.json({ error: "No active auth session. Start over." }, { status: 400 });
    }

    let result;

    if (type === "email") {
      result = await verifyEmailOtp(code, refreshToken);
    } else {
      if (!phoneNumber) {
        return NextResponse.json({ error: "No phone number. Start over." }, { status: 400 });
      }
      result = await verifyPhoneOtp(phoneNumber, code, refreshToken);
    }

    if (result.step === "error") {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    // Update refresh token if provided
    if ("refreshToken" in result && result.refreshToken) {
      session.refreshToken = result.refreshToken;
    }

    // If login success, seal the auth token in the encrypted session (TEE)
    if (result.step === "login_success") {
      session.tinderToken = result.authToken;
      session.phone = phoneNumber;

      // Validate and get user name
      const validation = await validateToken(result.authToken);
      if (validation.valid) {
        session.userName = validation.name;
      }

      await session.save();
      return NextResponse.json({ ...result, userName: session.userName });
    }

    await session.save();
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed" },
      { status: 500 }
    );
  }
}
