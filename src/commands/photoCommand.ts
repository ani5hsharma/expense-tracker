import { getExpensesFromImage } from "@/utils/aiUtils";

import { MiddlewareFn } from "telegraf";
import { MyContext } from "@/types";
import { askNextTransaction } from "@/utils/botUtils";
import { bot } from "../index";

export const photoCommand: MiddlewareFn<MyContext> = async (ctx) => {
  if (!ctx.session.categories || ctx.session.categories.length === 0) {
    await ctx.reply("Please set categories first!");
    return;
  }
  if (ctx.message && "photo" in ctx.message) {
    const fileId = ctx.message?.photo[2].file_id;
    if (!fileId) {
      ctx.sendMessage("Failed to recognise text!");
      return;
    }
    const fileLinks = await bot.telegram.getFileLink(fileId);
    const { href } = fileLinks;
    await ctx.reply("Detecting transactions from image!");
    const data = await getExpensesFromImage(href);
    if (data.success && data.data) {
      ctx.session.transactions = data.data;
      ctx.session.currentIndex = 0;
      ctx.session.categorized = [];
    } else {
      await ctx.reply("Failed to detect screenshots! Please try again later.");
      return;
    }
    await ctx.reply(
      `Found ${data.data.length} transactions. Let's categorize them.`
    );
    await askNextTransaction(ctx);
  } else {
    await ctx.reply("Unexpected Error!!");
    return;
  }
};
