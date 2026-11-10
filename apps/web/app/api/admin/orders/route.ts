import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

const statuses = new Set(["NEW", "ACCEPTED", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED"]);

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const status = request.nextUrl.searchParams.get("status");
  const where = status && statuses.has(status) ? { status: status as
    | "NEW" | "ACCEPTED" | "IN_PROGRESS" | "READY" | "COMPLETED" | "CANCELLED" } : {};

  const orders = await prisma.order.findMany({
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

  const existing = await prisma.order.findUnique({
    where: { id: body.orderId },
    include: { customer: true }
  });
  if (!existing) return NextResponse.json({ error: "Заказ не найден." }, { status: 404 });

  const nextStatus = body.status as
    | "NEW" | "ACCEPTED" | "IN_PROGRESS" | "READY" | "COMPLETED" | "CANCELLED" | undefined;
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 500) : "";

  const updated = await prisma.$transaction(async (tx) => {
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
    if (token) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: existing.customer.telegramId.toString(),
          text: `Статус вашего заказа YOURPRINT №${existing.number} изменён: ${labels[nextStatus]}.${comment ? `\nКомментарий: ${comment}` : ""}`
        })
      }).catch(() => undefined);
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
