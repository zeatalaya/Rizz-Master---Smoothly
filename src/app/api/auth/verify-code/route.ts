import { NextRequest, NextResponse } from "next/server";
import { verifyPhoneOtp, verifyEmailOtp, validateToken, type DeviceIds } from "@/lib/tinder-auth";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { code, type, phone, email, refreshToken: clientRefreshToken, deviceIds: clientDeviceIds } = await req.json();
    const session = await getSession();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const refreshToken = session.refreshToken || clientRefreshToken || "";
    const phoneNumber = session.phone || phone;

    // Reconstruct device IDs from session or client fallback
    const ids: DeviceIds = {
      deviceId: session.deviceId || clientDeviceIds?.deviceId || "",
      appSessionId: session.appSessionId || clientDeviceIds?.appSessionId || "",
      installId: session.installId || clientDeviceIds?.installId || "",
      funnelSessionId: session.funnelSessionId || clientDeviceIds?.funnelSessionId || "",
    };

    if (!ids.deviceId) {
      return NextResponse.json({ error: "No device ID. Start over." }, { status: 400 });
    }

    let result;

    if (type === "email") {
      if (!refreshToken) {
        return NextResponse.json({ error: "No refresh token for email step. Start over." }, { status: 400 });
      }
      result = await verifyEmailOtp(code, refreshToken, ids, email);
    } else {
      if (!phoneNumber) {
        return NextResponse.json({ error: "No phone number. Start over." }, { status: 400 });
      }
      result = await verifyPhoneOtp(phoneNumber, code, refreshToken, ids);
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
