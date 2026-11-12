import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidSecret(received: string | null, expected: string) {
  if (!received || received.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= received.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function GET(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!token || !secret) {
    return NextResponse.json(
      { ok: false, error: "Telegram diagnostics are not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!isValidSecret(request.headers.get("x-yourprint-register-secret"), secret)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden." },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(15000)
    });

    const payload = await response.json() as {
      ok?: boolean;
      description?: string;
      result?: {
        url?: string;
        pending_update_count?: number;
        ip_address?: string;
        last_error_date?: number;
        last_error_message?: string;
        max_connections?: number;
        allowed_updates?: string[];
      };
    };

    if (!response.ok || !payload.ok || !payload.result) {
      return NextResponse.json(
        { ok: false, error: payload.description || `Telegram API returned HTTP ${response.status}.` },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    const info = payload.result;
    let webhookHost: string | null = null;
    if (info.url) {
      try {
        webhookHost = new URL(info.url).host;
      } catch {
        webhookHost = "invalid-url";
      }
    }

    return NextResponse.json(
      {
        ok: true,
        webhookConfigured: Boolean(info.url),
        webhookHost,
        pendingUpdateCount: info.pending_update_count ?? null,
        lastErrorDate: info.last_error_date
          ? new Date(info.last_error_date * 1000).toISOString()
          : null,
        lastErrorMessage: info.last_error_message ?? null,
        allowedUpdates: info.allowed_updates ?? [],
        maxConnections: info.max_connections ?? null,
        telegramIpAddress: info.ip_address ?? null
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not reach Telegram API."
      },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
