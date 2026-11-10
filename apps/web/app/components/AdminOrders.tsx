"use client";

import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window {
    Telegram?: { WebApp?: { initData: string; ready: () => void; expand: () => void } };
  }
}

type OrderStatus = "NEW" | "ACCEPTED" | "IN_PROGRESS" | "READY" | "COMPLETED" | "CANCELLED";
type Order = {
  id: string;
  number: number;
  status: OrderStatus;
  artworkType: "READY" | "CREATE_NEW";
  description: string | null;
  deadline: string | null;
  totalPrice: string | null;
  createdAt: string;
  customer: { firstName: string | null; lastName: string | null; username: string | null; telegramId: string };
  items: { productName: string; size: string; quantity: number; notes: string | null }[];
  files: { id: string; fileName: string; telegramFileId: string | null; createdAt: string }[];
  statusHistory: { fromStatus: OrderStatus | null; toStatus: OrderStatus; comment: string | null; createdAt: string }[];
};

const statusLabels: Record<OrderStatus, string> = {
  NEW: "Новый",
  ACCEPTED: "Принят",
  IN_PROGRESS: "В работе",
  READY: "Готов",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён"
};
const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({ value, label }));

export function AdminOrders() {
  const [initData, setInitData] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nextStatus, setNextStatus] = useState<OrderStatus>("NEW");
  const [deadline, setDeadline] = useState("");
  const [comment, setComment] = useState("");

  const selected = orders.find((order) => order.id === selectedId) ?? null;

  const loadOrders = useCallback(async (data: string, currentFilter: string) => {
    const query = currentFilter === "ALL" ? "" : `?status=${currentFilter}`;
    const response = await fetch(`/api/admin/orders${query}`, {
      headers: { "x-telegram-init-data": data },
      cache: "no-store"
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Не удалось загрузить заказы.");
    setOrders(result.orders as Order[]);
    setSelectedId((current) => result.orders.some((order: Order) => order.id === current)
      ? current : result.orders[0]?.id ?? "");
  }, []);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp?.initData) {
      setError("Откройте административную панель через Telegram Mini App.");
      setLoading(false);
      return;
    }
    webApp.ready();
    webApp.expand();
    setInitData(webApp.initData);
    loadOrders(webApp.initData, filter)
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [filter, loadOrders]);

  useEffect(() => {
    if (!selected) return;
    setNextStatus(selected.status);
    setDeadline(selected.deadline ? new Date(selected.deadline).toISOString().slice(0, 10) : "");
    setComment("");
  }, [selectedId]);

  async function saveChanges() {
    if (!selected || !initData) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-init-data": initData
        },
        body: JSON.stringify({
          orderId: selected.id,
          status: nextStatus,
          deadline: deadline ? new Date(`${deadline}T23:59:00`).toISOString() : null,
          comment
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Не удалось сохранить изменения.");
      await loadOrders(initData, filter);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ошибка сохранения.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-content">
      <div className="admin-title-row">
        <div><p className="eyebrow">УПРАВЛЕНИЕ ЗАКАЗАМИ</p><h1 className="admin-title">Заказы</h1></div>
        <button className="admin-refresh" onClick={() => initData && loadOrders(initData, filter)}>Обновить</button>
      </div>

      <label className="admin-filter">Фильтр по статусу
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="ALL">Все заказы</option>
          {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>

      {error && <p className="admin-error">{error}</p>}
      {loading ? <p className="admin-muted">Загружаем заказы…</p> : (
        <div className="admin-layout">
          <div className="admin-order-list">
            {orders.length === 0 && <p className="admin-muted">Заказов пока нет.</p>}
            {orders.map((order) => (
              <button key={order.id} className={`admin-order-card ${selectedId === order.id ? "active" : ""}`} onClick={() => setSelectedId(order.id)}>
                <span className="admin-order-top"><strong>Заказ №{order.number}</strong><small>{statusLabels[order.status]}</small></span>
                <span>{order.items.map((item) => `${item.productName} · ${item.quantity} шт.`).join(", ")}</span>
                <small>{order.customer.firstName ?? "Клиент"} · {new Date(order.createdAt).toLocaleDateString("ru-RU")}</small>
              </button>
            ))}
          </div>

          {selected && <article className="admin-detail">
            <p className="eyebrow">КАРТОЧКА ЗАКАЗА</p>
            <h2>№{selected.number}</h2>
            <p><b>Клиент:</b> {selected.customer.firstName} {selected.customer.lastName}</p>
            <p><b>Telegram:</b> {selected.customer.username ? `@${selected.customer.username}` : selected.customer.telegramId}</p>
            <p><b>Макет:</b> {selected.artworkType === "READY" ? "Готовый" : "Разработка нового дизайна"}</p>
            {selected.items.map((item, index) => <p key={index}><b>Изделие:</b> {item.productName}, размер {item.size}, {item.quantity} шт.</p>)}
            {selected.description && <p><b>Комментарий:</b> {selected.description}</p>}
            <div className="admin-files"><b>Файлы макета ({selected.files.length}):</b>{selected.files.length === 0 ? <p>Файлы не прикреплены.</p> : selected.files.map((file) => <p key={file.id}>📎 {file.fileName}{file.telegramFileId ? " · отправлен в Telegram" : " · не удалось передать в Telegram"}</p>)}</div>
            {selected.totalPrice && <p><b>Стоимость:</b> {selected.totalPrice} ₽</p>}
            <label className="admin-field">Статус
              <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as OrderStatus)}>
                {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="admin-field">Срок выполнения
              <input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
            </label>
            <label className="admin-field">Комментарий к смене статуса
              <textarea rows={3} maxLength={500} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Необязательно" />
            </label>
            <button className="admin-save" disabled={saving} onClick={saveChanges}>{saving ? "Сохраняем…" : "Сохранить изменения"}</button>
            <div className="admin-history"><h3>История статусов</h3>
              {selected.statusHistory.map((event, index) => <p key={index}><b>{statusLabels[event.toStatus]}</b> · {new Date(event.createdAt).toLocaleString("ru-RU")}{event.comment ? ` — ${event.comment}` : ""}</p>)}
            </div>
          </article>}
        </div>
      )}
    </section>
  );
}
