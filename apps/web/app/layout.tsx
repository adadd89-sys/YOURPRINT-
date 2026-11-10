import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "YOURPRINT — DTF-печать",
  description: "Оформление заказов на DTF-печать"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <Script src="https://telegram.org/js/telegram-web-app.js?62" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}