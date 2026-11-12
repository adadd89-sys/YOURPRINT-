"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
      };
    };
  }
}

export function AdminOnlyCard() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const initData =
      window.Telegram?.WebApp?.initData ||
      sessionStorage.getItem("yourprint_telegram_init_data") ||
      "";

    if (!initData) return;

    fetch("/api/admin", {
      method: "GET",
      headers: { "x-telegram-init-data": initData },
      cache: "no-store"
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ isAdmin?: boolean }>;
      })
      .then((data) => setIsAdmin(data?.isAdmin === true))
      .catch(() => setIsAdmin(false));
  }, []);

  if (!isAdmin) return null;

  return (
    <a className="hub-card" href="/admin">
      <span className="hub-card-top"><b>⚙</b></span>
      <strong>Администрирование</strong>
      <small>Управление заказами и магазином</small>
      <span className="hub-arrow">ОТКРЫТЬ ↗</span>
    </a>
  );
}
