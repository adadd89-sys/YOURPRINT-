import { TelegramSession } from "./components/TelegramSession";
import { OrderForm } from "./components/OrderForm";

export default function HomePage() {
  return (
    <main className="page">
      <header className="topbar">
        <a className="logo" href="/">YOURPRINT<span>.</span></a>
        <span className="topbar-note">DTF PRINTING</span>
      </header>
      <section className="hero">
        <p className="eyebrow">ПЕЧАТЬ, КОТОРАЯ ВЫДЕЛЯЕТ</p>
        <h1>ТВОЯ ИДЕЯ.<br /><span>ТВОЙ ПРИНТ.</span></h1>
        <p className="intro">Закажи DTF-печать на одежде или подготовь дизайн вместе с нами.</p>
        <TelegramSession />
      </section>
      <OrderForm />
      <footer><span>YOURPRINT</span><span>DTF • КАЧЕСТВО • ДЕТАЛИ</span></footer>
    </main>
  );
}