import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { validateTelegramInitData } from "../../../../lib/telegram-auth";

export const runtime = "nodejs";

async function authenticate(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { error: NextResponse.json({ error: "Сервис пока не настроен." }, { status: 503 }) };
  const initData = request.headers.get("x-telegram-init-data");
  const telegramUser = initData ? validateTelegramInitData(initData, token) : null;
  if (!telegramUser) {
    return { error: NextResponse.json({ error: "Не удалось подтвердить Telegram. Переоткройте Mini App." }, { status: 401 }) };
  }
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
  return { user, telegramUser, token };
}

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if ("error" in auth) return auth.error;

  const orders = await prisma.order.findMany({
    where: { customerId: auth.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      number: true,
      status: true,
      artworkType: true,
      description: true,
      deadline: true,
      totalPrice: true,
      promoCode: { select: { code: true, discountPct: true } },
      createdAt: true,
      items: { select: { productName: true, size: true, quantity: true, notes: true } },
      files: { select: { id: true, fileName: true, createdAt: true } },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { fromStatus: true, toStatus: true, comment: true, createdAt: true }
      }
    }
  });

  return NextResponse.json({
    orders: orders.map((order) => ({
      ...order,
      totalPrice: order.totalPrice?.toString() ?? null,
      deadline: order.deadline?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
      files: order.files.map((file) => ({ ...file, createdAt: file.createdAt.toISOString() })),
      statusHistory: order.statusHistory.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() }))
    }))
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if ("error" in auth) return auth.error;

  let body: { orderId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }
  if (typeof body.orderId !== "string" || !body.orderId) {
    return NextResponse.json({ error: "Не указан исходный заказ." }, { status: 400 });
  }

  // The source order is always scoped to the authenticated Telegram user.
  const source = await prisma.order.findFirst({
    where: { id: body.orderId, customerId: auth.user.id },
    include: { items: true, files: true }
  });
  if (!source || source.items.length === 0) {
    return NextResponse.json({ error: "Заказ не найден или его нельзя повторить." }, { status: 404 });
  }

  const repeated = await prisma.order.create({
    data: {
      customerId: auth.user.id,
      artworkType: source.artworkType,
      description: source.description,
      items: {
        create: source.items.map((item) => ({
          productName: item.productName,
          size: item.size,
          quantity: item.quantity,
          notes: item.notes
        }))
      },
      files: {
        create: source.files.map((file) => ({
          fileName: file.fileName,
          telegramFileId: file.telegramFileId
        }))
      },
      statusHistory: { create: { toStatus: "NEW", comment: `Повтор заказа №${source.number}` } }
    },
    include: { items: true }
  });

  const adminIds = [...new Set((process.env.ADMIN_TELEGRAM_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean))];
  const itemLines = repeated.items.map((item) => `${item.productName}, ${item.size}, ${item.quantity} шт.`);
  const message = [
    `Повторный заказ YOURPRINT №${repeated.number}`,
    `Создан на основе заказа №${source.number}`,
    `Клиент: ${auth.telegramUser.first_name} ${auth.telegramUser.last_name ?? ""}`,
    auth.telegramUser.username ? `Telegram: @${auth.telegramUser.username}` : `Telegram ID: ${auth.telegramUser.id}`,
    `Макет: ${source.artworkType === "READY" ? "Готовый" : "Нужен новый дизайн"}`,
    ...itemLines,
    source.files.length ? `Макеты из исходного заказа: ${source.files.length}` : "Макеты не прикреплялись",
    source.description ? `Комментарий: ${source.description}` : ""
  ].filter(Boolean).join("\n");

  await Promise.all(adminIds.map((chatId) =>
    fetch(`https://api.telegram.org/bot${auth.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message })
    }).catch(() => undefined)
  ));

  // Re-send previously attached artwork to administrators when Telegram file IDs are available.
  await Promise.all(source.files.filter((file) => file.telegramFileId).flatMap((file) =>
    adminIds.map((chatId) => fetch(`https://api.telegram.org/bot${auth.token}/sendDocument`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        document: file.telegramFileId,
        caption: `Макет к повторному заказу YOURPRINT №${repeated.number}${file.fileName ? ` · ${file.fileName}` : ""}`
      })
    }).catch(() => undefined))
  ));

  return NextResponse.json({ order: { id: repeated.id, number: repeated.number, status: repeated.status } }, { status: 201 });
}
