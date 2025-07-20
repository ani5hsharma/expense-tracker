import { Telegraf, Markup, session } from "telegraf";
import { message } from "telegraf/filters";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import { google } from "googleapis";
import { ExpenseEntry } from "./types";
import { Context } from "telegraf";

interface MySession {
  transactions: ExpenseEntry[];
  categorized: ExpenseEntry[];
  categories: string[];
  currentIndex: number;
}
interface MyContext extends Context {
  session: MySession;
}

const getSheets = async () => {
  const auth = await google.auth.getClient({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });
const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) throw new Error("Token not found!");
const bot = new Telegraf<MyContext>(TOKEN);

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
const spreadsheetId = process.env.SPREADSHEET_ID;
// const sheetId = process.env.SHEET_ID;
const sheetName = process.env.SHEET_NAME;

const insertExpenses = async (data: ExpenseEntry[]) => {
  data.reverse();
  const sheets = await getSheets();
  const range = `${sheetName}!A1:D`; // sheet name and range
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      majorDimension: "ROWS",
      values: data.map((expense) => [
        expense.date,
        expense.amount,
        expense.category,
        expense.merchantName,
      ]),
    },
  });
  return res.status + res.statusText;
};

const getCategories = async () => {
  let availableCategories: string[] = [];
  const sheets = await getSheets();
  const validationRules = await sheets.spreadsheets.get({
    spreadsheetId,
    ranges: [`${sheetName}!C2`],
    fields:
      "sheets(data/rowData/values/dataValidation,properties(sheetId,title))",
  });
  const validation =
    validationRules.data.sheets?.[0]?.data?.[0]?.rowData?.[0]?.values?.[0]
      ?.dataValidation?.condition;

  if (validation && validation.type === "ONE_OF_LIST" && validation.values) {
    if (
      validation.values.every(
        (each) => typeof each.userEnteredValue === "string"
      )
    )
      availableCategories = validation.values.map(
        (each) => each.userEnteredValue
      ) as string[];
  }
  return availableCategories;
};
function extractJSON(markdownString: string) {
  return JSON.parse(markdownString.replace(/```json\s*|\s*```/g, "").trim());
}

const getExpensesFromImage = async (fileId: string) => {
  const fileLinks = await bot.telegram.getFileLink(fileId);
  const { href } = fileLinks;
  const imageRes = await fetch(href);
  if (!imageRes.ok) {
    throw new Error(`Failed to fetch file: ${imageRes.statusText}`);
  }
  const arrayBuffer = await imageRes.arrayBuffer();
  const fileBlob = new Blob([arrayBuffer]);
  const myfile = await ai.files.upload({
    file: fileBlob,
    config: { mimeType: "image/jpeg" },
  });
  if (!myfile || !myfile.uri || !myfile.mimeType) return { success: false };
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: createUserContent([
      createPartFromUri(myfile.uri, myfile.mimeType),
      `This is a screenshot of payments. Payment merchant name and amount is mentioned.
  Return an array of objects in the form:
  { merchantName: '', amount: '', date: '', type: '' }
  - "amount" should be a number.
  - "date" should be a string format compatible with Google Sheets (e.g., "2025-06-09"). Assume the year to be the current year 2025.
  - "type" is either 'debit' or 'credit'. If an amount is in green color and marked with '+', it is 'credit', otherwise 'debit'.
  - Ignore failed trasactions. Do not count them.`,
    ]),
  });
  if (response && response.text) {
    const data = extractJSON(response.text);
    if (data) {
      return { data: data, success: true };
    }
  }
  return { success: false };
};

bot.on(message("photo"), async (ctx) => {
  if (!ctx.session.categories || ctx.session.categories.length === 0) {
    await ctx.reply("Please set categories first!");
    return;
  }
  const fileId = ctx.message?.photo[2].file_id;
  if (!fileId) {
    ctx.sendMessage("Failed to recognise text!");
    return;
  }
  await ctx.reply("Detecting screenshots from image!");
  const data = await getExpensesFromImage(fileId);
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
});

async function askNextTransaction(ctx: MyContext) {
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
      console.log("Final data:", ctx.session.categorized);
      return ctx.reply("📄 Data added to sheet successfully!");
    }
  }
}

bot.command("get_categories", async (ctx) => {
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
});

bot.command("set_categories", async (ctx) => {
  const input = ctx.message.text;

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
});

bot.action(/cat:(.+)/, async (ctx) => {
  const chosenCategory = ctx.match[1];
  const index = ctx.session.currentIndex;
  const tx = ctx.session.transactions[index];

  // Save the categorized transaction
  ctx.session.categorized.push({
    ...tx,
    category: chosenCategory,
  });

  ctx.session.currentIndex += 1;

  await ctx.answerCbQuery(); // Clear "loading" spinner
  await askNextTransaction(ctx);
});

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

bot.telegram.setMyCommands([
  { command: "start", description: "Start the bot" },
  { command: "get_categories", description: "Fetch categories from sheet" },
  { command: "set_categories", description: "Manually set categories" },
  { command: "add_expense", description: "Add an expense manually" },
]);
bot.start(async (ctx) => {
  await ctx.telegram.setMyCommands([
    { command: "get_categories", description: "Fetch categories from sheet" },
    { command: "set_categories", description: "Manually set categories" },
  ]);

  ctx.reply("Welcome! Use /get_categories to fetch your categories.");
});

bot.launch(() => console.log("Bot Listening!"));
