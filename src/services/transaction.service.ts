import prisma from "../prisma/client";
import { nowSP } from "../utils/date";
import type { Transaction } from "@prisma/client";

interface CreateTransactionInput {
  userId: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string | null;
  category: string;
  paymentMethod: string;
  date: Date | null;
  rawMessage: string;
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  return prisma.transaction.create({
    data: {
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      description: input.description,
      category: input.category,
      paymentMethod: input.paymentMethod || "unknown",
      date: input.date || nowSP(),
      rawMessage: input.rawMessage,
    },
  });
}

export async function getTransactions(
  userId: string,
  start: Date,
  end: Date,
  limit?: number
): Promise<Transaction[]> {
  return prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: start, lte: end },
    },
    orderBy: { date: "desc" },
    take: limit,
  });
}
