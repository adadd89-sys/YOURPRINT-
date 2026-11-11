"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready: () => void;
        expand: () => void;
      };
    };
  }
}

type SessionState = "loading" | "ready" | "outside" | "error";

export function TelegramSession() {
  const [state, setState] = useState<SessionState>("loading");
  const [firstName, setFirstName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp?.initData) {
      setState("outside");
      return;
    }

    webApp.ready();
    webApp.expand();
    // Keep the signed Telegram session available during Mini App client-side navigation.
    sessionStorage.setItem("yourprint_telegram_init_data", webApp.initData);

    fetch("/api/auth/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: webApp.initData })
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Telegram auth failed");
        return response.json();
      })
      .then((data: { user: { firstName: string | null }; isAdmin: boolean }) => {
        setFirstName(data.user.firstName ?? "");
        setIsAdmin(data.isAdmin === true);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  if (state === "loading") return <p className="session-note">ПОДКЛЮЧАЕМ TELEGRAM…</p>;
  if (state === "outside") return <p className="session-note">ОТКРОЙТЕ MINI APP ЧЕРЕЗ TELEGRAM</p>;
  if (state === "error") return <p className="session-note">НЕ УДАЛОСЬ ПОДТВЕРДИТЬ TELEGRAM. ПЕРЕОТКРОЙТЕ ПРИЛОЖЕНИЕ.</p>;

  return (
    <div className="session-bar">
      <p className="session-note">ВЫ В СИСТЕМЕ{firstName ? `, ${firstName.toUpperCase()}` : ""}</p>
      {isAdmin && <Link className="admin-entry" href="/admin">⚙ Админ-панель</Link>}
    </div>
  );
}
