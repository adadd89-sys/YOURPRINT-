import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { validateTelegramInitData } from "../../../lib/telegram-auth";

export const runtime = "nodejs";

const sizes = new Set(["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Universal"]);
const artworkTypes = new Set(["READY", "CREATE_NEW"]);

async function sendTelegramMessage(chatId: string, text: string, token: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

export async function POST(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Сервис пока не настроен." }, { status: 503 });

  let body: {
    initData?: string;
    artworkType?: string;
    productName?: string;
    size?: string;
    quantity?: number;
    description?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректные данные заказа." }, { status: 400 });
  }

  const telegramUser = typeof body.initData === "string"
    ? validateTelegramInitData(body.initData, token)
    : null;

  if (!telegramUser) {
    return NextResponse.json({ error: "Не удалось подтвердить Telegram. Переоткройте Mini App." }, { status: 401 });
  }

  if (!body.artworkType || !artworkTypes.has(body.artworkType)) {
    return NextResponse.json({ error: "Выберите вариант макета." }, { status: 400 });
  }

  if (typeof body.productName !== "string" || body.productName.trim().length < 2 || body.productName.length > 100) {
    return NextResponse.json({ error: "Укажите изделие." }, { status: 400 });
  }

  if (typeof body.size !== "string" || !sizes.has(body.size)) {
    return NextResponse.json({ error: "Выберите размер." }, { status: 400 });
  }

  const quantity = Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    return NextResponse.json({ error: "Количество должно быть от 1 до 100." }, { status: 400 });
  }

  const description = typeof body.description === "string" ? body.description.trim().slice(0, 1500) : "";

  const user = await prisma.user.upsert({
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
    }
  });

  const order = await prisma.order.create({
    data: {
      customerId: user.id,
      artworkType: body.artworkType as "READY" | "CREATE_NEW",
      description: description || null,
      items: {
        create: {
          productName: body.productName.trim(),
          size: body.size,
          quantity
        }
      },
      statusHistory: {
        create: { toStatus: "NEW", comment: "Заказ создан клиентом" }
      }
    },
    include: { items: true }
  });

  const artworkLabel = order.artworkType === "READY" ? "Готовый макет" : "Нужен новый дизайн";
  const adminMessage = [
    `Новый заказ YOURPRINT №${order.number}`,
    `Клиент: ${telegramUser.first_name} ${telegramUser.last_name ?? ""}`,
    telegramUser.username ? `Telegram: @${telegramUser.username}` : `Telegram ID: ${telegramUser.id}`,
    `Вариант: ${artworkLabel}`,
    `Изделие: ${body.productName.trim()}`,
    `Размер: ${body.size}`,
    `Количество: ${quantity}`,
    description ? `Комментарий: ${description}` : ""
  ].filter(Boolean).join("\n");

  const adminIds = (process.env.ADMIN_TELEGRAM_IDS ?? "").split(",").map(x => x.trim()).filter(Boolean);
  await Promise.all(adminIds.map(id => sendTelegramMessage(id, adminMessage, token).catch(() => undefined)));

  return NextResponse.json({ order: { number: order.number, status: order.status } }, { status: 201 });
}