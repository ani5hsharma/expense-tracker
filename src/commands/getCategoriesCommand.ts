import { getCategories } from "@/utils/sheetUtils";
import { TextMessageContext } from "@/types";

export const getCategoriesCommand = async (ctx: TextMessageContext) => {
  const categories = await getCategories();
  if (
    categories &&
    categories.length > 0 &&
    categories.every((each) => typeof each === "string")
  ) {
    ctx.session.categories = categories;
    await ctx.reply(
      `✅ Categories loaded from sheet:\n\n${categories.join(", ")}`
    );
  } else {
    await ctx.reply(
      "❌ Failed to detect categories from sheet. Please set them manually by sending:\n\n`/set_categories Food, Travel, Shopping`\n\n(Comma-separated list)",
      { parse_mode: "Markdown" }
    );
  }
};
