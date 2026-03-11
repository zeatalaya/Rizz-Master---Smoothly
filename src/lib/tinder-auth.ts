/**
 * Tinder authentication via phone number + SMS OTP.
 *
 * Flow:
 *   1. sendCode()    → Tinder sends an SMS to the user's phone
 *   2. verifyCode()  → User submits OTP → we get a refresh_token
 *   3. loginWithToken() → Exchange refresh_token for X-Auth-Token
 *
 * All calls run server-side inside our TEE boundary.
 */

const BASE_URL = "https://api.gotinder.com";

const HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "Tinder/14.21.0 (iPhone; iOS 16.6; Scale/3.00)",
  platform: "ios",
  "app-version": "5430",
};

async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractError(data: Record<string, unknown> | null, status: number, fallback: string): string {
  if (!data) return `${fallback} (${status} — empty response)`;
  const err = data.error as Record<string, unknown> | undefined;
  if (err?.message && typeof err.message === "string") return err.message;
  if (typeof data.error === "string") return data.error;
  return `${fallback} (${status})`;
}

export async function sendCode(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${BASE_URL}/v2/auth/sms/send?auth_type=sms`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ phone_number: phoneNumber }),
  });

  const data = await safeJson(res);

  if (!res.ok || (data && data.error)) {
    return { success: false, error: extractError(data, res.status, "SMS send failed") };
  }

  return { success: true };
}

export async function verifyCode(
  phoneNumber: string,
  otpCode: string
): Promise<{ refreshToken?: string; error?: string }> {
  const res = await fetch(`${BASE_URL}/v2/auth/sms/validate?auth_type=sms`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      otp_code: otpCode,
      phone_number: phoneNumber,
      is_update: false,
    }),
  });

  const data = await safeJson(res);

  const nested = data?.data as Record<string, unknown> | undefined;
  if (!res.ok || !nested?.refresh_token) {
    return { error: extractError(data, res.status, "OTP verification failed") };
  }

  return { refreshToken: nested.refresh_token as string };
}

export async function loginWithToken(
  refreshToken: string,
  phoneNumber: string
): Promise<{ authToken?: string; error?: string }> {
  const res = await fetch(`${BASE_URL}/v2/auth/login/sms`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      token: refreshToken,
      phone_number: phoneNumber,
    }),
  });

  const data = await safeJson(res);

  const nested = data?.data as Record<string, unknown> | undefined;
  if (!res.ok || !nested?.api_token) {
    return { error: extractError(data, res.status, "Login failed") };
  }

  return { authToken: nested.api_token as string };
}
