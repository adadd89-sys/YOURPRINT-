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
            <svg className={`garment-svg garment-${isHoodie ? "hoodie" : isSweatshirt ? "sweatshirt" : "tee"}`} viewBox="0 0 320 340" role="img" aria-label={garment}>
              <defs>
                <linearGradient id="fabricBase" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".25" /><stop offset=".32" stopColor="#fff" stopOpacity=".06" /><stop offset=".68" stopColor="#000" stopOpacity=".08" /><stop offset="1" stopColor="#000" stopOpacity=".3" /></linearGradient>
                <linearGradient id="fabricShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#000" stopOpacity=".22" /><stop offset=".22" stopColor="#fff" stopOpacity=".1" /><stop offset=".5" stopColor="#fff" stopOpacity=".03" /><stop offset="1" stopColor="#000" stopOpacity=".2" /></linearGradient>
                <filter id="fabricShadow" x="-30%" y="-20%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="5" /><feOffset dy="7" /><feComponentTransfer><feFuncA type="linear" slope=".35" /></feComponentTransfer><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              <g filter="url(#fabricShadow)">
                {isHoodie ? (
                  <>
                    <path className="garment-piece" d="M111 61 76 70 27 112 54 181 88 160 91 302 Q160 321 229 302 L232 160 266 181 293 112 244 70 209 61 194 87 Q160 116 126 87Z" />
                    <path className="garment-detail" d="M111 61 Q111 112 160 119 Q209 112 209 61 L194 24 Q160 -2 126 24Z" />
                    <path className="garment-line" d="M126 26 Q128 76 160 89 Q192 76 194 26 M160 89 160 117" />
                    <path className="garment-detail" d="M126 220 Q160 232 194 220 L205 275 Q160 294 115 275Z" />
                    <path className="garment-line" d="M126 220 Q160 232 194 220 M142 220 145 270 M178 220 175 270 M91 285 Q160 306 229 285" />
                  </>
                ) : isSweatshirt ? (
                  <>
                    <path className="garment-piece" d="M111 52 76 67 29 108 54 174 87 154 90 291 Q160 310 230 291 L233 154 266 174 291 108 244 67 209 52 Q205 104 160 111 Q115 104 111 52Z" />
                    <path className="garment-detail" d="M111 52 Q112 104 160 111 Q208 104 209 52 Q205 78 160 83 Q115 78 111 52Z" />
                    <path className="garment-detail" d="M89 280 Q160 300 231 280 L230 305 Q160 326 90 305Z M52 159 65 165 77 151 86 157 75 181 60 185Z M268 159 255 165 243 151 234 157 245 181 260 185Z" />
                    <path className="garment-line" d="M111 52 Q112 104 160 111 Q208 104 209 52 M90 291 Q160 310 230 291" />
                  </>
                ) : (
                  <>
                    <path className="garment-piece" d="M111 52 76 67 29 108 54 174 87 154 90 302 Q160 321 230 302 L233 154 266 174 291 108 244 67 209 52 Q205 104 160 111 Q115 104 111 52Z" />
                    <path className="garment-detail" d="M111 52 Q112 104 160 111 Q208 104 209 52 Q205 78 160 83 Q115 78 111 52Z" />
                    <path className="garment-line" d="M111 52 Q112 104 160 111 Q208 104 209 52 M90 302 Q160 321 230 302" />
                  </>
                )}
                <path className="garment-highlight" d="M105 67 83 78 43 112 58 151 M215 67 237 78 277 112 262 151 M101 132 103 280 M219 132 217 280" />
              </g>
            </svg>            {previewUrl ? <img className="designer-artwork" src={previewUrl} alt="Предпросмотр принта" style={{
              width: scale + "%",
              maxWidth: placement.includes("плече") || placement === "На рукаве" ? "34%" : "75%",
              top: placement.includes("плече") ? "37%" : placement === "На рукаве" ? "43%" : placement === "Слева на груди" || placement === "Спина" ? "47%" : position + "%",
              left: placement === "На левом плече" ? "29%" : placement === "На правом плече" ? "71%" : placement === "На рукаве" ? "24%" : placement === "Слева на груди" ? "40%" : "50%",
              transform: "translate(-50%, -50%) rotate(" + (placement === "На левом плече" || placement === "На рукаве" ? "-90deg" : placement === "На правом плече" ? "90deg" : "0deg") + ")"
            }} /> : <div className="designer-placeholder">ТВОЙ<br/>ДИЗАЙН</div>}
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
              <option>По центру груди</option><option>Слева на груди</option><option>Спина</option><option>На левом плече</option><option>На правом плече</option><option>На рукаве</option>
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
