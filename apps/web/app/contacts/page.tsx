"use client";

import { useEffect, useState } from "react";

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

const defaults: Settings = {
  contactsTitle: "Контакты",
  contactsIntro: "Свяжитесь с нами — поможем с заказом и ответим на вопросы.",
  phone: "", telegram: "", address: "", workingHours: "",
  instagram: "", vk: "", website: "", extraInfo: ""
};

function externalUrl(value: string, service: "telegram" | "instagram" | "vk" | "website") {
  const clean = value.trim();
  if (!clean) return "";
  if (/^https?:\/\//i.test(clean)) return clean;
  if (service === "telegram") return "https://t.me/" + clean.replace(/^@/, "");
  if (service === "instagram") return "https://instagram.com/" + clean.replace(/^@/, "").replace(/^\//, "");
  if (service === "vk") return "https://vk.com/" + clean.replace(/^@/, "").replace(/^\//, "");
  return "https://" + clean;
}

export default function ContactsPage() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/contacts", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Не удалось загрузить информацию");
        const result = await response.json();
        setSettings({ ...defaults, ...result.settings });
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const telegramUrl = externalUrl(settings.telegram, "telegram");
  const instagramUrl = externalUrl(settings.instagram, "instagram");
  const vkUrl = externalUrl(settings.vk, "vk");
  const websiteUrl = externalUrl(settings.website, "website");

  return (
    <main className="page contacts-page">
      <header className="contacts-topbar">
        <a className="brand-logo-link" href="/" aria-label="YOURPRINT — главная"><img className="brand-logo" src="/yourprint-logo.svg" alt="YOURPRINT" /></a>
        <a className="section-home-link" href="/">← В МАГАЗИН</a>
      </header>
      <section className="contacts-hero">
        <p className="eyebrow">YOURPRINT / СВЯЗЬ</p>
        <h1>{settings.contactsTitle}</h1>
        <p className="intro">{settings.contactsIntro}</p>
      </section>
      {loading ? <p className="admin-muted">Загружаем информацию…</p> : (
        <section className="contacts-grid">
          {settings.phone && <a className="contact-card" href={"tel:" + settings.phone.replace(/[^+\d]/g, "")}><span>ТЕЛЕФОН</span><strong>{settings.phone}</strong><small>Позвонить ↗</small></a>}
          {settings.telegram && <a className="contact-card" href={telegramUrl} target="_blank" rel="noreferrer"><span>TELEGRAM</span><strong>{settings.telegram}</strong><small>Написать нам ↗</small></a>}
          {settings.address && <article className="contact-card"><span>АДРЕС</span><strong>{settings.address}</strong></article>}
          {settings.workingHours && <article className="contact-card"><span>ГРАФИК РАБОТЫ</span><strong>{settings.workingHours}</strong></article>}
          {settings.instagram && <a className="contact-card" href={instagramUrl} target="_blank" rel="noreferrer"><span>INSTAGRAM</span><strong>{settings.instagram}</strong><small>Перейти ↗</small></a>}
          {settings.vk && <a className="contact-card" href={vkUrl} target="_blank" rel="noreferrer"><span>ВКОНТАКТЕ</span><strong>{settings.vk}</strong><small>Перейти ↗</small></a>}
          {settings.website && <a className="contact-card" href={websiteUrl} target="_blank" rel="noreferrer"><span>САЙТ</span><strong>{settings.website}</strong><small>Перейти ↗</small></a>}
        </section>
      )}
      {settings.extraInfo && <section className="contacts-extra"><p className="eyebrow">ВАЖНАЯ ИНФОРМАЦИЯ</p><p>{settings.extraInfo}</p></section>}
      {!loading && !settings.phone && !settings.telegram && !settings.address && !settings.workingHours && !settings.instagram && !settings.vk && !settings.website && !settings.extraInfo && (
        <p className="contacts-empty">Контактная информация скоро появится.</p>
      )}
      <footer><span>YOURPRINT</span><span>DTF • КАЧЕСТВО • ДЕТАЛИ</span></footer>
    </main>
  );
}
