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
  const [isAdmin, setIsAdmin] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    const liveInitData = webApp?.initData ?? "";
    const initData = liveInitData || sessionStorage.getItem("yourprint_telegram_init_data") || "";
    if (!initData) {
      setState("outside");
      return;
    }

    webApp?.ready();
    webApp?.expand();
    if (liveInitData) sessionStorage.setItem("yourprint_telegram_init_data", liveInitData);

    fetch("/api/admin", {
      method: "GET",
      headers: { "x-telegram-init-data": initData },
      cache: "no-store"
    })
      .then(async (response) => {
        const result = await response.json() as { isAdmin?: boolean; role?: string | null; error?: string };
        if (!response.ok) {
          throw new Error(`${result.error || "Не удалось проверить Telegram."} (HTTP ${response.status})`);
        }
        return result;
      })
      .then((data) => {
        setIsAdmin(data.isAdmin === true);
        setState("ready");
      })
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : "Неизвестная ошибка соединения.");
        setState("error");
      });
  }, []);

  if (state === "loading") return <p className="session-note">ПОДКЛЮЧАЕМ TELEGRAM…</p>;
  if (state === "outside") return <p className="session-note">ОТКРОЙТЕ MINI APP ЧЕРЕЗ TELEGRAM</p>;
  if (state === "error") return <p className="session-note">НЕ УДАЛОСЬ ПОДТВЕРДИТЬ TELEGRAM: {errorMessage} Переоткройте приложение.</p>;

  return (
    <div className="session-bar">
      {isAdmin && <Link className="admin-entry" href="/admin">⚙ Администрирование</Link>}
    </div>
  );
}
