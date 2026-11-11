export type TelegramWebAppUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};

async function hmacSha256(keyBytes: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, data));
}

export async function validateTelegramInitData(
  initData: string,
  botToken: string
): Promise<TelegramWebAppUser | null> {
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");

  if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) return null;

  const authDate = Number(params.get("auth_date"));
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(authDate) || authDate > now + 60 || now - authDate > 86400) return null;

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const encoder = new TextEncoder();
  const secretKey = await hmacSha256(
    encoder.encode("WebAppData"),
    encoder.encode(botToken)
  );
  const calculatedHash = await hmacSha256(
    secretKey,
    encoder.encode(dataCheckString)
  );
  const calculatedHex = Array.from(calculatedHash, byte => byte.toString(16).padStart(2, "0")).join("");

  // Compare without Node.js Buffer or node:crypto dependencies in the Worker runtime.
  let mismatch = 0;
  for (let index = 0; index < calculatedHex.length; index += 1) {
    mismatch |= calculatedHex.charCodeAt(index) ^ receivedHash.toLowerCase().charCodeAt(index);
  }
  if (mismatch !== 0) return null;

  const rawUser = params.get("user");
  if (!rawUser) return null;

  try {
    const user = JSON.parse(rawUser) as TelegramWebAppUser;
    if (!Number.isSafeInteger(user.id) || user.id <= 0 || !user.first_name) return null;
    return user;
  } catch {
    return null;
  }
}
