import { NextRequest, NextResponse } from "next/server";
import { validateTelegramInitData } from "../../../lib/telegram-auth";

export const runtime = "nodejs";

// Структура как в «Стрелке»: отдельная проверка /api/admin,
// без подключения базы заказов на этапе определения доступа.
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
    return NextResponse.json({ isAdmin: false, role: null, error: "Требуется авторизация Telegram." }, { status: 401 });
  }

  try {
    const user = await validateTelegramInitData(initData, token);
    if (!user) {
      return NextResponse.json({ isAdmin: false, role: null, error: "Не удалось подтвердить Telegram." }, { status: 401 });
    }

    const role = allowedIds.has(String(user.id)) ? "owner" : null;
    return NextResponse.json({ isAdmin: Boolean(role), role });
  } catch (error) {
    console.error("[admin-access] Telegram validation failed", error);
    return NextResponse.json({ isAdmin: false, role: null, error: "Ошибка проверки Telegram." }, { status: 500 });
  }
}
