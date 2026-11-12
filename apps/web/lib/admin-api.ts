export async function readAdminJson<T = any>(response: Response): Promise<T> {
  const body = await response.text();
  try {
    return JSON.parse(body) as T;
  } catch {
    const detail = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
    throw new Error(
      `Сервер вернул некорректный ответ (HTTP ${response.status}). ${detail || "Пустой ответ"}`
    );
  }
}
