import "dotenv/config";
import { Bot, InlineKeyboard } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN;
const miniAppUrl = process.env.MINI_APP_URL;

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is required");
}

const bot = new Bot(token);

bot.command("start", async (ctx) => {
  const keyboard = new InlineKeyboard();

  if (miniAppUrl) {
    keyboard.webApp("Открыть YOURPRINT", miniAppUrl);
  }

  await ctx.reply(
    "Добро пожаловать в YOURPRINT!\n\nЗдесь можно оформить заказ на DTF-печать, выбрать готовый макет или заказать разработку дизайна.",
    { reply_markup: keyboard }
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply("Чтобы оформить заказ, нажмите «Открыть YOURPRINT» в меню бота. По вопросам заказа можно написать администратору.");
});

bot.catch((error) => {
  console.error("Telegram bot error:", error);
});

bot.start();
console.log("YOURPRINT bot is running");