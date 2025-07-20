export interface ExpenseEntry {
  merchantName: string;
  amount: number;
  date: string;
  category?: string;
  type: "debit" | "credit";
}
