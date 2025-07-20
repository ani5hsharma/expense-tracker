import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });

function extractJSON(markdownString: string) {
  return JSON.parse(markdownString.replace(/```json\s*|\s*```/g, "").trim());
}

export const getExpensesFromImage = async (href: string) => {
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
