import { NextRequest, NextResponse } from "next/server";
import { sendPhoneCode } from "@/lib/tinder-auth";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const cleanPhone = phone.replace(/[\s()-]/g, "");
    const result = await sendPhoneCode(cleanPhone);

    if (result.step === "error") {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    // Store auth state in session
    const session = await getSession();
    session.phone = cleanPhone;
    if ("refreshToken" in result) {
      session.refreshToken = result.refreshToken;
    }
    await session.save();

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send code" },
      { status: 500 }
    );
  }
}
