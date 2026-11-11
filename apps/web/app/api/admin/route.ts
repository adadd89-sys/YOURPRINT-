import { NextRequest, NextResponse } from "next/server";
import { validateTelegramInitDataDetailed } from "../../../lib/telegram-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const allowedIds = new Set(
    (process.env.ADMIN_TELEGRAM_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );

  if (!token || allowedIds.size === 0) {
    return NextResponse.json(
      { isAdmin: false, role: null, error: "Администраторский доступ не настроен." },
      { status: 503 }
    );
  }

  const initData = request.headers.get("x-telegram-init-data") ?? "";
  if (!initData) {
    return NextResponse.json({ isAdmin: false, role: null, error: "Telegram WebApp не передал initData. Откройте Mini App через меню бота." }, { status: 401 });
  }

  try {
    const validation = await validateTelegramInitDataDetailed(initData, token);
    if (!validation.user) {
      return NextResponse.json(
        { isAdmin: false, role: null, error: validation.reason || "Не удалось подтвердить Telegram." },
        { status: 401 }
      );
    }

    const role = allowedIds.has(String(validation.user.id)) ? "owner" : null;
    return NextResponse.json({ isAdmin: Boolean(role), role });
  } catch (error) {
    console.error("[admin-access] Telegram validation failed", error);
    return NextResponse.json({ isAdmin: false, role: null, error: "Внутренняя ошибка проверки Telegram." }, { status: 500 });
  }
}
