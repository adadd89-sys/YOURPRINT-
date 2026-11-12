"use client";

import { useEffect, useMemo, useState } from "react";
import { readAdminJson } from "../../lib/admin-api";

type Summary = {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  completedTotal: string;
  averageCompleted: string;
  pricedCompletedOrders: number;
};
type CalendarOrder = {
  id: string;
  number: number;
  status: string;
  date: string;
  hasDeadline: boolean;
  totalPrice: string | null;
  customerName: string;
  items: { productName: string; quantity: number; size: string }[];
};
type InsightsData = {
  summary: Summary;
  popularProducts: { name: string; quantity: number; orderLines: number }[];
  calendarOrders: CalendarOrder[];
};

const labels: Record<string, string> = {
  NEW: "Новый", ACCEPTED: "Принят", IN_PROGRESS: "В работе",
  READY: "Готов", COMPLETED: "Завершён", CANCELLED: "Отменён"
};
const money = (value: string | number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Number(value) || 0) + " ₽";
const monthValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const dateKey = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

export function AdminInsights() {
  const [initData, setInitData] = useState("");
  const [data, setData] = useState<InsightsData | null>(null);
  const [month, setMonth] = useState(() => monthValue(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [view, setView] = useState<"stats" | "calendar">("stats");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    const value = webApp?.initData || sessionStorage.getItem("yourprint_telegram_init_data") || "";
    if (!value) {
      setError("Откройте административную панель через Telegram Mini App.");
      setLoading(false);
      return;
    }
    webApp?.ready();
    webApp?.expand();
    setInitData(value);
  }, []);

  useEffect(() => {
    if (!initData) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/admin/analytics?month=${month}`, {
      headers: { "x-telegram-init-data": initData },
      cache: "no-store"
    })
      .then(async (response) => {
        const result = await readAdminJson(response);
        if (!response.ok) throw new Error(result.error || "Не удалось загрузить аналитику.");
        return result as InsightsData;
      })
      .then((result) => { if (!cancelled) setData(result); })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Ошибка загрузки аналитики.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [initData, month]);

  const monthDate = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    return new Date(year, monthNumber - 1, 1);
  }, [month]);
  const days = useMemo(() => {
    const firstWeekday = (monthDate.getDay() + 6) % 7;
    const count = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = Array(firstWeekday).fill(null);
    for (let day = 1; day <= count; day++) cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [monthDate]);
  const ordersByDate = useMemo(() => {
    const map = new Map<string, CalendarOrder[]>();
    for (const order of data?.calendarOrders ?? []) {
      const key = dateKey(new Date(order.date));
      map.set(key, [...(map.get(key) ?? []), order]);
    }
    return map;
  }, [data]);
  const selectedOrders = ordersByDate.get(selectedDate) ?? [];

  function shiftMonth(delta: number) {
    const next = new Date(monthDate.getFullYear(), monthDate.getMonth() + delta, 1);
    const value = monthValue(next);
    setMonth(value);
    setSelectedDate(dateKey(next));
  }

  const cardStyle: React.CSSProperties = {
    padding: "16px", background: "#141414", border: "1px solid #303030",
    borderRadius: "10px", minWidth: 0
  };

  return (
    <section className="admin-content">
      <div className="admin-title-row">
        <div><p className="eyebrow">УПРАВЛЕНИЕ YOURPRINT</p><h1 className="admin-title">Обзор</h1></div>
        <button className="admin-refresh" type="button" onClick={() => setMonth(monthValue(new Date(monthDate)))}>Обновить</button>
      </div>

      <nav className="admin-tabs" aria-label="Статистика и календарь">
        <button type="button" className={view === "stats" ? "admin-tab active" : "admin-tab"} onClick={() => setView("stats")}>📊 Статистика</button>
        <button type="button" className={view === "calendar" ? "admin-tab active" : "admin-tab"} onClick={() => setView("calendar")}>📅 Календарь</button>
      </nav>

      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="admin-muted">Загружаем данные…</p>}

      {view === "stats" && data && (
        <>
          <p className="admin-muted" style={{ margin: "0 0 12px" }}>Показатели за всё время. Сумма рассчитана по завершённым заказам, для которых указана стоимость.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "9px" }}>
            <div style={cardStyle}><small style={{ color: "#999" }}>Всего заказов</small><div style={{ fontSize: 27, fontWeight: 800, marginTop: 7 }}>{data.summary.totalOrders}</div></div>
            <div style={cardStyle}><small style={{ color: "#999" }}>В работе</small><div style={{ fontSize: 27, fontWeight: 800, marginTop: 7 }}>{data.summary.activeOrders}</div></div>
            <div style={cardStyle}><small style={{ color: "#999" }}>Завершено</small><div style={{ fontSize: 27, fontWeight: 800, marginTop: 7 }}>{data.summary.completedOrders}</div></div>
            <div style={cardStyle}><small style={{ color: "#999" }}>Отменено</small><div style={{ fontSize: 27, fontWeight: 800, marginTop: 7 }}>{data.summary.cancelledOrders}</div></div>
            <div style={{ ...cardStyle, gridColumn: "1 / -1" }}><small style={{ color: "#999" }}>Сумма завершённых заказов</small><div style={{ fontSize: 25, fontWeight: 800, marginTop: 7 }}>{money(data.summary.completedTotal)}</div></div>
            <div style={{ ...cardStyle, gridColumn: "1 / -1" }}><small style={{ color: "#999" }}>Средний чек по заказам с указанной стоимостью</small><div style={{ fontSize: 25, fontWeight: 800, marginTop: 7 }}>{money(data.summary.averageCompleted)}</div><small style={{ color: "#777" }}>Учтено заказов: {data.summary.pricedCompletedOrders}</small></div>
          </div>
          <div style={{ ...cardStyle, marginTop: 12 }}>
            <h2 style={{ fontSize: 16, margin: "0 0 14px" }}>Популярные изделия</h2>
            {data.popularProducts.length ? data.popularProducts.map((item) => (
              <div key={item.name} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", borderTop: "1px solid #303030", fontSize: 12 }}>
                <span>{item.name}</span><b>{item.quantity} шт.</b>
              </div>
            )) : <p className="admin-muted">Пока нет данных.</p>}
          </div>
        </>
      )}

      {view === "calendar" && (
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 14 }}>
            <button type="button" className="admin-refresh" onClick={() => shiftMonth(-1)}>←</button>
            <strong style={{ textTransform: "capitalize", fontSize: 14 }}>{monthDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}</strong>
            <button type="button" className="admin-refresh" onClick={() => shiftMonth(1)}>→</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4, marginBottom: 6 }}>
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => <div key={day} style={{ textAlign: "center", color: "#888", fontSize: 10, padding: 5 }}>{day}</div>)}
            {days.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} />;
              const key = dateKey(day);
              const count = ordersByDate.get(key)?.length ?? 0;
              const active = selectedDate === key;
              return <button key={key} type="button" onClick={() => setSelectedDate(key)} style={{
                minHeight: 43, padding: 3, borderRadius: 7, border: active ? "1px solid #fff" : "1px solid #303030",
                color: "#eee", background: active ? "#303030" : "#0d0d0d", fontSize: 12, cursor: "pointer"
              }}>
                <span>{day.getDate()}</span>
                {count > 0 && <small style={{ display: "block", marginTop: 3, color: "#bbb", fontSize: 9 }}>{count} зак.</small>}
              </button>;
            })}
          </div>
          <div style={{ borderTop: "1px solid #303030", paddingTop: 14, marginTop: 12 }}>
            <strong style={{ fontSize: 13 }}>Заказы на {new Date(selectedDate + "T12:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</strong>
            {selectedOrders.length ? selectedOrders.map((order) => (
              <div key={order.id} style={{ padding: "12px 0", borderBottom: "1px solid #303030", fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b>№{order.number} · {labels[order.status] ?? order.status}</b><small style={{ color: "#999" }}>{order.hasDeadline ? "Срок" : "Создан"}</small></div>
                <p style={{ margin: "6px 0", color: "#bbb" }}>{order.customerName}</p>
                <p style={{ margin: 0, color: "#999" }}>{order.items.map((item) => `${item.productName} · ${item.quantity} шт.`).join(", ")}</p>
                {order.totalPrice && <p style={{ margin: "6px 0 0" }}>{money(order.totalPrice)}</p>}
              </div>
            )) : <p className="admin-muted" style={{ marginBottom: 0 }}>На эту дату заказов нет.</p>}
          </div>
        </div>
      )}
    </section>
  );
}
