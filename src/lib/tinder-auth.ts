/**
 * Tinder auth helper.
 *
 * Since Tinder's v3 auth uses protobuf + arkose captcha, we extract
 * the token from the user's existing Tinder web session instead.
 *
 * The user logs into tinder.com normally, then uses our bookmarklet
 * or manually copies the token from DevTools / localStorage.
 *
 * The token is then sealed in an iron-session encrypted cookie (TEE).
 */

const BASE_URL = "https://api.gotinder.com";

const HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "Tinder/14.21.0 (iPhone; iOS 16.6; Scale/3.00)",
  platform: "ios",
  "app-version": "5430",
};

export async function validateToken(token: string): Promise<{ valid: boolean; name?: string; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/v2/profile?include=user`, {
      headers: { ...HEADERS, "X-Auth-Token": token },
    });

    if (!res.ok) {
      const text = await res.text();
      let msg = `Invalid token (${res.status})`;
      try {
        const json = JSON.parse(text);
        if (json?.error?.message) msg = json.error.message;
      } catch {
        // ignore
      }
      return { valid: false, error: msg };
    }

    const data = await res.json();
    const name = data?.data?.user?.name || "Unknown";
    return { valid: true, name };
  } catch (err: unknown) {
    return { valid: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}
