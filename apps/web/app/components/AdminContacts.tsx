"use client";

import { FormEvent, useEffect, useState } from "react";

type Settings = {
  contactsTitle: string;
  contactsIntro: string;
  phone: string;
  telegram: string;
  address: string;
  workingHours: string;
  instagram: string;
  vk: string;
  website: string;
  extraInfo: string;
};

const emptySettings: Settings = {
  contactsTitle: "Контакты",
  contactsIntro: "Свяжитесь с нами — поможем с заказом и ответим на вопросы.",
  phone: "", telegram: "", address: "", workingHours: "",
  instagram: "", vk: "", website: "", extraInfo: ""
};

const fields: { key: keyof Settings; label: string; placeholder: string; multiline?: boolean }[] = [
  { key: "contactsTitle", label: "Заголовок страницы", placeholder: "Контакты" },
  { key: "contactsIntro", label: "Текст под заголовком", placeholder: "Напишите нам — поможем с заказом", multiline: true },
  { key: "phone", label: "Телефон", placeholder: "+7 900 000-00-00" },
  { key: "telegram", label: "Telegram (ссылка или @username)", placeholder: "@yourprint" },
  { key: "address", label: "Адрес", placeholder: "Город, улица, дом", multiline: true },
  { key: "workingHours", label: "График работы", placeholder: "Пн–Пт, 10:00–19:00", multiline: true },
  { key: "instagram", label: "Instagram (ссылка)", placeholder: "https://instagram.com/..." },
  { key: "vk", label: "ВКонтакте (ссылка)", placeholder: "https://vk.com/..." },
  { key: "website", label: "Сайт (ссылка)", placeholder: "https://..." },
  { key: "extraInfo", label: "Дополнительная информация", placeholder: "Оплата, доставка, сроки, важные условия…", multiline: true }
];

export function AdminContacts() {
  const [initData, setInitData] = useState("");
  const [settings, setSettings] = useState<Settings>(emptySettings);
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
    fetch("/api/admin/contacts", { headers: { "x-telegram-init-data": data }, cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Не удалось загрузить контакты.");
        setSettings({ ...emptySettings, ...result.settings });
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function update(key: keyof Settings, value: string) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/contacts", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-telegram-init-data": initData },
        body: JSON.stringify(settings)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Не удалось сохранить контакты.");
      setSettings({ ...emptySettings, ...result.settings });
      setNotice("Контактная информация сохранена.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="contacts-admin">
      <div className="contacts-admin-heading">
        <div><p className="eyebrow">ИНФОРМАЦИЯ МАГАЗИНА</p><h2>Контакты и информация</h2></div>
      </div>
      <p className="admin-muted">Изменения сразу появятся на странице «Контакты» в магазине. Код и повторный деплой не нужны.</p>
      {loading ? <p className="admin-muted">Загружаем настройки…</p> : (
        <form onSubmit={save}>
          {fields.map((field) => (
            <label className="admin-field" key={field.key}>{field.label}
              {field.multiline ? (
                <textarea rows={field.key === "extraInfo" ? 6 : 3} maxLength={field.key === "extraInfo" || field.key === "contactsIntro" ? 3000 : 500} value={settings[field.key]} onChange={(e) => update(field.key, e.target.value)} placeholder={field.placeholder} />
              ) : (
                <input maxLength={500} value={settings[field.key]} onChange={(e) => update(field.key, e.target.value)} placeholder={field.placeholder} />
              )}
            </label>
          ))}
          <button className="admin-save" type="submit" disabled={saving || !initData}>{saving ? "Сохраняем…" : "Сохранить изменения"}</button>
        </form>
      )}
      {error && <p className="admin-error">{error}</p>}
      {notice && <p className="promo-notice">{notice}</p>}
      <a className="contacts-preview-link" href="/contacts" target="_blank" rel="noreferrer">Открыть страницу контактов ↗</a>
    </section>
  );
}
