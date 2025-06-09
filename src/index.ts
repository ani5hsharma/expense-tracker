import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });
const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) throw new Error("Token not found!");
const bot = new Telegraf(TOKEN);

bot.on(message("photo"), async (ctx) => {
  try {
    const fileId = ctx.message.photo[2].file_id;
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
    if (!myfile || !myfile.uri || !myfile.mimeType)
      return ctx.sendMessage("Failed to upload image");

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: createUserContent([
        createPartFromUri(myfile.uri, myfile.mimeType),
        `This is a screenshot of payments. Payment merchant name and amount is mentioned.

Return an array of objects in the form:
{ merchantName: '', amount: '', date: '', type: '' }

- "amount" should be a number.
- "date" should be a string format compatible with Google Sheets (e.g., "2025-06-09"). Assume the year to be the current year 2025.
- "type" is either 'debit' or 'credit'. If an amount is in green color and marked with '+', it is 'credit', otherwise 'debit'.`,
      ]),
    });
    if (response) {
      ctx.sendMessage(response.text ?? "Failed");
    } else ctx.sendMessage("Failed to recognise text!");
  } catch (e) {
    ctx.sendMessage(e.toString());
    console.error(e);
  }
});
bot.start((ctx) => ctx.reply("Welcome! Start Tracking Expenses."));
bot.launch(() => console.log("Bot Listening!"));
