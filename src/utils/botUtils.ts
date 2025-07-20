import { Markup } from "telegraf";
import { insertExpenses } from "@/utils/sheetUtils";
import { MyContext } from "@/types";

export async function askNextTransaction(ctx: MyContext) {
  if (!ctx.session.categories || ctx.session.categories.length === 0) {
    await ctx.reply("Please set categories first!");
    return;
  }
  const tx = ctx.session.transactions?.[ctx.session.currentIndex];

  if (tx) {
    await ctx.reply(
      `What category for:\n\n🧾 Spent ₹${tx.amount} at ${tx.merchantName} on ${tx.date}`,
      Markup.inlineKeyboard(
        ctx.session.categories.map((c) =>
          Markup.button.callback(c, `cat:${c}`)
        ),
        { columns: 2 }
      )
    );
  } else {
    if (!tx) {
      await ctx.reply("✅ All transactions categorized! Sending to sheet...");
      await insertExpenses(ctx.session.categorized);
      return ctx.reply("📄 Data added to sheet successfully!");
    }
  }
}
