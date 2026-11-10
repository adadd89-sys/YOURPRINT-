import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YOURPRINT — DTF-печать",
  description: "Оформление заказов на DTF-печать"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}