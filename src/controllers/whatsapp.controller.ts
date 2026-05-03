import type { Request, Response } from "express";
import { parseWebhookPayload } from "../utils/message-parser";
import { interpretMessage } from "../services/ai-interpreter.service";
import { findOrCreateUser } from "../services/user.service";
import { createTransaction } from "../services/transaction.service";
import { getTodaySummary, getMonthSummary, getMonthTotals } from "../services/summary.service";
import { sendMessage } from "../services/whatsapp.service";
import { nowSP } from "../utils/date";
import {
  formatExpenseConfirmation,
  formatIncomeConfirmation,
  formatTodaySummary,
  formatMonthSummary,
  formatHelp,
  formatUnknown,
} from "../utils/format";

export async function handleWebhook(req: Request, res: Response): Promise<void> {
  try {
    const parsed = parseWebhookPayload(req.body);

    if (parsed.fromMe) {
      console.log("[Webhook] Mensagem própria do bot, ignorando.");
      res.status(200).json({ status: "ignored" });
      return;
    }

    if (!parsed.phone || !parsed.text) {
      console.log("[Webhook] Mensagem sem phone ou text, ignorando.");
      res.status(200).json({ status: "ignored" });
      return;
    }

    console.log(`[Webhook] ${parsed.phone}: "${parsed.text}"`);

    const user = await findOrCreateUser(parsed.phone, parsed.name);
    const interpreted = await interpretMessage(parsed.text);

    console.log("[Webhook] Interpretação:", JSON.stringify(interpreted));

    let responseText: string;

    switch (interpreted.intent) {
      case "create_expense": {
        if (!interpreted.amount || interpreted.amount <= 0) {
          responseText = formatUnknown();
          break;
        }

        await createTransaction({
          userId: user.id,
          type: "EXPENSE",
          amount: interpreted.amount,
          description: interpreted.description,
          category: interpreted.category || "outros",
          paymentMethod: interpreted.paymentMethod || "unknown",
          date: interpreted.date ? new Date(interpreted.date) : nowSP(),
          rawMessage: parsed.text,
        });

        const totals = await getMonthTotals(user.id);
        responseText = formatExpenseConfirmation(
          interpreted.amount,
          interpreted.category || "outros",
          interpreted.description,
          interpreted.paymentMethod || "unknown",
          totals.expenses,
          totals.income
        );
        break;
      }

      case "create_income": {
        if (!interpreted.amount || interpreted.amount <= 0) {
          responseText = formatUnknown();
          break;
        }

        await createTransaction({
          userId: user.id,
          type: "INCOME",
          amount: interpreted.amount,
          description: interpreted.description,
          category: interpreted.category || "renda",
          paymentMethod: interpreted.paymentMethod || "unknown",
          date: interpreted.date ? new Date(interpreted.date) : nowSP(),
          rawMessage: parsed.text,
        });

        const totals = await getMonthTotals(user.id);
        responseText = formatIncomeConfirmation(
          interpreted.amount,
          interpreted.description,
          totals.expenses,
          totals.income
        );
        break;
      }

      case "get_today_summary": {
        const summary = await getTodaySummary(user.id);
        responseText = formatTodaySummary(
          summary.expenses,
          summary.income,
          summary.transactions
        );
        break;
      }

      case "get_month_summary": {
        const summary = await getMonthSummary(user.id);
        responseText = formatMonthSummary(
          summary.expenses,
          summary.income,
          summary.byCategory,
          summary.transactions
        );
        break;
      }

      case "get_help": {
        responseText = formatHelp();
        break;
      }

      default: {
        responseText = formatUnknown();
      }
    }

    await sendMessage(parsed.phone, responseText);

    res.status(200).json({
      status: "ok",
      intent: interpreted.intent,
      response: responseText,
    });
  } catch (error) {
    console.error("[Webhook] Erro:", error);
    res.status(200).json({ status: "error", message: "Erro interno processado" });
  }
}
