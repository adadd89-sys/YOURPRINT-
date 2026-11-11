"use client";

import { useEffect, useState } from "react";
import { AdminOrders } from "../components/AdminOrders";
import { AdminPromoCodes } from "../components/AdminPromoCodes";

type AccessState = "loading" | "allowed" | "denied" | "outside" | "error";

declare global {
  interface Window {
    Telegram?: { WebApp?: { initData: string; ready: () => void; expand: () => void } };
  }
}

export default function AdminPage() {
  const [access, setAccess] = useState<AccessState>("loading");

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    const initData = webApp?.initData || sessionStorage.getItem("yourprint_telegram_init_data") || "";
    if (!initData) {
      setAccess("outside");
      return;
    }

    webApp?.ready();
    webApp?.expand();

    fetch("/api/auth/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData })
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Не удалось подтвердить Telegram.");
        return response.json();
      })
      .then((data: { isAdmin: boolean }) => setAccess(data.isAdmin ? "allowed" : "denied"))
      .catch(() => setAccess("error"));
  }, []);

  if (access === "loading") return <main className="admin-gate"><p>Проверяем доступ…</p></main>;

  if (access !== "allowed") {
    return (
      <main className="admin-gate">
        <a className="logo" href="/">YOURPRINT<span>.</span></a>
        <h1>Доступ закрыт</h1>
        <p>{access === "outside" ? "Откройте эту страницу внутри Telegram Mini App." : access === "denied" ? "Этот Telegram-аккаунт не добавлен в список администраторов." : "Не удалось подтвердить Telegram. Переоткройте Mini App."}</p>
        <a className="admin-back" href="/">Вернуться в магазин</a>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <a className="logo" href="/">YOURPRINT<span>.</span></a>
        <span className="topbar-note">ADMIN PANEL</span>
      </header>
      <AdminOrders />
      <AdminPromoCodes />
    </main>
  );
}
