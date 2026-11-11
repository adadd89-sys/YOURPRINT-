"use client";

import { ChangeEvent, CSSProperties, useEffect, useState } from "react";

const sizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const garments = [
  { id: "Футболка", label: "Футболка", shape: "tee" },
  { id: "Худи", label: "Худи", shape: "hoodie" },
  { id: "Свитшот", label: "Свитшот", shape: "sweatshirt" }
] as const;

export function PrintDesigner() {
  const [garment, setGarment] = useState("Футболка");
  const [color, setColor] = useState("#eeeeeb");
  const [size, setSize] = useState("M");
  const [quantity, setQuantity] = useState(1);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [scale, setScale] = useState(42);
  const [position, setPosition] = useState(48);
  const [placement, setPlacement] = useState("По центру груди");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!image) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 15 * 1024 * 1024) {
      setMessage("Загрузите PNG, JPG или WEBP размером до 15 МБ.");
      return;
    }
    setImage(file);
    setMessage("");
  }

  async function createOrder() {
    if (!image) { setMessage("Сначала загрузите изображение для принта."); return; }
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) { setMessage("Откройте Mini App через Telegram."); return; }
    setSending(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("initData", initData);
      form.set("artworkType", "CREATE_NEW");
      form.set("productName", garment);
      form.set("size", size);
      form.set("quantity", String(quantity));
      form.set("description", [
        "ЗАКАЗ ИЗ КОНСТРУКТОРА ПРИНТОВ",
        `Цвет изделия: ${color}`,
        `Расположение: ${placement}`,
        `Размер принта: ${scale}%`,
        `Положение принта: ${position}%`,
        comment.trim()
      ].filter(Boolean).join("\\n"));
      form.append("files", image, image.name);
      const response = await fetch("/api/orders", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Не удалось отправить заявку.");
      setMessage(`Заявка №${result.order.number} отправлена! Макет и параметры переданы менеджеру в Telegram. Стоимость подтвердим после проверки.`);
      setImage(null);
      setComment("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Произошла ошибка.");
    } finally {
      setSending(false);
    }
  }

  const isHoodie = garment === "Худи";
  const isSweatshirt = garment === "Свитшот";

  return (
    <section className="designer-section" id="designer">
      <div className="designer-heading">
        <span className="section-kicker">01 / КОНСТРУКТОР</span>
        <h2>Создай свой принт</h2>
        <p>Загрузи изображение, выбери одежду и настрой расположение принта. Мы получим макет и свяжемся с тобой для подтверждения.</p>
      </div>

      <div className="designer-layout">
        <div className="designer-preview-wrap">
          <div className="designer-preview" style={{ "--garment-color": color } as CSSProperties}>
            <svg className="garment-svg" viewBox="0 0 320 340" role="img" aria-label={garment}>
              {isHoodie ? (
                <><path d="M111 53 75 66 30 105 55 166 87 149 87 304 Q160 321 233 304 L233 149 265 166 290 105 245 66 209 53 Q205 103 160 111 115 103 111 53Z" /><path d="M111 53 Q112 110 160 111 Q208 110 209 53 L194 27 Q160 5 126 27Z" /><path d="M132 93 Q160 133 188 93 L180 164 160 181 140 164Z" className="garment-detail" /><path d="M132 93 142 164 M188 93 178 164" className="garment-line" /><path d="M125 257 Q160 269 195 257 L195 290 Q160 300 125 290Z" className="garment-detail" /></>
              ) : isSweatshirt ? (
                <><path d="M111 53 75 66 30 105 55 166 87 149 87 304 Q160 321 233 304 L233 149 265 166 290 105 245 66 209 53 Q205 103 160 111 115 103 111 53Z" /><path d="M111 53 Q112 110 160 111 Q208 110 209 53" className="garment-line" /><path d="M87 286 Q160 304 233 286 M55 154 75 163 M265 154 245 163" className="garment-line" /></>
              ) : (
                <><path d="M111 53 75 66 30 105 55 166 87 149 87 304 Q160 321 233 304 L233 149 265 166 290 105 245 66 209 53 Q205 103 160 111 115 103 111 53Z" /><path d="M111 53 Q112 110 160 111 Q208 110 209 53" className="garment-line" /></>
              )}
              <path d="M87 149 87 304 Q160 321 233 304 L233 149" className="garment-line" />
            </svg>
            {previewUrl ? <img className="designer-artwork" src={previewUrl} alt="Предпросмотр принта" style={{ width: scale + "%", top: position + "%", left: placement === "Слева на груди" ? "40%" : placement === "На рукаве" ? "24%" : "50%" }} /> : <div className="designer-placeholder">ТВОЙ<br/>ДИЗАЙН</div>}
            <span className="preview-label">ПРЕДВАРИТЕЛЬНЫЙ ВИД</span>
          </div>
          <p className="designer-preview-note">Предпросмотр схематичный. Итоговый размер и размещение согласуем перед печатью.</p>
        </div>

        <div className="designer-controls">
          <label className="designer-label">1. Выбери изделие
            <div className="garment-options">
              {garments.map((item) => <button type="button" key={item.id} className={garment === item.id ? "garment-option active" : "garment-option"} onClick={() => setGarment(item.id)}>{item.label}</button>)}
            </div>
          </label>

          <label className="designer-label">2. Цвет изделия
            <div className="color-options">
              {[{ value: "#eeeeeb", name: "Белый" }, { value: "#222222", name: "Чёрный" }, { value: "#777b80", name: "Серый" }, { value: "#243b55", name: "Синий" }, { value: "#754b3b", name: "Коричневый" }].map((item) => <button type="button" key={item.value} title={item.name} aria-label={item.name} className={color === item.value ? "color-option active" : "color-option"} style={{ background: item.value }} onClick={() => setColor(item.value)} />)}
            </div>
          </label>

          <label className="designer-label">3. Загрузить изображение
            <span className="designer-upload">＋ {image ? "Заменить изображение" : "Выбрать изображение"}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} />
            </span>
            <small className="designer-help">{image ? image.name : "PNG, JPG или WEBP · до 15 МБ"}</small>
          </label>

          <label className="designer-label">Расположение
            <select value={placement} onChange={(e) => setPlacement(e.target.value)}>
              <option>По центру груди</option><option>Слева на груди</option><option>Спина</option><option>На рукаве</option>
            </select>
          </label>

          <label className="designer-label">Размер принта · {scale}%
            <input type="range" min="20" max="75" value={scale} onChange={(e) => setScale(Number(e.target.value))} />
          </label>
          <label className="designer-label">Положение по высоте · {position}%
            <input type="range" min="25" max="72" value={position} onChange={(e) => setPosition(Number(e.target.value))} />
          </label>

          <div className="designer-fields">
            <label className="designer-label">Размер одежды
              <select value={size} onChange={(e) => setSize(e.target.value)}>{sizes.map((value) => <option key={value}>{value}</option>)}</select>
            </label>
            <label className="designer-label">Количество
              <input type="number" min="1" max="100" value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} />
            </label>
          </div>
          <label className="designer-label">Комментарий
            <textarea rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Например: принт должен быть матовым..." />
          </label>
          <button type="button" className="designer-submit" onClick={() => void createOrder()} disabled={sending}>{sending ? "ОТПРАВЛЯЕМ…" : "ОТПРАВИТЬ МАКЕТ НА РАСЧЁТ ↗"}</button>
          {message && <p className="designer-message" role="status">{message}</p>}
        </div>
      </div>
    </section>
  );
}
