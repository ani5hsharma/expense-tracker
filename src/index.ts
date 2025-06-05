import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import Tesseract from "tesseract.js";

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) throw new Error("Token not found!");
const bot = new Telegraf(TOKEN);
bot.on(message("photo"), async (ctx) => {
  const fileId = ctx.message.photo[2].file_id;
  const fileLinks = await bot.telegram.getFileLink(fileId);
  const { href } = fileLinks;
  const data = await Tesseract.recognize(href);
  if (data.data.text) {
    ctx.sendMessage(data.data.text);
  } else ctx.sendMessage("Failed to recognise text!");
});
bot.start((ctx) => ctx.reply("Welcome! Start Tracking Expenses."));
bot.launch(() => console.log("Bot Listening!"));
