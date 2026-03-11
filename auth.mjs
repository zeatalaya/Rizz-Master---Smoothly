#!/usr/bin/env node
/**
 * Local auth script — authenticates with Tinder from your machine's IP,
 * then syncs the token to the deployed Vercel app.
 *
 * Usage: node auth.mjs
 */

import protobuf from "protobufjs";
import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import { createInterface } from "readline";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const protoJson = JSON.parse(readFileSync(join(__dirname, "src/lib/tinder-proto.json"), "utf8"));

const AUTH_URL = "https://api.gotinder.com/v3/auth/login";
const APP_URL = process.env.APP_URL || "https://rizz-master-smoothly.vercel.app";

const root = protobuf.Root.fromJSON(protoJson);
const AuthGatewayRequest = root.lookupType("AuthGatewayRequest");
const AuthGatewayResponse = root.lookupType("AuthGatewayResponse");

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a.trim()); }));
}

function generateDeviceIds() {
  return {
    deviceId: randomUUID().replace(/-/g, "").slice(0, 16),
    appSessionId: randomUUID(),
    installId: Buffer.from(randomUUID()).toString("base64").slice(0, 22),
    funnelSessionId: randomUUID(),
  };
}

function getHeaders(ids) {
  return {
    "user-agent": "Tinder Android Version 14.22.0",
    "app-version": "4525",
    platform: "android",
    "platform-variant": "Google-Play",
    "os-version": "30",
    "tinder-version": "14.22.0",
    "store-variant": "Play-Store",
    "x-supported-image-formats": "webp",
    "accept-language": "en-US",
    "accept-encoding": "gzip",
    "content-type": "application/x-google-protobuf",
    "persistent-device-id": ids.deviceId,
    "app-session-id": ids.appSessionId,
    "install-id": ids.installId,
    "app-session-time-elapsed": (Math.random() * 2).toFixed(3),
    "funnel-session-id": ids.funnelSessionId,
  };
}

function unwrapValue(obj) {
  if (obj === null || obj === undefined) return obj;
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

async function sendAuthRequest(payload, ids) {
  const msg = AuthGatewayRequest.create(payload);
  const encoded = AuthGatewayRequest.encode(msg).finish();
  const buffer = Buffer.from(encoded);

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { ...getHeaders(ids), "content-length": String(buffer.length) },
    body: buffer,
  });

  const respBuffer = Buffer.from(await res.arrayBuffer());
  if (respBuffer.length === 0) throw new Error(`Empty response (HTTP ${res.status})`);

  const decoded = AuthGatewayResponse.decode(respBuffer);
  if (decoded.error && decoded.error.code && decoded.error.code !== 0) {
    throw new Error(`Tinder error ${decoded.error.code}: ${decoded.error.message || "unknown"}`);
  }

  return decoded;
}

async function main() {
  console.log("\n🔥 Rizz Master — Local Authentication\n");
  console.log("This authenticates with Tinder from your local IP,");
  console.log(`then syncs the token to ${APP_URL}\n`);

  const phone = await ask("Phone number (with country code, e.g. +351917470069): ");
  if (!phone) { console.log("No phone number provided."); process.exit(1); }

  const ids = generateDeviceIds();
  console.log("\nSending SMS...");

  const smsResp = await sendAuthRequest({ phone: { phone } }, ids);

  let refreshToken = "";
  if (smsResp.validatePhoneOtpState) {
    refreshToken = unwrapValue(smsResp.validatePhoneOtpState.refreshToken) || "";
    const sent = unwrapValue(smsResp.validatePhoneOtpState.smsSent);
    console.log(sent ? "✓ SMS sent!" : "✓ Ready for OTP.");
  } else if (smsResp.getPhoneState) {
    refreshToken = unwrapValue(smsResp.getPhoneState.refreshToken) || "";
    console.log("✓ Ready for OTP.");
  } else {
    console.log("Unexpected response:", JSON.stringify(smsResp));
    process.exit(1);
  }

  const otp = await ask("Enter the SMS code: ");

  console.log("Verifying OTP...");
  const phoneOtp = { phone: { value: phone }, otp };
  if (refreshToken) phoneOtp.refreshToken = { value: refreshToken };
  const otpResp = await sendAuthRequest({ phoneOtp }, ids);

  // Check if email step is needed
  if (otpResp.validateEmailOtpState) {
    const emailState = otpResp.validateEmailOtpState;
    refreshToken = unwrapValue(emailState.refreshToken) || refreshToken;
    const email = emailState.maskedEmail || emailState.unmaskedEmail || "your email";
    console.log(`\n📧 Email verification required. Check ${email}`);

    const emailCode = await ask("Enter the email code: ");
    console.log("Verifying email OTP...");

    const emailOtp = { otp: emailCode };
    if (refreshToken) emailOtp.refreshToken = { value: refreshToken };
    const emailResp = await sendAuthRequest({ emailOtp }, ids);

    if (emailResp.loginResult) {
      return handleLoginSuccess(emailResp.loginResult);
    }
    console.log("Unexpected email OTP response:", JSON.stringify(emailResp));
    process.exit(1);
  }

  if (otpResp.loginResult) {
    return handleLoginSuccess(otpResp.loginResult);
  }

  console.log("Unexpected OTP response:", JSON.stringify(otpResp));
  process.exit(1);
}

async function handleLoginSuccess(loginResult) {
  const token = loginResult.authToken;
  const userId = loginResult.userId;

  if (!token) {
    console.log("❌ No auth token in login result");
    process.exit(1);
  }

  console.log(`\n✓ Authenticated! User ID: ${userId}`);
  console.log("Syncing token to Vercel app...");

  // Seal the token in the Vercel app's encrypted session
  const res = await fetch(`${APP_URL}/api/auth/set-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, userId }),
  });

  if (res.ok) {
    const data = await res.json();
    console.log(`✓ Token synced! Welcome, ${data.userName || "User"}`);
    console.log(`\n🚀 Open ${APP_URL} in your browser to view your stats!\n`);

    // Try to open browser
    const { exec } = await import("child_process");
    exec(`open "${APP_URL}"`);
  } else {
    const err = await res.json().catch(() => ({}));
    console.log(`\n⚠️  Could not sync to Vercel (${res.status}): ${err.error || "unknown"}`);
    console.log("You can manually set your token at the app.");
    console.log(`\nYour auth token: ${token}\n`);
  }
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
