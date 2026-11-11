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
    const initData = webApp?.initData || sessionStorage.getItem("yourprint_telegram_init_data") || "";
    if (!initData) {
      setState("outside");
      return;
    }

    webApp?.ready();
    webApp?.expand();
    sessionStorage.setItem("yourprint_telegram_init_data", initData);

    // Как в «Стрелке»: отдельный запрос проверяет права и не запускает
    // операции с заказами или базой клиентов при показе кнопки.
    fetch("/api/admin", {
      method: "GET",
      headers: { "x-telegram-init-data": initData },
      cache: "no-store"
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok && response.status !== 401 && response.status !== 403) {
          throw new Error(result.error || "Не удалось проверить права администратора.");
        }
        return result as { isAdmin?: boolean; role?: string | null };
      })
      .then((data) => {
        setIsAdmin(data.isAdmin === true);
        setFirstName(webApp?.initData ? (window.Telegram?.WebApp ? "ПОЛЬЗОВАТЕЛЬ" : "") : "");
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  if (state === "loading") return <p className="session-note">ПОДКЛЮЧАЕМ TELEGRAM…</p>;
  if (state === "outside") return <p className="session-note">ОТКРОЙТЕ MINI APP ЧЕРЕЗ TELEGRAM</p>;
  if (state === "error") return <p className="session-note">НЕ УДАЛОСЬ ПОДТВЕРДИТЬ TELEGRAM. ПЕРЕОТКРОЙТЕ ПРИЛОЖЕНИЕ.</p>;

  return (
    <div className="session-bar">
      {firstName && <p className="session-note">ВЫ В СИСТЕМЕ</p>}
      {isAdmin && <Link className="admin-entry" href="/admin">⚙ Администрирование</Link>}
    </div>
  );
}
