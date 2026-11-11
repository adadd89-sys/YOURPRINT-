import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function isValidSecret(received: string | null, expected: string) {
  if (!received || received.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= received.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function POST(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!token || !secret) {
    return NextResponse.json({ error: "Telegram is not configured." }, { status: 503 });
  }

  if (!isValidSecret(request.headers.get("x-yourprint-register-secret"), secret)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const webhookUrl = `${request.nextUrl.origin}/api/telegram/webhook`;

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secret,
        allowed_updates: ["message"]
      }),
      signal: AbortSignal.timeout(20000)
    });

    const result = await telegramResponse.json() as {
      ok?: boolean;
      description?: string;
    };

    if (!telegramResponse.ok || !result.ok) {
      return NextResponse.json(
        { error: result.description || "Telegram rejected webhook registration." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, message: "Telegram webhook registered." });
  } catch {
    return NextResponse.json({ error: "Could not reach Telegram API from Cloudflare." }, { status: 502 });
  }
}
