import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

const defaults = {
  notifyNew: true,
  notifyAccepted: true,
  notifyInProgress: true,
  notifyReady: true,
  notifyCompleted: true,
  notifyCancelled: true
};

const fields = Object.keys(defaults) as (keyof typeof defaults)[];

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const settings = await auth.prisma.siteSettings.upsert({
      where: { id: "notifications" },
      create: { id: "notifications", ...defaults },
      update: {},
      select: { ...defaults }
    });
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[admin/notifications] GET failed", error);
    return NextResponse.json({ error: "Не удалось загрузить настройки уведомлений." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const data: Partial<typeof defaults> = {};
  for (const field of fields) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== "boolean") {
      return NextResponse.json({ error: "Настройки уведомлений должны содержать логические значения." }, { status: 400 });
    }
    data[field] = body[field] as boolean;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нет настроек для сохранения." }, { status: 400 });
  }

  try {
    const settings = await auth.prisma.siteSettings.upsert({
      where: { id: "notifications" },
      create: { id: "notifications", ...defaults, ...data },
      update: data,
      select: { ...defaults }
    });
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("[admin/notifications] PATCH failed", error);
    return NextResponse.json({ error: "Не удалось сохранить настройки уведомлений." }, { status: 500 });
  }
}
