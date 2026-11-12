import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

function monthRange(value: string | null) {
  if (!value || !/^\\d{4}-\\d{2}$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  if (month < 1 || month > 12) return null;
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1))
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const range = monthRange(request.nextUrl.searchParams.get("month"));
  if (!range) return NextResponse.json({ error: "Укажите месяц в формате YYYY-MM." }, { status: 400 });

  const completedWhere = { status: "COMPLETED" as const };
  const [
    totalOrders,
    activeOrders,
    completedOrders,
    cancelledOrders,
    completedFinancials,
    popularProducts,
    calendarOrders
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: { in: ["NEW", "ACCEPTED", "IN_PROGRESS", "READY"] } } }),
    prisma.order.count({ where: completedWhere }),
    prisma.order.count({ where: { status: "CANCELLED" } }),
    prisma.order.aggregate({
      where: completedWhere,
      _sum: { totalPrice: true },
      _avg: { totalPrice: true },
      _count: { totalPrice: true }
    }),
    prisma.orderItem.groupBy({
      by: ["productName"],
      _sum: { quantity: true },
      _count: { productName: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5
    }),
    prisma.order.findMany({
      where: {
        OR: [
          { deadline: { gte: range.start, lt: range.end } },
          { deadline: null, createdAt: { gte: range.start, lt: range.end } }
        ]
      },
      orderBy: [{ deadline: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        number: true,
        status: true,
        deadline: true,
        createdAt: true,
        totalPrice: true,
        customer: { select: { firstName: true, lastName: true } },
        items: { select: { productName: true, quantity: true, size: true } }
      }
    })
  ]);

  return NextResponse.json({
    summary: {
      totalOrders,
      activeOrders,
      completedOrders,
      cancelledOrders,
      completedTotal: completedFinancials._sum.totalPrice?.toString() ?? "0",
      averageCompleted: completedFinancials._avg.totalPrice?.toString() ?? "0",
      pricedCompletedOrders: completedFinancials._count.totalPrice
    },
    popularProducts: popularProducts.map((item) => ({
      name: item.productName,
      quantity: item._sum.quantity ?? 0,
      orderLines: item._count.productName
    })),
    calendarOrders: calendarOrders.map((order) => ({
      id: order.id,
      number: order.number,
      status: order.status,
      date: (order.deadline ?? order.createdAt).toISOString(),
      hasDeadline: Boolean(order.deadline),
      totalPrice: order.totalPrice?.toString() ?? null,
      customerName: [order.customer.firstName, order.customer.lastName].filter(Boolean).join(" ") || "Клиент",
      items: order.items
    }))
  });
}
