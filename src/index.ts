import { Telegraf, session } from "telegraf";
import { message } from "telegraf/filters";
import { MyContext, MySession } from "./types";
import { photoCommand } from "./commands/photoCommand";
import { setCategoriesCommand } from "./commands/setCategoriesCommand";
import { assignCategoryCommand } from "./commands/assignCategoryCommand";
import { getCategoriesCommand } from "./commands/getCategoriesCommand";
const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) throw new Error("Token not found!");
export const bot = new Telegraf<MyContext>(TOKEN);

bot.use(
  session({
    defaultSession: (): MySession => ({
      transactions: [],
      categorized: [],
      categories: [],
      currentIndex: 0,
    }),
  })
);

bot.on(message("photo"), photoCommand);

bot.command("get_categories", getCategoriesCommand);

bot.command("set_categories", setCategoriesCommand);

bot.action(/cat:(.+)/, assignCategoryCommand);

bot.catch((err, ctx) => {
  console.error("Bot error:", err);
  try {
    ctx.reply("⚠️ Oops! Something went wrong. Please try again.");
  } catch (e) {
    console.error("Failed to send error message to user:", e);
  }
});

bot.command("ping", async (ctx) => {
  await ctx.reply("pong!");
});

bot.start(async (ctx) => {
  await ctx.telegram.setMyCommands([
    { command: "get_categories", description: "Fetch categories from sheet" },
    { command: "set_categories", description: "Manually set categories" },
  ]);
  ctx.reply("Welcome! Use /get_categories to fetch your categories.");
});

bot.launch(() => console.log("Bot Listening!"));
