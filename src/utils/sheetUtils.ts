import { google } from "googleapis";
import { ExpenseEntry } from "@/types";
const sheetName = process.env.SHEET_NAME;
const spreadsheetId = process.env.SPREADSHEET_ID;

const getSheets = async () => {
  const auth = await google.auth.getClient({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
};

export const insertExpenses = async (data: ExpenseEntry[]) => {
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

export const getCategories = async () => {
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
