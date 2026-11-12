import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

const statuses = new Set(["NEW", "ACCEPTED", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED"]);

const notificationFields = {
  NEW: "notifyNew",
  ACCEPTED: "notifyAccepted",
  IN_PROGRESS: "notifyInProgress",
  READY: "notifyReady",
  COMPLETED: "notifyCompleted",
  CANCELLED: "notifyCancelled"
} as const;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const status = request.nextUrl.searchParams.get("status");
  const where = status && statuses.has(status)
    ? { status: status as
        | "NEW" | "ACCEPTED" | "IN_PROGRESS" | "READY" | "COMPLETED" | "CANCELLED" }
    : { status: { not: "CANCELLED" as const } };

  const orders = await auth.prisma.order.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      number: true,
      status: true,
      artworkType: true,
      description: true,
      deadline: true,
      totalPrice: true,
      completionFileId: true,
      promoCode: { select: { code: true, discountPct: true } },
      createdAt: true,
      customer: {
        select: { firstName: true, lastName: true, username: true, telegramId: true }
      },
      items: { select: { productName: true, size: true, quantity: true, notes: true } },
      files: { select: { id: true, fileName: true, telegramFileId: true, createdAt: true } },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        take: 10,
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
      customer: { ...order.customer, telegramId: order.customer.telegramId.toString() },
      statusHistory: order.statusHistory.map((event) => ({
        ...event,
        createdAt: event.createdAt.toISOString()
      }))
    }))
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let body: {
    orderId?: string;
    status?: string;
    deadline?: string | null;
    comment?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  if (typeof body.orderId !== "string" || !body.orderId) {
    return NextResponse.json({ error: "Не указан заказ." }, { status: 400 });
  }

  if (body.status !== undefined && !statuses.has(body.status)) {
    return NextResponse.json({ error: "Неизвестный статус заказа." }, { status: 400 });
  }

  let deadline: Date | null | undefined;
  if (body.deadline !== undefined) {
    if (body.deadline === null || body.deadline === "") {
      deadline = null;
    } else {
      deadline = new Date(body.deadline);
      if (Number.isNaN(deadline.getTime())) {
        return NextResponse.json({ error: "Некорректный срок выполнения." }, { status: 400 });
      }
    }
  }

  const existing = await auth.prisma.order.findUnique({
    where: { id: body.orderId },
    include: { customer: true }
  });
  if (!existing) return NextResponse.json({ error: "Заказ не найден." }, { status: 404 });

  const nextStatus = body.status as
    | "NEW" | "ACCEPTED" | "IN_PROGRESS" | "READY" | "COMPLETED" | "CANCELLED" | undefined;
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 500) : "";

  const updated = await auth.prisma.$transaction(async (tx) => {
    const order = await tx.order.update({
      where: { id: existing.id },
      data: {
        ...(nextStatus ? { status: nextStatus } : {}),
        ...(deadline !== undefined ? { deadline } : {})
      }
    });

    if (nextStatus && nextStatus !== existing.status) {
      await tx.orderStatusEvent.create({
        data: {
          orderId: existing.id,
          changedById: auth.user.id,
          fromStatus: existing.status,
          toStatus: nextStatus,
          comment: comment || null
        }
      });
    }

    return order;
  });

  if (nextStatus && nextStatus !== existing.status) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const labels: Record<string, string> = {
      NEW: "Новый",
      ACCEPTED: "Принят",
      IN_PROGRESS: "В работе",
      READY: "Готов",
      COMPLETED: "Завершён",
      CANCELLED: "Отменён"
    };
    const notificationSetting = await auth.prisma.siteSettings.findUnique({
      where: { id: "notifications" },
      select: { ...{
        notifyNew: true,
        notifyAccepted: true,
        notifyInProgress: true,
        notifyReady: true,
        notifyCompleted: true,
        notifyCancelled: true
      } }
    });
    const notificationEnabled = notificationSetting?.[notificationFields[nextStatus]] ?? true;

    if (token && notificationEnabled) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: existing.customer.telegramId.toString(),
            text: `Статус вашего заказа YOURPRINT №${existing.number} изменён: ${labels[nextStatus]}.${comment ? `\nКомментарий: ${comment}` : ""}`
          })
        });
        const result = await response.json() as { ok?: boolean; description?: string };
        if (!response.ok || !result.ok) {
          console.error("[order-status-notification] Telegram delivery failed", response.status, result.description || "");
        }
      } catch (error) {
        console.error("[order-status-notification] Telegram request failed", error);
      }
    }
  }

  return NextResponse.json({
    order: {
      id: updated.id,
      number: updated.number,
      status: updated.status,
      deadline: updated.deadline?.toISOString() ?? null
    }
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let body: {
    telegramId?: unknown;
    artworkType?: unknown;
    productName?: unknown;
    size?: unknown;
    quantity?: unknown;
    description?: unknown;
    deadline?: unknown;
    totalPrice?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const telegramId = typeof body.telegramId === "string" ? body.telegramId.trim() : "";
  const productName = typeof body.productName === "string" ? body.productName.trim() : "";
  const size = typeof body.size === "string" ? body.size : "";
  const quantity = Number(body.quantity);
  const artworkType = body.artworkType;
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 1500) : "";

  if (!/^\d{5,20}$/.test(telegramId) || BigInt(telegramId || "0") > 9223372036854775807n) {
    return NextResponse.json({ error: "Укажите корректный числовой Telegram ID клиента." }, { status: 400 });
  }
  if (typeof artworkType !== "string" || !["READY", "CREATE_NEW"].includes(artworkType)) {
    return NextResponse.json({ error: "Выберите вариант макета." }, { status: 400 });
  }
  if (productName.length < 2 || productName.length > 100) {
    return NextResponse.json({ error: "Укажите название изделия." }, { status: 400 });
  }
  if (!["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Universal"].includes(size)) {
    return NextResponse.json({ error: "Выберите корректный размер." }, { status: 400 });
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    return NextResponse.json({ error: "Количество должно быть от 1 до 100." }, { status: 400 });
  }

  let deadline: Date | null = null;
  if (body.deadline !== undefined && body.deadline !== null && body.deadline !== "") {
    if (typeof body.deadline !== "string") {
      return NextResponse.json({ error: "Некорректный срок выполнения." }, { status: 400 });
    }
    deadline = new Date(body.deadline);
    if (Number.isNaN(deadline.getTime())) {
      return NextResponse.json({ error: "Некорректный срок выполнения." }, { status: 400 });
    }
  }

  let totalPrice: string | null = null;
  if (body.totalPrice !== undefined && body.totalPrice !== null && body.totalPrice !== "") {
    const rawPrice = String(body.totalPrice).trim().replace(",", ".");
    if (!/^\d{1,8}(\.\d{1,2})?$/.test(rawPrice) || Number(rawPrice) < 0.01) {
      return NextResponse.json({ error: "Укажите корректную стоимость в рублях." }, { status: 400 });
    }
    totalPrice = rawPrice;
  }

  const customer = await auth.prisma.user.upsert({
    where: { telegramId: BigInt(telegramId) },
    create: { telegramId: BigInt(telegramId), role: "CUSTOMER" },
    update: {}
  });

  const order = await auth.prisma.order.create({
    data: {
      customerId: customer.id,
      artworkType: artworkType as "READY" | "CREATE_NEW",
      description: description || null,
      deadline,
      ...(totalPrice !== null ? { totalPrice } : {}),
      items: { create: { productName, size, quantity } },
      statusHistory: {
        create: {
          changedById: auth.user.id,
          toStatus: "NEW",
          comment: "Заказ вручную создан администратором"
        }
      }
    },
    include: { items: true }
  });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const notificationSetting = await auth.prisma.siteSettings.findUnique({
    where: { id: "notifications" },
    select: { notifyNew: true }
  });
  if (token && (notificationSetting?.notifyNew ?? true)) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramId,
          text: `Для вас создан заказ YOURPRINT №${order.number}. Изделие: ${productName}, размер ${size}, количество: ${quantity}. Мы свяжемся с вами для уточнения деталей.`
        })
      });
      const result = await response.json() as { ok?: boolean; description?: string };
      if (!response.ok || !result.ok) {
        console.error("[order-created-notification] Telegram delivery failed", response.status, result.description || "");
      }
    } catch (error) {
      console.error("[order-created-notification] Telegram request failed", error);
    }
  }

  return NextResponse.json({
    order: { id: order.id, number: order.number, status: order.status }
  }, { status: 201 });
}
