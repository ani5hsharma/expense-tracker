import { CommandContextExtn } from "telegraf/typings/telegram-types";
import { Context, NarrowedContext, Scenes } from "telegraf";
import { Deunionize } from "telegraf/typings/core/helpers/deunionize";
import {
  CallbackQuery,
  Message,
  Update,
} from "telegraf/typings/core/types/typegram";

export interface ExpenseEntry {
  merchantName: string;
  amount: number;
  date: string;
  category?: string;
  type: "debit" | "credit";
}

export interface MySession {
  transactions: ExpenseEntry[];
  categorized: ExpenseEntry[];
  categories: string[];
  currentIndex: number;
}
export interface MyContext<U extends Deunionize<Update> = Update>
  extends Context<U> {
  session: MySession;
}

export type TextMessageContext = MyContext & {
  message: Message.TextMessage;
};
