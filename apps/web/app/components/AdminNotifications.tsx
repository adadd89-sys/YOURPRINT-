"use client";

import { useEffect, useState } from "react";
import { readAdminJson } from "../../lib/admin-api";

type Settings = {
  notifyNew: boolean;
  notifyAccepted: boolean;
  notifyInProgress: boolean;
  notifyReady: boolean;
  notifyCompleted: boolean;
  notifyCancelled: boolean;
};

const defaults: Settings = {
  notifyNew: true,
  notifyAccepted: true,
  notifyInProgress: true,
  notifyReady: true,
  notifyCompleted: true,
  notifyCancelled: true
};

const options: { key: keyof Settings; title: string; description: string }[] = [
  { key: "notifyNew", title: "Новый заказ", description: "Сообщение клиенту при ручном создании заказа администратором" },
  { key: "notifyAccepted", title: "Заказ принят", description: "Когда заказ переводят в статус «Принят»" },
  { key: "notifyInProgress", title: "Заказ в работе", description: "Когда начинается выполнение заказа" },
  { key: "notifyReady", title: "Заказ готов", description: "Когда заказ готов к выдаче или отправке" },
  { key: "notifyCompleted", title: "Заказ завершён", description: "Когда заказ отмечен как завершённый" },
  { key: "notifyCancelled", title: "Заказ отменён", description: "Когда заказ отменяют" }
];

export function AdminNotifications() {
  const [initData, setInitData] = useState("");
  const [settings, setSettings] = useState<Settings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const data = window.Telegram?.WebApp?.initData || sessionStorage.getItem("yourprint_telegram_init_data") || "";
    if (!data) {
      setError("Откройте админ-панель через Telegram Mini App.");
      setLoading(false);
      return;
    }
    setInitData(data);
    fetch("/api/admin/notifications", {
      headers: { "x-telegram-init-data": data },
      cache: "no-store"
    })
      .then(async (response) => {
        const result = await readAdminJson(response);
        if (!response.ok) throw new Error(result.error || "Не удалось загрузить настройки.");
        setSettings({ ...defaults, ...result.settings });
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  function toggle(key: keyof Settings, value: boolean) {
    setSettings((current) => ({ ...current, [key]: value }));
    setNotice("");
  }

  async function save() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-init-data": initData
        },
        body: JSON.stringify(settings)
      });
      const result = await readAdminJson(response);
      if (!response.ok) throw new Error(result.error || "Не удалось сохранить настройки.");
      setSettings({ ...defaults, ...result.settings });
      setNotice("Настройки уведомлений сохранены.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ошибка сохранения.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-content">
      <div className="admin-title-row">
        <div><p className="eyebrow">СВЯЗЬ С КЛИЕНТАМИ</p><h1 className="admin-title">Уведомления</h1></div>
      </div>
      <p className="admin-muted">Выберите, при каких изменениях статуса заказа клиент будет получать сообщение от YOURPRINT в Telegram.</p>
      {loading ? <p className="admin-muted">Загружаем настройки…</p> : (
        <div className="notification-settings">
          {options.map((option) => (
            <label className="notification-row" key={option.key}>
              <span className="notification-copy">
                <strong>{option.title}</strong>
                <small>{option.description}</small>
              </span>
              <input
                type="checkbox"
                checked={settings[option.key]}
                onChange={(event) => toggle(option.key, event.target.checked)}
                disabled={!initData}
              />
            </label>
          ))}
          <button className="admin-save" type="button" onClick={save} disabled={saving || loading || !initData}>
            {saving ? "Сохраняем…" : "Сохранить настройки"}
          </button>
        </div>
      )}
      {error && <p className="admin-error">{error}</p>}
      {notice && <p className="promo-notice">{notice}</p>}
    </section>
  );
}
