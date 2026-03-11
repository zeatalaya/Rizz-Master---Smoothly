/**
 * TEE-style encrypted session management.
 *
 * The Tinder auth token is sealed inside an iron-session cookie that is:
 *   - AES-256 encrypted at rest (never stored in plaintext)
 *   - httpOnly — inaccessible to client-side JS
 *   - Signed to prevent tampering
 *   - Server-side only — the token never leaves the secure boundary
 *
 * This gives us a Trusted Execution Environment pattern: sensitive
 * credentials are processed exclusively on the server, encrypted in
 * transit, and the client only holds an opaque sealed cookie.
 */

import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  tinderToken?: string;
  refreshToken?: string;
  phone?: string;
  userName?: string;
  deviceId?: string;
  appSessionId?: string;
  installId?: string;
  funnelSessionId?: string;
}

const SESSION_OPTIONS = {
  password:
    process.env.SESSION_SECRET ||
    "TEE-rizz-master-smoothly-32char-secret-key!!", // override in prod via env
  cookieName: "rizz_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24, // 24 hours
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, SESSION_OPTIONS);
}
