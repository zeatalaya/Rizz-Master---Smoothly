/**
 * Tinder v3 authentication using protobuf.
 *
 * Flow:
 *   1. sendPhoneCode() → sends SMS via protobuf to /v3/auth/login
 *   2. verifyPhoneOtp() → validates OTP, may get loginResult or email step
 *   3. verifyEmailOtp() → if email verification required
 *
 * All runs server-side (TEE boundary). Token never leaves the server.
 */

import protobuf from "protobufjs";
import protoJson from "./tinder-proto.json";
import { randomUUID } from "crypto";

const AUTH_URL = "https://api.gotinder.com/v3/auth/login";

// Load protobuf types
const root = protobuf.Root.fromJSON(protoJson);
const AuthGatewayRequest = root.lookupType("AuthGatewayRequest");
const AuthGatewayResponse = root.lookupType("AuthGatewayResponse");

// Persistent device fingerprint (generated once per server instance)
const DEVICE_ID = randomUUID().replace(/-/g, "").slice(0, 16);
const APP_SESSION_ID = randomUUID();

function getHeaders(): Record<string, string> {
  return {
    "user-agent": "Tinder Android Version 14.22.0",
    "app-version": "4525",
    "platform": "android",
    "platform-variant": "Google-Play",
    "os-version": "30",
    "tinder-version": "14.22.0",
    "store-variant": "Play-Store",
    "x-supported-image-formats": "webp",
    "accept-language": "en-US",
    "accept-encoding": "gzip",
    "content-type": "application/x-protobuf",
    "persistent-device-id": DEVICE_ID,
    "app-session-id": APP_SESSION_ID,
    "install-id": Buffer.from(randomUUID()).toString("base64").slice(0, 22),
    "app-session-time-elapsed": (Math.random() * 2).toFixed(3),
    "funnel-session-id": randomUUID(),
    "appsflyer-id": randomUUID(),
    "advertising-id": randomUUID(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrapValue(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  // protobufjs may wrap values as {value: ...} or as message objects with toJSON
  if (typeof obj === "object") {
    if (typeof obj.toJSON === "function") {
      const json = obj.toJSON();
      if (json && typeof json === "object" && "value" in json) return json.value;
      return json;
    }
    if ("value" in obj) return obj.value;
  }
  return obj;
}

export type AuthStep =
  | { step: "otp_sent"; refreshToken: string; phone: string; otpLength: number; smsSent: boolean }
  | { step: "email_required"; refreshToken: string; email: string; otpLength: number }
  | { step: "login_success"; authToken: string; refreshToken: string; userId: string }
  | { step: "captcha_required"; referenceToken: string }
  | { step: "error"; message: string };

async function sendAuthRequest(payload: Record<string, unknown>): Promise<AuthStep> {
  const errMsg = AuthGatewayRequest.verify(payload);
  if (errMsg) return { step: "error", message: `Proto verify: ${errMsg}` };

  const message = AuthGatewayRequest.create(payload);
  const encoded = AuthGatewayRequest.encode(message).finish();
  const buffer = Buffer.from(encoded);

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      ...getHeaders(),
      "content-length": String(buffer.length),
    },
    body: buffer,
  });

  const respBuffer = Buffer.from(await res.arrayBuffer());

  if (respBuffer.length === 0) {
    return { step: "error", message: `Empty response (${res.status})` };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decoded = AuthGatewayResponse.decode(respBuffer) as any;

  // Check for error
  if (decoded.error && decoded.error.code && decoded.error.code !== 0) {
    return { step: "error", message: decoded.error.message || `Auth error (${decoded.error.code})` };
  }

  const resp = decoded;

  // Debug: log the decoded response structure
  console.log("[tinder-auth] Response keys:", Object.keys(resp).filter(k => resp[k] != null));
  if (resp.validatePhoneOtpState) {
    console.log("[tinder-auth] validatePhoneOtpState raw:", JSON.stringify(resp.validatePhoneOtpState));
  }

  if (resp.validatePhoneOtpState) {
    const s = resp.validatePhoneOtpState;
    const rt = unwrapValue(s.refreshToken);
    console.log("[tinder-auth] refreshToken unwrapped:", rt, "type:", typeof rt, "length:", rt?.length);
    return {
      step: "otp_sent",
      refreshToken: rt || "",
      phone: s.phone || "",
      otpLength: unwrapValue(s.otpLength) || 6,
      smsSent: unwrapValue(s.smsSent) ?? true,
    };
  }

  if (resp.validateEmailOtpState) {
    const s = resp.validateEmailOtpState;
    return {
      step: "email_required",
      refreshToken: unwrapValue(s.refreshToken) || "",
      email: s.maskedEmail || s.unmaskedEmail || "",
      otpLength: unwrapValue(s.otpLength) || 6,
    };
  }

  if (resp.loginResult) {
    const r = resp.loginResult;
    return {
      step: "login_success",
      authToken: r.authToken || "",
      refreshToken: r.refreshToken || "",
      userId: r.userId || "",
    };
  }

  if (resp.captchaState) {
    return {
      step: "captcha_required",
      referenceToken: resp.captchaState.referenceToken || "",
    };
  }

  if (resp.getPhoneState) {
    return {
      step: "otp_sent",
      refreshToken: unwrapValue(resp.getPhoneState.refreshToken) || "",
      phone: "",
      otpLength: 6,
      smsSent: false,
    };
  }

  return { step: "error", message: "Unexpected auth response state" };
}

export async function sendPhoneCode(phone: string): Promise<AuthStep> {
  return sendAuthRequest({
    phone: { phone },
  });
}

export async function verifyPhoneOtp(phone: string, otp: string, refreshToken: string): Promise<AuthStep> {
  return sendAuthRequest({
    phoneOtp: {
      phone: { value: phone },
      otp,
      refreshToken,
    },
  });
}

export async function verifyEmailOtp(otp: string, refreshToken: string): Promise<AuthStep> {
  return sendAuthRequest({
    emailOtp: {
      otp,
      refreshToken: { value: refreshToken },
    },
  });
}

export async function validateToken(token: string): Promise<{ valid: boolean; name?: string; error?: string }> {
  try {
    const res = await fetch("https://api.gotinder.com/v2/profile?include=user", {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Tinder Android Version 14.22.0",
        "X-Auth-Token": token,
        platform: "android",
        "app-version": "4525",
      },
    });
    if (!res.ok) return { valid: false, error: `Invalid token (${res.status})` };
    const data = await res.json();
    return { valid: true, name: data?.data?.user?.name || "User" };
  } catch {
    return { valid: false, error: "Connection failed" };
  }
}
