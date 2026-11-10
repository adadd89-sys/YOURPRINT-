"use client";

import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window {
    Telegram?: { WebApp?: { initData: string } };
  }
}

type Promo = {
  id: string;
  code: string;
  discountPct: number;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  usageLimit: number | null;
  usageCount: number;
  createdAt: string;
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("ru-RU") : "Без ограничения";
}

export function AdminPromoCodes() {
  const [initData, setInitData] = useState("");
  const [promos, setPromos] = useState<Promo[]>([]);
  const [code, setCode] = useState("");
  const [discountPct, setDiscountPct] = useState(10);
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (data: string) => {
    const response = await fetch("/api/admin/promo-codes", {
      headers: { "x-telegram-init-data": data },
      cache: "no-store"
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Не удалось загрузить промокоды.");
    setPromos(result.promoCodes);
  }, []);

  useEffect(() => {
    const data = window.Telegram?.WebApp?.initData;
    if (!data) {
      setError("Откройте админ-панель через Telegram Mini App.");
      setLoading(false);
      return;
    }
    setInitData(data);
    load(data).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, [load]);

  async function createPromo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!initData) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-telegram-init-data": initData },
        body: JSON.stringify({
          code,
          discountPct,
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          usageLimit: usageLimit || null
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Не удалось создать промокод.");
      setCode("");
      setDiscountPct(10);
      setStartsAt("");
      setExpiresAt("");
      setUsageLimit("");
      setNotice(`Промокод ${result.promoCode.code} создан.`);
      await load(initData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка создания.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePromo(promo: Promo) {
    if (!initData) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/promo-codes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-telegram-init-data": initData },
        body: JSON.stringify({ id: promo.id, isActive: !promo.isActive })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Не удалось изменить промокод.");
      await load(initData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка изменения.");
    }
  }

  return (
    <section className="promo-admin">
      <div className="promo-admin-heading">
        <div><p className="eyebrow">СКИДКИ И АКЦИИ</p><h2>Промокоды</h2></div>
        <span className="promo-count">{promos.length} кодов</span>
      </div>
      <form className="promo-create-form" onSubmit={createPromo}>
        <label className="admin-field">Код промокода
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))} minLength={3} maxLength={32} placeholder="WELCOME10" required />
        </label>
        <label className="admin-field">Скидка, %
          <input type="number" min={1} max={100} value={discountPct} onChange={(e) => setDiscountPct(Number(e.target.value))} required />
        </label>
        <label className="admin-field">Начало действия
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </label>
        <label className="admin-field">Окончание действия
          <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </label>
        <label className="admin-field">Лимит использований
          <input type="number" min={1} max={1000000} value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} placeholder="Без лимита" />
        </label>
        <button className="admin-save" type="submit" disabled={saving}>{saving ? "Создаём…" : "Создать промокод"}</button>
      </form>
      {error && <p className="admin-error">{error}</p>}
      {notice && <p className="promo-notice">{notice}</p>}
      <div className="promo-list">
        {loading ? <p className="admin-muted">Загружаем промокоды…</p> :
          promos.length === 0 ? <p className="admin-muted">Промокодов пока нет.</p> :
          promos.map((promo) => (
            <article className="promo-card" key={promo.id}>
              <div className="promo-card-main">
                <div><strong>{promo.code}</strong><span>{promo.discountPct}% скидка</span></div>
                <span className={promo.isActive ? "promo-state active" : "promo-state"}>{promo.isActive ? "Активен" : "Отключён"}</span>
              </div>
              <p>Использований: {promo.usageCount}{promo.usageLimit ? ` из ${promo.usageLimit}` : " · без лимита"}</p>
              <p>С: {formatDate(promo.startsAt)}</p>
              <p>До: {formatDate(promo.expiresAt)}</p>
              <button type="button" className="promo-toggle" onClick={() => void togglePromo(promo)}>{promo.isActive ? "Отключить" : "Включить"}</button>
            </article>
          ))
        }
      </div>
    </section>
  );
}
