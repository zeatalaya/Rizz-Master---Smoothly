import { NextRequest, NextResponse } from "next/server";
import { sendPhoneCode, generateDeviceIds } from "@/lib/tinder-auth";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const cleanPhone = phone.replace(/[\s()-]/g, "");

    // Generate device IDs and persist them in the session
    const ids = generateDeviceIds();
    const result = await sendPhoneCode(cleanPhone, ids);

    if (result.step === "error") {
      console.error("[send-code] Tinder auth error:", result.message);
      return NextResponse.json(
        { error: result.message, step: "error", _debug: { message: result.message } },
        { status: 400 }
      );
    }

    // Store auth state + device IDs in session
    const session = await getSession();
    session.phone = cleanPhone;
    session.deviceId = ids.deviceId;
    session.appSessionId = ids.appSessionId;
    session.installId = ids.installId;
    session.funnelSessionId = ids.funnelSessionId;
    if ("refreshToken" in result) {
      session.refreshToken = result.refreshToken;
    }
    await session.save();

    // Also send device IDs to client as fallback (session may not persist on Vercel)
    return NextResponse.json({
      ...result,
      _deviceIds: ids,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send code" },
      { status: 500 }
    );
  }
}
