import { NextResponse } from "next/server";
import { createPrismaClient } from "../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const defaults = {
  contactsTitle: "Контакты",
  contactsIntro: "Свяжитесь с нами — поможем с заказом и ответим на вопросы.",
  phone: "", telegram: "", address: "", workingHours: "",
  instagram: "", vk: "", website: "", extraInfo: ""
};

export async function GET() {
  const prisma = createPrismaClient();
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "contacts" },
    select: {
      contactsTitle: true, contactsIntro: true, phone: true, telegram: true,
      address: true, workingHours: true, instagram: true, vk: true,
      website: true, extraInfo: true
    }
  });
  return NextResponse.json({ settings: settings ?? defaults }, {
    headers: { "Cache-Control": "no-store" }
  });
}
