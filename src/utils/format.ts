import { formatBRL } from "./money";

interface Transaction {
  type: string;
  amount: number;
  description: string | null;
  category: string;
  date: Date;
}

export function formatExpenseConfirmation(
  amount: number,
  category: string,
  description: string | null,
  paymentMethod: string,
  monthExpenses: number,
  monthIncome: number
): string {
  const balance = monthIncome - monthExpenses;
  const methodLabel = paymentMethod === "unknown" ? "não informado" : paymentMethod;

  return `✅ Despesa registrada:
💰 Valor: ${formatBRL(amount)}
📁 Categoria: ${category}
📝 Descrição: ${description || "não informado"}
💳 Forma: ${methodLabel}

📊 Resumo do mês:
Gastos: ${formatBRL(monthExpenses)}
Rendas: ${formatBRL(monthIncome)}
Saldo: ${formatBRL(balance)}`;
}

export function formatIncomeConfirmation(
  amount: number,
  description: string | null,
  monthExpenses: number,
  monthIncome: number
): string {
  const balance = monthIncome - monthExpenses;

  return `✅ Renda registrada:
💰 Valor: ${formatBRL(amount)}
📝 Descrição: ${description || "não informado"}

📊 Resumo do mês:
Rendas: ${formatBRL(monthIncome)}
Gastos: ${formatBRL(monthExpenses)}
Saldo: ${formatBRL(balance)}`;
}

export function formatTodaySummary(
  expenses: number,
  income: number,
  transactions: Transaction[]
): string {
  const balance = income - expenses;
  let msg = `📊 Resumo de hoje:

💸 Gastos: ${formatBRL(expenses)}
💰 Rendas: ${formatBRL(income)}
📈 Saldo: ${formatBRL(balance)}`;

  if (transactions.length > 0) {
    msg += "\n\n📋 Últimas transações:";
    for (const t of transactions) {
      const emoji = t.type === "EXPENSE" ? "🔴" : "🟢";
      const sign = t.type === "EXPENSE" ? "-" : "+";
      msg += `\n${emoji} ${sign}${formatBRL(t.amount)} - ${t.description || t.category}`;
    }
  } else {
    msg += "\n\nNenhuma transação registrada hoje.";
  }

  return msg;
}

export function formatMonthSummary(
  expenses: number,
  income: number,
  byCategory: Record<string, number>,
  transactions: Transaction[]
): string {
  const balance = income - expenses;
  let msg = `📊 Resumo do mês:

💸 Total de gastos: ${formatBRL(expenses)}
💰 Total de rendas: ${formatBRL(income)}
📈 Saldo: ${formatBRL(balance)}`;

  const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  if (categories.length > 0) {
    msg += "\n\n📁 Gastos por categoria:";
    for (const [cat, val] of categories) {
      msg += `\n  • ${cat}: ${formatBRL(val)}`;
    }
  }

  if (transactions.length > 0) {
    msg += "\n\n📋 Últimas transações:";
    for (const t of transactions) {
      const emoji = t.type === "EXPENSE" ? "🔴" : "🟢";
      const sign = t.type === "EXPENSE" ? "-" : "+";
      const day = t.date.getDate().toString().padStart(2, "0");
      msg += `\n${emoji} ${day}/ ${sign}${formatBRL(t.amount)} - ${t.description || t.category}`;
    }
  }

  return msg;
}

export function formatHelp(): string {
  return `📊 *Assistente Financeiro - Finança Projeto Fox*

Você pode me mandar mensagens assim:

💸 *Gastos:*
• gastei 35 no mercado
• paguei 12,50 no ônibus
• comprei uma camiseta de 120 no crédito

💰 *Rendas:*
• recebi 2890 de salário
• entrou 200 de bico

📈 *Consultas:*
• resumo
• quanto gastei hoje?
• quanto gastei esse mês?
• saldo do mês

❓ *Ajuda:*
• /ajuda

Por enquanto estou na Fase 1, então ainda não controlo cartão, parcelas e metas avançadas.`;
}

export function formatUnknown(): string {
  return `Não consegui entender certinho 😅

Tenta mandar assim:
• "gastei 35 no mercado"
• "recebi 2890 de salário"
• "resumo do mês"

Ou mande /ajuda para ver tudo que posso fazer.`;
}
