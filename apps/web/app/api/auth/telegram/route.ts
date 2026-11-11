import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { validateTelegramInitData } from "../../../../lib/telegram-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "Сервер ещё не настроен." }, { status: 503 });
  }

  let body: { initData?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  if (typeof body.initData !== "string" || body.initData.length === 0) {
    return NextResponse.json({ error: "Не удалось получить данные Telegram." }, { status: 400 });
  }

  const telegramUser = validateTelegramInitData(body.initData, botToken);
  if (!telegramUser) {
    return NextResponse.json({ error: "Не удалось подтвердить аккаунт Telegram. Откройте приложение заново." }, { status: 401 });
  }

  let user;
  try {
    user = await prisma.user.upsert({
      where: { telegramId: BigInt(telegramUser.id) },
      create: {
        telegramId: BigInt(telegramUser.id),
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name
      },
      update: {
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name
      },
      select: { id: true, firstName: true, role: true }
    });
  } catch (error) {
    const details = error && typeof error === "object"
      ? error as { code?: unknown; name?: unknown }
      : {};
    const diagnostic = typeof details.code === "string"
      ? details.code
      : typeof details.name === "string" ? details.name : "UNKNOWN";
    console.error("[telegram-auth] user upsert failed", error);
    return NextResponse.json(
      { error: `Ошибка базы данных: ${diagnostic}` },
      { status: 500 }
    );
  }

  const allowedIds = new Set(
    (process.env.ADMIN_TELEGRAM_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );

  return NextResponse.json({
    user: { id: user.id, firstName: user.firstName },
    isAdmin: allowedIds.has(String(telegramUser.id))
  });
}