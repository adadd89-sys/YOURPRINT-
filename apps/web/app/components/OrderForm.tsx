"use client";

import { FormEvent, useState } from "react";

const sizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Universal"];
const acceptedExtensions = [".png", ".jpg", ".jpeg", ".webp", ".pdf", ".svg", ".tif", ".tiff", ".psd", ".ai"];
const maxFileSize = 15 * 1024 * 1024;
const maxFiles = 5;

export function OrderForm() {
  const [artworkType, setArtworkType] = useState<"READY" | "CREATE_NEW">("READY");
  const [productName, setProductName] = useState("Футболка");
  const [size, setSize] = useState("M");
  const [quantity, setQuantity] = useState(1);
  const [description, setDescription] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const selected = Array.from(fileList);
    const combined = [...files, ...selected];
    if (combined.length > maxFiles) {
      setMessage(`Можно прикрепить не более ${maxFiles} файлов.`);
      return;
    }
    const invalid = selected.find((file) =>
      file.size > maxFileSize ||
      !acceptedExtensions.some((extension) => file.name.toLowerCase().endsWith(extension))
    );
    if (invalid) {
      setMessage(`Файл «${invalid.name}» не подходит. Проверьте формат и размер до 15 МБ.`);
      return;
    }
    setFiles(combined);
    setMessage("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage("");

    try {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) throw new Error("Откройте Mini App через Telegram.");

      const body = new FormData();
      body.set("initData", initData);
      body.set("artworkType", artworkType);
      body.set("productName", productName);
      body.set("size", size);
      body.set("quantity", String(quantity));
      body.set("description", description);
      body.set("promoCode", promoCode);
      files.forEach((file) => body.append("files", file, file.name));

      const response = await fetch("/api/orders", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Не удалось отправить заказ.");

      const fileNote = result.warning
        ? ` ${result.warning}`
        : files.length ? ` Файлы (${files.length}) переданы администраторам.` : "";
      const promoNote = result.promo ? ` Промокод ${result.promo.code} применён: скидка ${result.promo.discountPct}%.` : "";
      setMessage(`Заявка №${result.order.number} отправлена!${promoNote} Мы свяжемся с вами в Telegram для уточнения деталей и стоимости.${fileNote}`);
      setDescription("");
      setPromoCode("");
      setFiles([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Произошла ошибка.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="order-form" id="order-form" onSubmit={submit}>
      <div className="form-heading">
        <span>02 / НОВЫЙ ЗАКАЗ</span>
        <h2>Расскажите, что напечатать</h2>
      </div>

      <fieldset>
        <legend>Макет</legend>
        <div className="choice-grid">
          <button type="button" className={artworkType === "READY" ? "choice active" : "choice"} onClick={() => setArtworkType("READY")}>
            <strong>У меня есть макет</strong><small>Прикрепите готовый файл</small>
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

      <div className="upload-field">
        <span className="field-label">Файлы макета</span>
        <label className="upload-drop">
          <strong>＋ Прикрепить файлы</strong>
          <small>До 5 файлов, каждый до 15 МБ</small>
          <small>PNG, JPG, WEBP, PDF, SVG, TIFF, PSD, AI</small>
          <input
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.webp,.pdf,.svg,.tif,.tiff,.psd,.ai"
            onChange={(event) => {
              addFiles(event.target.files);
              event.currentTarget.value = "";
            }}
          />
        </label>
        {files.length > 0 && (
          <ul className="selected-files">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`}>
                <span>{file.name}<small>{(file.size / 1024 / 1024).toFixed(1)} МБ</small></span>
                <button type="button" aria-label={`Удалить ${file.name}`} onClick={() => setFiles(current => current.filter((_, i) => i !== index))}>×</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="field-label">Промокод
        <input value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))} maxLength={32} placeholder="Если есть, введите код" autoCapitalize="characters" />
        <small className="promo-hint">Скидка будет подтверждена при оформлении заказа.</small>
      </label>

      <label className="field-label">Комментарий к заказу
        <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={1500} rows={4} placeholder={artworkType === "READY" ? "Опишите макет, расположение и пожелания." : "Опишите идею, стиль, надписи и пожелания."} />
      </label>

      <button className="submit-order" type="submit" disabled={sending}>
        {sending ? "ОТПРАВЛЯЕМ…" : "ОТПРАВИТЬ ЗАЯВКУ ↗"}
      </button>
      {message && <p className="form-message" role="status">{message}</p>}
      <p className="form-footnote">Стоимость и сроки подтвердим в Telegram после уточнения деталей.</p>
    </form>
  );
}
