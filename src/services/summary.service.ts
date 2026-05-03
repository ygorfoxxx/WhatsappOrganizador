import { getTransactions } from "./transaction.service";
import { todayRange, monthRange } from "../utils/date";

interface SummaryResult {
  expenses: number;
  income: number;
  byCategory: Record<string, number>;
  transactions: Array<{
    type: string;
    amount: number;
    description: string | null;
    category: string;
    date: Date;
  }>;
}

export async function getTodaySummary(userId: string): Promise<SummaryResult> {
  const { start, end } = todayRange();
  const transactions = await getTransactions(userId, start, end, 5);

  return buildSummary(transactions);
}

export async function getMonthSummary(userId: string): Promise<SummaryResult> {
  const { start, end } = monthRange();
  const transactions = await getTransactions(userId, start, end, 10);

  // Para byCategory, precisamos de TODAS as transações do mês
  const allMonth = await getTransactions(userId, start, end);

  const summary = buildSummary(allMonth);
  summary.transactions = transactions;
  return summary;
}

export async function getMonthTotals(userId: string): Promise<{ expenses: number; income: number }> {
  const { start, end } = monthRange();
  const all = await getTransactions(userId, start, end);

  let expenses = 0;
  let income = 0;
  for (const t of all) {
    if (t.type === "EXPENSE") expenses += t.amount;
    else income += t.amount;
  }
  return { expenses, income };
}

function buildSummary(transactions: Array<{
  type: string;
  amount: number;
  description: string | null;
  category: string;
  date: Date;
}>): SummaryResult {
  let expenses = 0;
  let income = 0;
  const byCategory: Record<string, number> = {};

  for (const t of transactions) {
    if (t.type === "EXPENSE") {
      expenses += t.amount;
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    } else {
      income += t.amount;
    }
  }

  return { expenses, income, byCategory, transactions };
}
