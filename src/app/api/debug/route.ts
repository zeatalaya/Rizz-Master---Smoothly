import { NextRequest, NextResponse } from "next/server";
import protobuf from "protobufjs";
import protoJson from "@/lib/tinder-proto.json";
import { randomUUID } from "crypto";

const AUTH_URL = "https://api.gotinder.com/v3/auth/login";
const root = protobuf.Root.fromJSON(protoJson);
const AuthGatewayRequest = root.lookupType("AuthGatewayRequest");
const AuthGatewayResponse = root.lookupType("AuthGatewayResponse");

const DEVICE_ID = randomUUID().replace(/-/g, "").slice(0, 16);

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
    "app-session-id": randomUUID(),
    "install-id": Buffer.from(randomUUID()).toString("base64").slice(0, 22),
    "app-session-time-elapsed": (Math.random() * 2).toFixed(3),
    "funnel-session-id": randomUUID(),
  };
}

export async function POST(req: NextRequest) {
  try {
    const { action, phone, otp, refreshToken } = await req.json();

    let payload;
    if (action === "send") {
      payload = { phone: { phone: phone.replace(/[\s()-]/g, "") } };
    } else if (action === "verify") {
      payload = {
        phoneOtp: {
          phone: { value: phone.replace(/[\s()-]/g, "") },
          otp,
          refreshToken: refreshToken || "",
        },
      };
    } else {
      return NextResponse.json({ error: "action must be 'send' or 'verify'" }, { status: 400 });
    }

    const errMsg = AuthGatewayRequest.verify(payload);
    if (errMsg) {
      return NextResponse.json({ error: `Proto verify: ${errMsg}`, payload }, { status: 400 });
    }

    const message = AuthGatewayRequest.create(payload);
    const encoded = AuthGatewayRequest.encode(message).finish();
    const buffer = Buffer.from(encoded);

    const reqHex = buffer.toString("hex");

    const res = await fetch(AUTH_URL, {
      method: "POST",
      headers: { ...getHeaders(), "content-length": String(buffer.length) },
      body: buffer,
    });

    const respBuffer = Buffer.from(await res.arrayBuffer());
    const respHex = respBuffer.toString("hex");

    let decoded = null;
    let decodedJson = null;
    try {
      const msg = AuthGatewayResponse.decode(respBuffer);
      decoded = AuthGatewayResponse.toObject(msg, { defaults: true, longs: String, enums: String });
      decodedJson = JSON.stringify(decoded, null, 2);
    } catch (e) {
      decodedJson = `Decode error: ${e instanceof Error ? e.message : e}`;
    }

    return NextResponse.json({
      request: {
        payload,
        hex: reqHex,
        hexLength: buffer.length,
      },
      response: {
        status: res.status,
        hex: respHex,
        hexLength: respBuffer.length,
        decoded,
        decodedJson,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Debug error" },
      { status: 500 }
    );
  }
}
