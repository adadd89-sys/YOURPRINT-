import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id: number; type?: string };
  };
};

function isValidSecret(received: string | null, expected: string) {
  if (!received || received.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= received.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

async function sendTelegramMessage(
  token: string,
  chatId: number,
  text: string,
  miniAppUrl?: string
) {
  const replyMarkup = miniAppUrl
    ? {
        inline_keyboard: [[{
          text: "Открыть YOURPRINT",
          web_app: { url: miniAppUrl }
        }]]
      }
    : undefined;

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {})
    })
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Telegram sendMessage failed: ${response.status} ${details.slice(0, 300)}`);
  }
}

export async function POST(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !webhookSecret) {
    return NextResponse.json({ error: "Telegram webhook is not configured." }, { status: 503 });
  }

  if (!isValidSecret(request.headers.get("x-telegram-bot-api-secret-token"), webhookSecret)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json() as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  const message = update.message;
  const chatId = message?.chat?.id;
  const text = message?.text?.trim();
  if (!chatId || !text || message?.chat?.type !== "private") {
    return NextResponse.json({ ok: true });
  }

  const command = text.split(/\\s+/, 1)[0].split("@", 1)[0];
  if (command === "/start") {
    await sendTelegramMessage(
      token,
      chatId,
      "Добро пожаловать в YOURPRINT!\\n\\nЗдесь можно оформить заказ на DTF-печать, выбрать готовый макет или заказать разработку дизайна.",
      process.env.MINI_APP_URL
    );
  } else if (command === "/help") {
    await sendTelegramMessage(
      token,
      chatId,
      "Чтобы оформить заказ, нажмите «Открыть YOURPRINT» в сообщении бота. По вопросам заказа можно написать администратору.",
      process.env.MINI_APP_URL
    );
  }

  return NextResponse.json({ ok: true });
}
