"use client";

import { FormEvent, useState } from "react";

declare global {
  interface Window {
    Telegram?: { WebApp?: { initData: string } };
  }
}

const sizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Universal"];

export function OrderForm() {
  const [artworkType, setArtworkType] = useState<"READY" | "CREATE_NEW">("READY");
  const [productName, setProductName] = useState("Футболка");
  const [size, setSize] = useState("M");
  const [quantity, setQuantity] = useState(1);
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage("");

    try {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) throw new Error("Откройте Mini App через Telegram.");

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, artworkType, productName, size, quantity, description })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Не удалось отправить заказ.");

      setMessage(`Заявка №${result.order.number} отправлена! Мы свяжемся с вами в Telegram для уточнения деталей и стоимости.`);
      setDescription("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Произошла ошибка.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="order-form" onSubmit={submit}>
      <div className="form-heading">
        <span>02 / НОВЫЙ ЗАКАЗ</span>
        <h2>Расскажите, что напечатать</h2>
      </div>

      <fieldset>
        <legend>Макет</legend>
        <div className="choice-grid">
          <button type="button" className={artworkType === "READY" ? "choice active" : "choice"} onClick={() => setArtworkType("READY")}>
            <strong>У меня есть макет</strong><small>Файл или изображение готово</small>
          </button>
          <button type="button" className={artworkType === "CREATE_NEW" ? "choice active" : "choice"} onClick={() => setArtworkType("CREATE_NEW")}>
            <strong>Нужен дизайн</strong><small>Помогите создать изображение</small>
          </button>
        </div>
      </fieldset>

      <label className="field-label">Что печатаем?
        <input value={productName} onChange={e => setProductName(e.target.value)} maxLength={100} required />
      </label>

      <label className="field-label">Размер
        <select value={size} onChange={e => setSize(e.target.value)}>
          {sizes.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>

      <label className="field-label">Количество
        <input type="number" min={1} max={100} value={quantity} onChange={e => setQuantity(Number(e.target.value))} required />
      </label>

      <label className="field-label">Комментарий к заказу
        <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={1500} rows={4} placeholder={artworkType === "READY" ? "Опишите макет. Файл пока можно будет отправить администратору в Telegram." : "Опишите идею, стиль, надписи и пожелания."} />
      </label>

      <button className="submit-order" type="submit" disabled={sending}>
        {sending ? "ОТПРАВЛЯЕМ…" : "ОТПРАВИТЬ ЗАЯВКУ ↗"}
      </button>
      {message && <p className="form-message" role="status">{message}</p>}
      <p className="form-footnote">Стоимость и сроки подтвердим в Telegram после уточнения деталей.</p>
    </form>
  );
}