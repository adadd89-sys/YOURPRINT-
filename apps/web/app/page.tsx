import { TelegramSession } from "./components/TelegramSession";

const sections = [
  { number: "01", icon: "✳", title: "Конструктор принта", description: "Загрузи изображение и настрой его на одежде", href: "/designer" },
  { number: "02", icon: "↗", title: "Оформить заказ", description: "Отправь готовый макет или опиши идею", href: "/order" },
  { number: "03", icon: "?", title: "Как это работает", description: "От идеи до готовой вещи — в несколько шагов", href: "#how-it-works" }
];

export default function HomePage() {
  return (
    <main className="page">
      <header className="topbar">
        <a className="logo" href="/">YOURPRINT<span>.</span></a>
        <a className="topbar-note account-nav" href="/account">ЛИЧНЫЙ КАБИНЕТ ↗</a>
      </header>
      <section className="hero">
        <p className="eyebrow">ПЕЧАТЬ, КОТОРАЯ ВЫДЕЛЯЕТ</p>
        <h1>ТВОЯ ИДЕЯ.<br /><span>ТВОЙ ПРИНТ.</span></h1>
        <p className="intro">Создавай уникальную одежду со своим дизайном. Загрузи изображение, выбери изделие — остальное сделаем мы.</p>
        <TelegramSession />
      </section>

      <section className="section-hub" aria-label="Разделы YOURPRINT">
        <div className="hub-heading"><span className="section-kicker">YOURPRINT / МЕНЮ</span><h2>Что будем делать?</h2></div>
        <div className="hub-grid">
          {sections.map((section) => (
            <a className="hub-card" href={section.href} key={section.number}>
              <span className="hub-card-top"><b>{section.icon}</b></span>
              <strong>{section.title}</strong>
              <small>{section.description}</small>
              <span className="hub-arrow">ОТКРЫТЬ ↗</span>
            </a>
          ))}
        </div>
      </section>

      <section className="how-section" id="how-it-works">
        <span className="section-kicker">ПРОСТОЙ ПРОЦЕСС</span>
        <h2>От идеи до готовой вещи</h2>
        <div className="how-steps">
          <div><b>01</b><strong>Выбери изделие</strong><p>Футболка, худи или свитшот.</p></div>
          <div><b>02</b><strong>Подготовь принт</strong><p>Загрузи свою картинку или отправь готовый макет.</p></div>
          <div><b>03</b><strong>Согласуй заказ</strong><p>Мы уточним детали, стоимость и сроки в Telegram.</p></div>
        </div>
      </section>
      <footer><span>YOURPRINT</span><span>DTF • КАЧЕСТВО • ДЕТАЛИ</span></footer>
    </main>
  );
}
