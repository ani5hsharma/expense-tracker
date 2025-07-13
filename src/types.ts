export interface ExpenseEntry {
  merchantName: string;
  amount: number;
  date: string;
  type: "debit" | "credit";
}
