import { TelegramSession } from "./components/TelegramSession";
import { OrderForm } from "./components/OrderForm";
import { CustomerAccount } from "./components/CustomerAccount";

export default function HomePage() {
  return (
    <main className="page">
      <header className="topbar">
        <a className="logo" href="/">YOURPRINT<span>.</span></a>
        <a className="topbar-note account-nav" href="#account">МОИ ЗАКАЗЫ ↗</a>
      </header>
      <section className="hero">
        <p className="eyebrow">ПЕЧАТЬ, КОТОРАЯ ВЫДЕЛЯЕТ</p>
        <h1>ТВОЯ ИДЕЯ.<br /><span>ТВОЙ ПРИНТ.</span></h1>
        <p className="intro">Закажи DTF-печать на одежде или подготовь дизайн вместе с нами.</p>
        <TelegramSession />
      </section>
      <CustomerAccount />
      <OrderForm />
      <footer><span>YOURPRINT</span><span>DTF • КАЧЕСТВО • ДЕТАЛИ</span></footer>
    </main>
  );
}