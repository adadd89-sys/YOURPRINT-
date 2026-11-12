import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function getPromoCodes(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const promoCodes = await auth.prisma.promoCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true, code: true, discountPct: true, isActive: true,
      startsAt: true, expiresAt: true, usageLimit: true, usageCount: true, createdAt: true
    }
  });
  return NextResponse.json({
    promoCodes: promoCodes.map((promo) => ({
      ...promo,
      startsAt: promo.startsAt?.toISOString() ?? null,
      expiresAt: promo.expiresAt?.toISOString() ?? null,
      createdAt: promo.createdAt.toISOString()
    }))
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let body: {
    code?: unknown;
    discountPct?: unknown;
    startsAt?: unknown;
    expiresAt?: unknown;
    usageLimit?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const discountPct = Number(body.discountPct);
  const usageLimit = body.usageLimit === "" || body.usageLimit === null || body.usageLimit === undefined
    ? null : Number(body.usageLimit);
  const startsAt = parseDate(body.startsAt);
  const expiresAt = parseDate(body.expiresAt);

  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    return NextResponse.json({ error: "Код: 3–32 символа, только латинские буквы, цифры, дефис и подчёркивание." }, { status: 400 });
  }
  if (!Number.isInteger(discountPct) || discountPct < 1 || discountPct > 100) {
    return NextResponse.json({ error: "Скидка должна быть от 1 до 100%." }, { status: 400 });
  }
  if (startsAt === undefined || expiresAt === undefined) {
    return NextResponse.json({ error: "Проверьте даты действия промокода." }, { status: 400 });
  }
  if (startsAt && expiresAt && expiresAt <= startsAt) {
    return NextResponse.json({ error: "Дата окончания должна быть позже даты начала." }, { status: 400 });
  }
  if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1 || usageLimit > 1000000)) {
    return NextResponse.json({ error: "Лимит использований должен быть положительным числом." }, { status: 400 });
  }

  try {
    const promo = await auth.prisma.promoCode.create({
      data: { code, discountPct, startsAt, expiresAt, usageLimit },
      select: { id: true, code: true, discountPct: true, isActive: true, startsAt: true, expiresAt: true, usageLimit: true, usageCount: true }
    });
    return NextResponse.json({ promoCode: promo }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Такой промокод уже существует." }, { status: 409 });
    }
    throw error;
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let body: { id?: unknown; isActive?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }
  if (typeof body.id !== "string" || typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "Не указаны промокод или новое состояние." }, { status: 400 });
  }
  const result = await auth.prisma.promoCode.updateMany({
    where: { id: body.id },
    data: { isActive: body.isActive }
  });
  if (result.count === 0) return NextResponse.json({ error: "Промокод не найден." }, { status: 404 });
  return NextResponse.json({ success: true });
}


export async function GET(request: NextRequest) {
  try {
    return await getPromoCodes(request);
  } catch (error) {
    console.error("[admin/promo-codes] GET failed", error);
    return NextResponse.json(
      { error: "Не удалось загрузить промокоды. Ошибка записана в журнал сервера." },
      { status: 500 }
    );
  }
}
