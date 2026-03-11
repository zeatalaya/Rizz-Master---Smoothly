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

export interface DeviceIds {
  deviceId: string;
  appSessionId: string;
  installId: string;
  funnelSessionId: string;
}

export function generateDeviceIds(): DeviceIds {
  return {
    deviceId: randomUUID().replace(/-/g, "").slice(0, 16),
    appSessionId: randomUUID(),
    installId: Buffer.from(randomUUID()).toString("base64").slice(0, 22),
    funnelSessionId: randomUUID(),
  };
}

function getHeaders(ids: DeviceIds): Record<string, string> {
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
    "persistent-device-id": ids.deviceId,
    "app-session-id": ids.appSessionId,
    "install-id": ids.installId,
    "app-session-time-elapsed": (Math.random() * 2).toFixed(3),
    "funnel-session-id": ids.funnelSessionId,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AuthStep = (
  | { step: "otp_sent"; refreshToken: string; phone: string; otpLength: number; smsSent: boolean }
  | { step: "email_required"; refreshToken: string; email: string; otpLength: number }
  | { step: "login_success"; authToken: string; refreshToken: string; userId: string }
  | { step: "captcha_required"; referenceToken: string }
  | { step: "error"; message: string }
) & { _rawDebug?: any };

async function sendAuthRequest(payload: Record<string, unknown>, ids: DeviceIds): Promise<AuthStep> {
  const errMsg = AuthGatewayRequest.verify(payload);
  if (errMsg) return { step: "error", message: `Proto verify: ${errMsg}` };

  const message = AuthGatewayRequest.create(payload);
  const encoded = AuthGatewayRequest.encode(message).finish();
  const buffer = Buffer.from(encoded);

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      ...getHeaders(ids),
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

  // Build debug payload
  const _rawDebug = {
    hex: respBuffer.toString("hex").slice(0, 500),
    decoded: JSON.stringify(AuthGatewayResponse.toObject(decoded, { defaults: false, longs: String })),
    status: res.status,
  };

  // Check for error
  if (decoded.error && decoded.error.code && decoded.error.code !== 0) {
    return { step: "error", message: decoded.error.message || `Auth error (${decoded.error.code})`, _rawDebug } as AuthStep;
  }

  const resp = decoded;

  if (resp.validatePhoneOtpState) {
    const s = resp.validatePhoneOtpState;
    const rt = unwrapValue(s.refreshToken);
    return {
      step: "otp_sent",
      refreshToken: rt || "",
      phone: s.phone || "",
      otpLength: unwrapValue(s.otpLength) || 6,
      smsSent: unwrapValue(s.smsSent) ?? true,
      _rawDebug,
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

export async function sendPhoneCode(phone: string, ids: DeviceIds): Promise<AuthStep> {
  return sendAuthRequest({ phone: { phone } }, ids);
}

export async function verifyPhoneOtp(phone: string, otp: string, refreshToken: string, ids: DeviceIds): Promise<AuthStep> {
  return sendAuthRequest({
    phoneOtp: {
      phone: { value: phone },
      otp,
      refreshToken,
    },
  }, ids);
}

export async function verifyEmailOtp(otp: string, refreshToken: string, ids: DeviceIds): Promise<AuthStep> {
  return sendAuthRequest({
    emailOtp: {
      otp,
      refreshToken: { value: refreshToken },
    },
  }, ids);
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
