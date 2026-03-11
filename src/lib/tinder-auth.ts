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

export async function sendCode(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${BASE_URL}/v2/auth/sms/send?auth_type=sms`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ phone_number: phoneNumber }),
  });

  const data = await res.json();

  if (!res.ok || data?.error) {
    return { success: false, error: data?.error?.message || `SMS send failed (${res.status})` };
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

  const data = await res.json();

  if (!res.ok || !data?.data?.refresh_token) {
    return { error: data?.error?.message || `OTP verification failed (${res.status})` };
  }

  return { refreshToken: data.data.refresh_token };
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

  const data = await res.json();

  if (!res.ok || !data?.data?.api_token) {
    return { error: data?.error?.message || `Login failed (${res.status})` };
  }

  return { authToken: data.data.api_token };
}
