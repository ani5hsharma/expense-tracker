import { TextMessageContext } from "@/types";

export const setCategoriesCommand = async (ctx: TextMessageContext) => {
  const input = ctx.message?.text;

  const raw = input.replace("/set_categories", "").trim();

  if (!raw) {
    return ctx.reply(
      "❗ Please provide categories separated by commas.\n\nExample:\n`/set-categories Food, Travel, Shopping`",
      { parse_mode: "Markdown" }
    );
  }

  const categories = raw
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  if (categories.length === 0) {
    return ctx.reply("❗ No valid categories found. Please try again.");
  }

  ctx.session.categories = categories;

  await ctx.replyWithMarkdownV2(
    `✅ Categories saved:\n\n${categories
      .map((c) => c.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&"))
      .join(", ")}`
  );
};
