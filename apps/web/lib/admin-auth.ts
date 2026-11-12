import { NextRequest, NextResponse } from "next/server";
import type { PrismaClient } from "@prisma/client";
import { createPrismaClient } from "./prisma";
import { validateTelegramInitData } from "./telegram-auth";

export async function requireAdmin(request: NextRequest, db: PrismaClient = createPrismaClient()) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const allowedIds = new Set(
    (process.env.ADMIN_TELEGRAM_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );

  if (!token || allowedIds.size === 0) {
    return {
      response: NextResponse.json({ error: "Администраторский доступ не настроен." }, { status: 503 })
    } as const;
  }

  const initData = request.headers.get("x-telegram-init-data");
  if (!initData) {
    return { response: NextResponse.json({ error: "Требуется авторизация Telegram." }, { status: 401 }) } as const;
  }

  const telegramUser = await validateTelegramInitData(initData, token);
  if (!telegramUser) {
    return { response: NextResponse.json({ error: "Не удалось подтвердить Telegram." }, { status: 401 }) } as const;
  }

  if (!allowedIds.has(String(telegramUser.id))) {
    return { response: NextResponse.json({ error: "Нет доступа к административной панели." }, { status: 403 }) } as const;
  }

  const user = await db.user.upsert({
    where: { telegramId: BigInt(telegramUser.id) },
    create: {
      telegramId: BigInt(telegramUser.id),
      username: telegramUser.username,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
      role: "ADMIN"
    },
    update: {
      username: telegramUser.username,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
      role: "ADMIN"
    }
  });

  return { user, prisma: db } as const;
}
