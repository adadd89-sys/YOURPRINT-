"use client";

import { useEffect, useState } from "react";
import { AdminOrders } from "../components/AdminOrders";
import { AdminPromoCodes } from "../components/AdminPromoCodes";
import { AdminInsights } from "../components/AdminInsights";
import { AdminContacts } from "../components/AdminContacts";

type AccessState = "loading" | "allowed" | "denied" | "outside" | "error";

declare global {
  interface Window {
    Telegram?: { WebApp?: { initData: string; ready: () => void; expand: () => void } };
  }
}

export default function AdminPage() {
  const [access, setAccess] = useState<AccessState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"orders" | "insights" | "promos" | "contacts">("orders");

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    const initData = webApp?.initData || sessionStorage.getItem("yourprint_telegram_init_data") || "";
    if (!initData) { setAccess("outside"); return; }
    webApp?.ready();
    webApp?.expand();
    fetch("/api/admin", { method: "GET", headers: { "x-telegram-init-data": initData }, cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { isAdmin?: boolean; error?: string };
        if (!response.ok) throw new Error(data.error || "HTTP " + response.status);
        return data;
      })
      .then((data) => setAccess(data.isAdmin ? "allowed" : "denied"))
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : "Неизвестная ошибка");
        setAccess("error");
      });
  }, []);

  if (access === "loading") return <main className="admin-gate"><p>Проверяем доступ…</p></main>;
  if (access !== "allowed") {
    return (
      <main className="admin-gate">
        <a className="brand-logo-link" href="/" aria-label="YOURPRINT — главная"><img className="brand-logo" src="/yourprint-logo.svg" alt="YOURPRINT" /></a>
        <h1>Доступ закрыт</h1>
        <p>{access === "outside" ? "Откройте эту страницу внутри Telegram Mini App." : access === "denied" ? "Этот Telegram-аккаунт не добавлен в список администраторов." : errorMessage || "Не удалось подтвердить Telegram. Переоткройте Mini App."}</p>
        <a className="section-home-link" href="/">Вернуться в главное меню</a>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <a className="brand-logo-link" href="/" aria-label="YOURPRINT — главная"><img className="brand-logo" src="/yourprint-logo.svg" alt="YOURPRINT" /></a>
        <a className="section-home-link" href="/">← В ГЛАВНОЕ МЕНЮ</a>
      </header>
      <nav className="admin-tabs" aria-label="Разделы администрирования">
        <button type="button" className={activeTab === "orders" ? "admin-tab active" : "admin-tab"} onClick={() => setActiveTab("orders")}>📋 Заказы</button>
        <button type="button" className={activeTab === "insights" ? "admin-tab active" : "admin-tab"} onClick={() => setActiveTab("insights")}>📊 Обзор</button>
        <button type="button" className={activeTab === "promos" ? "admin-tab active" : "admin-tab"} onClick={() => setActiveTab("promos")}>🏷 Промокоды</button>
        <button type="button" className={activeTab === "contacts" ? "admin-tab active" : "admin-tab"} onClick={() => setActiveTab("contacts")}>☎ Контакты</button>
      </nav>
      {activeTab === "orders" ? <AdminOrders /> : activeTab === "insights" ? <AdminInsights /> : activeTab === "promos" ? <AdminPromoCodes /> : <AdminContacts />}
    </main>
  );
}
