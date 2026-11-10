import { TelegramSession } from "./components/TelegramSession";

const services = [
  { number: "01", title: "Готовый макет", description: "У вас уже есть изображение или файл для печати." },
  { number: "02", title: "Создать дизайн", description: "Опишите идею — обсудим разработку макета." }
];

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
      </section>
      <section className="order-section">
        <div className="section-heading">
          <span>01 / ОФОРМЛЕНИЕ</span>
          <h2>С чего начнём?</h2>
        </div>
        <div className="service-list">
          {services.map((service) => (
            <button className="service-card" key={service.number} type="button" disabled>
              <span className="service-number">{service.number}</span>
              <span className="service-copy">
                <strong>{service.title}</strong>
                <small>{service.description}</small>
              </span>
              <span className="service-arrow">↗</span>
            </button>
          ))}
        </div>
        <p className="coming-soon">ФОРМА ЗАКАЗА СКОРО БУДЕТ ДОСТУПНА</p>
        <TelegramSession />
      </section>
      <footer><span>YOURPRINT</span><span>DTF • КАЧЕСТВО • ДЕТАЛИ</span></footer>
    </main>
  );
}