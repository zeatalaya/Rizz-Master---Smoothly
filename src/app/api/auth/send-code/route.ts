import { NextRequest, NextResponse } from "next/server";
import { sendCode } from "@/lib/tinder-auth";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const result = await sendCode(phone);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Store phone in session for the verify step
    const session = await getSession();
    session.phone = phone;
    await session.save();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send code" },
      { status: 500 }
    );
  }
}
