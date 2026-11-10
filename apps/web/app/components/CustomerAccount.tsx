"use client";

import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window {
    Telegram?: { WebApp?: { initData: string } };
  }
}

type CustomerOrder = {
  id: string;
  number: number;
  status: string;
  artworkType: "READY" | "CREATE_NEW";
  description: string | null;
  deadline: string | null;
  totalPrice: string | null;
  promoCode: { code: string; discountPct: number } | null;
  createdAt: string;
  items: { productName: string; size: string; quantity: number; notes: string | null }[];
  files: { id: string; fileName: string | null; createdAt: string }[];
  statusHistory: { fromStatus: string | null; toStatus: string; comment: string | null; createdAt: string }[];
};

const labels: Record<string, string> = {
  NEW: "Новый",
  ACCEPTED: "Принят",
  IN_PROGRESS: "В работе",
  READY: "Готов",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён"
};

function date(value: string | null) {
  if (!value) return "Не указан";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}

export function CustomerAccount() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [repeatId, setRepeatId] = useState("");

  const loadOrders = useCallback(async () => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      setError("Откройте личный кабинет через Telegram Mini App.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/customer/orders", { headers: { "x-telegram-init-data": initData } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Не удалось загрузить заказы.");
      setOrders(result.orders);
      setSelectedId((current) => current || result.orders[0]?.id || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  const selected = orders.find((order) => order.id === selectedId);

  async function repeatOrder(order: CustomerOrder) {
    if (!window.confirm(`Создать новый заказ на основе заказа №${order.number}?`)) return;
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      setError("Откройте приложение через Telegram.");
      return;
    }
    setRepeatId(order.id);
    setError("");
    try {
      const response = await fetch("/api/customer/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-telegram-init-data": initData },
        body: JSON.stringify({ orderId: order.id })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Не удалось повторить заказ.");
      await loadOrders();
      setSelectedId(result.order.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка создания заказа.");
    } finally {
      setRepeatId("");
    }
  }

  return (
    <section className="customer-account" id="account">
      <div className="account-heading">
        <div><span className="account-kicker">ЛИЧНЫЙ КАБИНЕТ</span><h2>Мои заказы</h2></div>
        <button type="button" className="account-refresh" onClick={() => { setLoading(true); void loadOrders(); }}>Обновить ↻</button>
      </div>
      {error && <p className="account-error" role="alert">{error}</p>}
      {loading ? <p className="account-empty">Загружаем ваши заказы…</p> :
        orders.length === 0 ? <div className="account-empty"><strong>Пока здесь пусто</strong><p>Оформите первый заказ — он появится в этом разделе.</p></div> :
        <div className="account-layout">
          <div className="account-list">
            {orders.map((order) => (
              <button type="button" key={order.id} className={selectedId === order.id ? "account-order active" : "account-order"} onClick={() => setSelectedId(order.id)}>
                <span className="account-order-top"><strong>Заказ №{order.number}</strong><small>{date(order.createdAt)}</small></span>
                <span className="account-order-bottom"><span>{order.items.map((item) => item.productName).join(", ")}</span><b>{labels[order.status] ?? order.status}</b></span>
              </button>
            ))}
          </div>
          {selected && <article className="account-detail">
            <div className="account-detail-top"><div><span className="account-kicker">ЗАКАЗ №{selected.number}</span><h3>{labels[selected.status] ?? selected.status}</h3></div><span className={`status-dot status-${selected.status.toLowerCase()}`}></span></div>
            <p><b>Дата:</b> {date(selected.createdAt)}</p>
            <p><b>Макет:</b> {selected.artworkType === "READY" ? "Готовый макет" : "Разработка дизайна"}</p>
            {selected.items.map((item, index) => <p key={index}><b>{item.productName}:</b> {item.size}, {item.quantity} шт.{item.notes ? ` — ${item.notes}` : ""}</p>)}
            <p><b>Срок выполнения:</b> {date(selected.deadline)}</p>
            {selected.promoCode && <p><b>Промокод:</b> {selected.promoCode.code} · скидка {selected.promoCode.discountPct}%</p>}
            <p><b>Стоимость:</b> {selected.totalPrice ? `${selected.totalPrice} ₽` : "Уточняется в Telegram"}</p>
            {selected.description && <p><b>Комментарий:</b> {selected.description}</p>}
            {selected.files.length > 0 && <div className="account-files"><b>Прикреплённые файлы</b>{selected.files.map((file) => <span key={file.id}>↳ {file.fileName || "Файл"}</span>)}<small>Если нужно получить копию файла, напишите менеджеру в Telegram.</small></div>}
            <button type="button" className="account-repeat" disabled={repeatId === selected.id} onClick={() => void repeatOrder(selected)}>
              {repeatId === selected.id ? "СОЗДАЁМ ЗАКАЗ…" : "ПОВТОРИТЬ ЗАКАЗ ↗"}
            </button>
            <div className="account-history"><h4>История статусов</h4>
              {selected.statusHistory.map((event) => <div className="account-event" key={event.createdAt + event.toStatus}><span className="account-event-marker"></span><div><b>{labels[event.toStatus] ?? event.toStatus}</b><small>{date(event.createdAt)}{event.comment ? ` · ${event.comment}` : ""}</small></div></div>)}
            </div>
          </article>}
        </div>
      }
    </section>
  );
}
