import { Telegraf } from "telegraf";

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) throw new Error("Token not found!");
const bot = new Telegraf(TOKEN);
bot.start((ctx) => ctx.reply("Welcome! Start Tracking Expenses."));
bot.launch(() => console.log("Bot Listening!"));
