import Link from "next/link";
import { CustomerAccount } from "../components/CustomerAccount";
import { TelegramSession } from "../components/TelegramSession";

export default function AccountPage() {
  return (
    <main className="page account-page">
      <header className="topbar">
        <a className="logo" href="/">YOURPRINT<span>.</span></a>
        <Link className="account-back" href="/">← НА ГЛАВНУЮ</Link>
      </header>
      <section className="account-route-heading">
        <span className="section-kicker">YOURPRINT / ЛИЧНЫЙ КАБИНЕТ</span>
        <h1>МОИ ЗАКАЗЫ</h1>
        <p>Здесь можно посмотреть статусы, детали и историю своих заказов.</p>
        <TelegramSession />
      </section>
      <CustomerAccount />
      <footer><span>YOURPRINT</span><span>DTF • КАЧЕСТВО • ДЕТАЛИ</span></footer>
    </main>
  );
}
