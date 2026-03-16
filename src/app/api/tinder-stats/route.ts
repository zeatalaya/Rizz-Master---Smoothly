import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fetchTinderStats } from "@/lib/tinder-api";
import { attestRizzMasterResult, isDstackAvailable } from "@/lib/dstack";

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

    // Attempt TEE attestation of the evaluation result
    let attestation = null;
    const teeAvailable = await isDstackAvailable();
    if (teeAvailable) {
      try {
        attestation = await attestRizzMasterResult({
          userId: stats.myId,
          userName: stats.myName,
          isRizzMaster:
            stats.totalMatches >= 10 &&
            stats.conversationsStartedWithReply >= 5 &&
            stats.likesYouCount >= 50,
          totalMatches: stats.totalMatches,
          conversationsStartedWithReply: stats.conversationsStartedWithReply,
          likesYouCount: stats.likesYouCount,
        });
      } catch {
        // Attestation failed but stats are still valid
      }
    }

    return NextResponse.json({ ...stats, attestation, teeVerified: !!attestation });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("401")) {
      return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
