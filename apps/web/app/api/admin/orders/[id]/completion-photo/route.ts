import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { requireAdmin } from "../../../../../../lib/admin-auth";

export const runtime = "nodejs";

type TelegramPhotoSize = { file_id: string };
type TelegramSendPhotoResponse = {
  ok: boolean;
  description?: string;
  result?: { photo?: TelegramPhotoSize[] };
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: true }
  });
  if (!order) {
    return NextResponse.json({ error: "Заказ не найден." }, { status: 404 });
  }

  const form = await request.formData();
  const photo = form.get("photo");
  if (!(photo instanceof File)) {
    return NextResponse.json({ error: "Выберите фотографию готового заказа." }, { status: 400 });
  }
  if (!["image/jpeg", "image/png"].includes(photo.type)) {
    return NextResponse.json({ error: "Поддерживаются только фотографии JPG и PNG." }, { status: 400 });
  }
  if (photo.size < 1 || photo.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Размер фотографии должен быть не более 10 МБ." }, { status: 400 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Telegram-бот не настроен." }, { status: 503 });
  }

  const telegramForm = new FormData();
  telegramForm.set("chat_id", order.customer.telegramId.toString());
  telegramForm.set(
    "caption",
    `Ваш заказ YOURPRINT №${order.number} готов! Спасибо, что выбрали нас.`
  );
  telegramForm.set("photo", photo, photo.name || `yourprint-order-${order.number}.jpg`);

  let telegramResult: TelegramSendPhotoResponse;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: "POST",
      body: telegramForm
    });
    telegramResult = await response.json() as TelegramSendPhotoResponse;
    if (!response.ok || !telegramResult.ok) {
      return NextResponse.json({
        error: telegramResult.description || "Telegram не смог отправить фотографию клиенту. Проверьте, запускал ли клиент бота."
      }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: "Не удалось связаться с Telegram. Попробуйте ещё раз." }, { status: 502 });
  }

  const sizes = telegramResult.result?.photo ?? [];
  const largestPhoto = sizes[sizes.length - 1];
  if (!largestPhoto?.file_id) {
    return NextResponse.json({ error: "Telegram отправил сообщение, но не вернул идентификатор фотографии." }, { status: 502 });
  }

  const saved = await prisma.$transaction(async (tx) => {
    const file = await tx.orderFile.create({
      data: {
        orderId: order.id,
        fileName: photo.name || `Фото готового заказа №${order.number}`,
        telegramFileId: largestPhoto.file_id
      }
    });
    await tx.order.update({
      where: { id: order.id },
      data: { completionFileId: file.id }
    });
    return file;
  });

  return NextResponse.json({
    sent: true,
    file: { id: saved.id, fileName: saved.fileName }
  });
}
