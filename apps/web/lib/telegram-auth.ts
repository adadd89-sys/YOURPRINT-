export type TelegramWebAppUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};

export type TelegramInitDataValidation =
  | { user: TelegramWebAppUser; reason: null }
  | { user: null; reason: string };

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function hmacSha256(keyBytes: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(keyBytes),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, toArrayBuffer(data)));
}

export async function validateTelegramInitDataDetailed(
  initData: string,
  botToken: string
): Promise<TelegramInitDataValidation> {
  if (!initData) return { user: null, reason: "initData отсутствует. Откройте магазин именно через кнопку меню Telegram-бота." };

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  if (!receivedHash) return { user: null, reason: "В initData отсутствует hash. Telegram не передал данные авторизации." };
  if (!/^[a-f0-9]{64}$/i.test(receivedHash)) return { user: null, reason: "Поле hash имеет неверный формат." };

  const authDateValue = params.get("auth_date");
  if (!authDateValue) return { user: null, reason: "В initData отсутствует auth_date." };
  const authDate = Number(authDateValue);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(authDate)) return { user: null, reason: "Поле auth_date имеет неверный формат." };
  if (authDate > now + 60) return { user: null, reason: "Время авторизации Telegram находится в будущем. Проверьте дату и время устройства." };
  if (now - authDate > 86400) return { user: null, reason: "Данные авторизации Telegram устарели. Полностью закройте Mini App и откройте заново." };

  // Telegram requires a bytewise, case-sensitive alphabetical sort.
  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const encoder = new TextEncoder();
  const secretKey = await hmacSha256(encoder.encode(botToken), encoder.encode("WebAppData"));
  const calculatedHash = await hmacSha256(secretKey, encoder.encode(dataCheckString));
  const calculatedHex = Array.from(calculatedHash, byte => byte.toString(16).padStart(2, "0")).join("");

  let mismatch = 0;
  for (let index = 0; index < calculatedHex.length; index += 1) {
    mismatch |= calculatedHex.charCodeAt(index) ^ receivedHash.toLowerCase().charCodeAt(index);
  }
  if (mismatch !== 0) {
    return { user: null, reason: "Подпись Telegram не совпала. Вероятно, в Cloudflare задан токен другого бота либо Telegram передал изменённые данные." };
  }

  const rawUser = params.get("user");
  if (!rawUser) return { user: null, reason: "В подтверждённых данных Telegram отсутствует пользователь." };

  try {
    const user = JSON.parse(rawUser) as TelegramWebAppUser;
    if (!Number.isSafeInteger(user.id) || user.id <= 0 || !user.first_name) {
      return { user: null, reason: "Telegram передал некорректные данные пользователя." };
    }
    return { user, reason: null };
  } catch {
    return { user: null, reason: "Не удалось прочитать данные пользователя из initData." };
  }
}

export async function validateTelegramInitData(
  initData: string,
  botToken: string
): Promise<TelegramWebAppUser | null> {
  const result = await validateTelegramInitDataDetailed(initData, botToken);
  return result.user;
}
