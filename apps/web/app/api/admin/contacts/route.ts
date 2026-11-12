import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

const fields = [
  "contactsTitle", "contactsIntro", "phone", "telegram", "address",
  "workingHours", "instagram", "vk", "website", "extraInfo"
] as const;

const defaults = {
  contactsTitle: "Контакты",
  contactsIntro: "Свяжитесь с нами — поможем с заказом и ответим на вопросы.",
  phone: "", telegram: "", address: "", workingHours: "",
  instagram: "", vk: "", website: "", extraInfo: ""
};

async function getAdminContacts(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  const settings = await prisma.siteSettings.upsert({
    where: { id: "contacts" },
    create: { id: "contacts", ...defaults },
    update: {}
  });
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const data: Record<string, string> = {};
  for (const field of fields) {
    const value = body[field];
    if (typeof value !== "string" || value.length > (field === "extraInfo" || field === "contactsIntro" ? 3000 : 500)) {
      return NextResponse.json({ error: "Проверьте заполнение полей. Слишком длинный или некорректный текст." }, { status: 400 });
    }
    data[field] = value.trim();
  }

  const settings = await prisma.siteSettings.upsert({
    where: { id: "contacts" },
    create: { id: "contacts", ...defaults, ...data },
    update: data
  });
  return NextResponse.json({ success: true, settings });
}


export async function GET(request: NextRequest) {
  try {
    return await getAdminContacts(request);
  } catch (error) {
    console.error("[admin/contacts] GET failed", error);
    return NextResponse.json(
      { error: "Не удалось загрузить контакты. Ошибка записана в журнал сервера." },
      { status: 500 }
    );
  }
}
