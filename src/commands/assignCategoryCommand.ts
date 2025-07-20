import { MyContext } from "@/types";
import { askNextTransaction } from "@/utils/botUtils";
import { MiddlewareFn } from "telegraf";

export const assignCategoryCommand: MiddlewareFn<
  MyContext & { match: RegExpExecArray }
> = async (ctx) => {
  const chosenCategory = ctx.match[1];
  const index = ctx.session.currentIndex;
  const tx = ctx.session.transactions[index];

  ctx.session.categorized.push({
    ...tx,
    category: chosenCategory,
  });

  ctx.session.currentIndex += 1;

  await ctx.answerCbQuery(); // Clear "loading" spinner
  await askNextTransaction(ctx);
};
