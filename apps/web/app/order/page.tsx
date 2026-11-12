import Link from "next/link";
import { OrderForm } from "../components/OrderForm";
import { TelegramSession } from "../components/TelegramSession";

export default function OrderPage() {
  return (
    <main className="page order-page">
      <header className="topbar">
        <a className="logo" href="/">YOURPRINT<span>.</span></a>
        <Link className="account-back" href="/">← НА ГЛАВНУЮ</Link>
      </header>
      <section className="account-route-heading">
        <span className="section-kicker">YOURPRINT / ОФОРМЛЕНИЕ</span>
        <h1>НОВЫЙ ЗАКАЗ</h1>
        <p>Расскажите, что хотите напечатать, и мы свяжемся с вами в Telegram.</p>
        <TelegramSession />
      </section>
      <OrderForm />
      <footer><span>YOURPRINT</span><span>DTF • КАЧЕСТВО • ДЕТАЛИ</span></footer>
    </main>
  );
}
