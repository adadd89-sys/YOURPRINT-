import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { validateTelegramInitData } from "../../../lib/telegram-auth";

export const runtime = "nodejs";

const sizes = new Set(["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Universal"]);
const artworkTypes = new Set(["READY", "CREATE_NEW"]);
const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".pdf", ".svg", ".tif", ".tiff", ".psd", ".ai"]);
const maxFileSize = 15 * 1024 * 1024;
const maxFiles = 5;

function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

async function sendMessage(chatId: string, text: string, token: string) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });
  return response.ok;
}

async function sendDocumentToAdmin(
  chatId: string,
  token: string,
  file: File,
  caption: string
): Promise<string | null> {
  const form = new FormData();
  form.set("chat_id", chatId);
  form.set("caption", caption);
  form.set("document", file, file.name);
  const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: "POST",
    body: form
  });
  if (!response.ok) return null;
  const result = await response.json() as {
    ok?: boolean;
    result?: { document?: { file_id?: string } };
  };
  return result.ok ? result.result?.document?.file_id ?? null : null;
}

async function copyDocumentToAdmin(chatId: string, token: string, fileId: string, caption: string) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, document: fileId, caption })
  });
  return response.ok;
}

export async function POST(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Сервис пока не настроен." }, { status: 503 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать форму заказа." }, { status: 400 });
  }

  const initData = form.get("initData");
  const telegramUser = typeof initData === "string" ? await validateTelegramInitData(initData, token) : null;
  if (!telegramUser) {
    return NextResponse.json({ error: "Не удалось подтвердить Telegram. Переоткройте Mini App." }, { status: 401 });
  }

  const artworkType = form.get("artworkType");
  const productName = form.get("productName");
  const size = form.get("size");
  const quantity = Number(form.get("quantity"));
  const descriptionValue = form.get("description");
  const promoCodeValue = form.get("promoCode");
  const promoCode = typeof promoCodeValue === "string" ? promoCodeValue.trim().toUpperCase() : "";

  if (typeof artworkType !== "string" || !artworkTypes.has(artworkType)) {
    return NextResponse.json({ error: "Выберите вариант макета." }, { status: 400 });
  }
  if (typeof productName !== "string" || productName.trim().length < 2 || productName.length > 100) {
    return NextResponse.json({ error: "Укажите изделие." }, { status: 400 });
  }
  if (typeof size !== "string" || !sizes.has(size)) {
    return NextResponse.json({ error: "Выберите размер." }, { status: 400 });
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    return NextResponse.json({ error: "Количество должно быть от 1 до 100." }, { status: 400 });
  }

  const description = typeof descriptionValue === "string" ? descriptionValue.trim().slice(0, 1500) : "";
  const files = form.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length > maxFiles) {
    return NextResponse.json({ error: `Можно прикрепить не более ${maxFiles} файлов.` }, { status: 400 });
  }
  for (const file of files) {
    if (file.size > maxFileSize) {
      return NextResponse.json({ error: `Файл «${file.name}» больше 15 МБ.` }, { status: 400 });
    }
    if (!allowedExtensions.has(extensionOf(file.name))) {
      return NextResponse.json({ error: `Формат файла «${file.name}» не поддерживается.` }, { status: 400 });
    }
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

  let appliedPromo: { id: string; code: string; discountPct: number; usageLimit: number | null } | null = null;
  if (promoCode) {
    const candidate = await prisma.promoCode.findUnique({ where: { code: promoCode } });
    const now = new Date();
    if (!candidate || !candidate.isActive ||
      (candidate.startsAt && candidate.startsAt > now) ||
      (candidate.expiresAt && candidate.expiresAt <= now) ||
      (candidate.usageLimit !== null && candidate.usageCount >= candidate.usageLimit)) {
      return NextResponse.json({ error: "Промокод недействителен, истёк или исчерпал лимит использований." }, { status: 400 });
    }
    appliedPromo = { id: candidate.id, code: candidate.code, discountPct: candidate.discountPct, usageLimit: candidate.usageLimit };
  }

  const promoToApply = appliedPromo;
  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      if (promoToApply) {
        const now = new Date();
        const claimed = await tx.promoCode.updateMany({
          where: {
            id: promoToApply.id,
            isActive: true,
            AND: [
              { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
              { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
              { OR: [{ usageLimit: null }, { usageCount: { lt: promoToApply.usageLimit ?? 2147483647 } }] }
            ]
          },
          data: { usageCount: { increment: 1 } }
        });
        if (claimed.count !== 1) throw new Error("PROMO_UNAVAILABLE");
      }
      return tx.order.create({
        data: {
          customerId: user.id,
          artworkType: artworkType as "READY" | "CREATE_NEW",
          description: description || null,
          ...(promoToApply ? { promoCodeId: promoToApply.id } : {}),
          items: { create: { productName: productName.trim(), size, quantity } },
          statusHistory: { create: { toStatus: "NEW", comment: "Заказ создан клиентом" } }
        },
        include: { items: true }
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PROMO_UNAVAILABLE") {
      return NextResponse.json({ error: "Промокод только что закончился или достиг лимита использований. Попробуйте другой." }, { status: 409 });
    }
    throw error;
  }

  const adminIds = [...new Set((process.env.ADMIN_TELEGRAM_IDS ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean))];
  const artworkLabel = order.artworkType === "READY" ? "Готовый макет" : "Нужен новый дизайн";
  const adminMessage = [
    `Новый заказ YOURPRINT №${order.number}`,
    `Клиент: ${telegramUser.first_name} ${telegramUser.last_name ?? ""}`,
    telegramUser.username ? `Telegram: @${telegramUser.username}` : `Telegram ID: ${telegramUser.id}`,
    `Вариант: ${artworkLabel}`,
    `Изделие: ${productName.trim()}`,
    `Размер: ${size}`,
    `Количество: ${quantity}`,
    appliedPromo ? `Промокод: ${appliedPromo.code} · скидка ${appliedPromo.discountPct}%` : "",
    files.length ? `Прикреплено файлов: ${files.length} (файлы придут отдельными сообщениями)` : "Файлы не приложены",
    description ? `Комментарий: ${description}` : ""
  ].filter(Boolean).join("\n");

  await Promise.all(adminIds.map((id) => sendMessage(id, adminMessage, token).catch(() => false)));

  let deliveredFiles = 0;
  const fileRecords: { orderId: string; fileName: string; telegramFileId: string | null }[] = [];
  for (const file of files) {
    let fileId: string | null = null;
    if (adminIds.length > 0) {
      fileId = await sendDocumentToAdmin(
        adminIds[0],
        token,
        file,
        `Макет к заказу YOURPRINT №${order.number}`
      ).catch(() => null);

      if (fileId) {
        deliveredFiles += 1;
        await Promise.all(adminIds.slice(1).map((id) =>
          copyDocumentToAdmin(id, token, fileId!, `Макет к заказу YOURPRINT №${order.number}`).catch(() => false)
        ));
      }
    }
    fileRecords.push({ orderId: order.id, fileName: file.name.slice(0, 255), telegramFileId: fileId });
  }

  if (fileRecords.length) {
    await prisma.orderFile.createMany({ data: fileRecords });
  }

  return NextResponse.json({
    order: { number: order.number, status: order.status },
    promo: appliedPromo ? { code: appliedPromo.code, discountPct: appliedPromo.discountPct } : null,
    files: { attached: files.length, delivered: deliveredFiles },
    warning: files.length > deliveredFiles
      ? "Заказ создан, но не все файлы удалось передать администраторам. Напишите нам в Telegram и укажите номер заказа."
      : null
  }, { status: 201 });
}
