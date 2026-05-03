import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseBRL } from "../utils/money";

export type Intent =
  | "create_expense"
  | "create_income"
  | "get_today_summary"
  | "get_month_summary"
  | "get_help"
  | "unknown";

export type PaymentMethod =
  | "cash"
  | "debit"
  | "credit"
  | "pix"
  | "bank_transfer"
  | "unknown";

export interface InterpretedMessage {
  intent: Intent;
  amount: number | null;
  description: string | null;
  category: string | null;
  paymentMethod: PaymentMethod | null;
  date: string | null;
  confidence: number;
}

const VALID_CATEGORIES = [
  "alimentação", "mercado", "transporte", "moradia", "saúde",
  "lazer", "roupa", "academia", "educação", "trabalho",
  "moto", "cartão", "renda", "outros",
];

const SYSTEM_PROMPT = `Você é um assistente financeiro que interpreta mensagens de WhatsApp sobre finanças pessoais.

Analise a mensagem e retorne APENAS um JSON válido (sem markdown, sem texto extra) com:
{
  "intent": "create_expense" | "create_income" | "get_today_summary" | "get_month_summary" | "get_help" | "unknown",
  "amount": number ou null,
  "description": string curta ou null,
  "category": uma das categorias válidas ou null,
  "paymentMethod": "cash" | "debit" | "credit" | "pix" | "bank_transfer" | "unknown" | null,
  "date": "YYYY-MM-DD" ou null,
  "confidence": número de 0 a 1
}

Regras:
- "gastei", "paguei", "comprei", "foi", "deu", "lança", "registra" → create_expense
- "recebi", "entrou", "ganhei", "salário", "bico", "pix recebido" → create_income
- "quanto gastei hoje" → get_today_summary
- "quanto gastei esse mês", "resumo", "saldo do mês" → get_month_summary
- "/ajuda", "ajuda", "como usar" → get_help
- Valores em Real brasileiro: "12,50", "1.200,00", "120 reais", "R$ 89,90"
- "no crédito" → paymentMethod: "credit", "no débito" → "debit", "no pix" → "pix"

Categorias válidas: alimentação, mercado, transporte, moradia, saúde, lazer, roupa, academia, educação, trabalho, moto, cartão, renda, outros.

Se não tiver certeza da categoria, use "outros".
Se não encontrar valor em despesa/renda, intent deve ser "unknown".`;

export async function interpretMessage(text: string): Promise<InterpretedMessage> {
  try {
    return await interpretWithAI(text);
  } catch (error) {
    console.error("[AI] Falha na IA, usando fallback:", error);
    return interpretWithFallback(text);
  }
}

async function interpretWithAI(text: string): Promise<InterpretedMessage> {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();

  if (provider === "openai") {
    return interpretWithOpenAI(text);
  }
  return interpretWithGemini(text);
}

async function interpretWithGemini(text: string): Promise<InterpretedMessage> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "sua-chave-gemini-aqui") {
    throw new Error("GEMINI_API_KEY não configurada");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent(
    `${SYSTEM_PROMPT}\n\nMensagem do usuário: "${text}"`
  );

  const content = result.response.text().trim();
  // Remove blocos markdown se o Gemini retornar ```json ... ```
  const clean = content.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

  const parsed = JSON.parse(clean) as InterpretedMessage;

  if (parsed.category && !VALID_CATEGORIES.includes(parsed.category)) {
    parsed.category = "outros";
  }

  return parsed;
}

async function interpretWithOpenAI(text: string): Promise<InterpretedMessage> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "sk-sua-chave-aqui") {
    throw new Error("OPENAI_API_KEY não configurada");
  }

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("Resposta vazia da IA");

  const parsed = JSON.parse(content) as InterpretedMessage;

  if (parsed.category && !VALID_CATEGORIES.includes(parsed.category)) {
    parsed.category = "outros";
  }

  return parsed;
}

export function interpretWithFallback(text: string): InterpretedMessage {
  const lower = text.toLowerCase().trim();

  if (/^\/?ajuda$|^como usar$/i.test(lower)) {
    return fallbackResult("get_help");
  }

  if (/quanto\s+gast(ei|ou)\s+hoje|resumo\s+(de\s+)?hoje/i.test(lower)) {
    return fallbackResult("get_today_summary");
  }

  if (
    /quanto\s+gast(ei|ou)\s+(esse|este|no)\s+m.s/i.test(lower) ||
    /quanto\s+receb(i|eu)\s+(esse|este|no)\s+m.s/i.test(lower) ||
    /^resumo/i.test(lower) ||
    /saldo\s+(do\s+)?m.s/i.test(lower)
  ) {
    return fallbackResult("get_month_summary");
  }

  // Renda
  const incomePattern = /^(recebi|entrou|ganhei|sal[aá]rio|bico|pix\s+recebido)/i;
  if (incomePattern.test(lower)) {
    const amount = parseBRL(text);
    if (amount) {
      const desc = extractDescription(lower, ["recebi", "entrou", "ganhei"]);
      return {
        intent: "create_income",
        amount,
        description: desc || "renda",
        category: "renda",
        paymentMethod: detectPaymentMethod(lower),
        date: null,
        confidence: 0.7,
      };
    }
  }

  // Despesa
  const expensePattern = /^(gastei|paguei|comprei|foi|deu|lan[cç]a|registra)/i;
  if (expensePattern.test(lower)) {
    const amount = parseBRL(text);
    if (amount) {
      const category = detectCategory(lower);
      const desc = extractDescription(lower, ["gastei", "paguei", "comprei", "foi", "deu"]);
      return {
        intent: "create_expense",
        amount,
        description: desc || category,
        category,
        paymentMethod: detectPaymentMethod(lower),
        date: null,
        confidence: 0.7,
      };
    }
  }

  // Tenta encontrar valor com contexto de gasto/renda em qualquer posição
  const amount = parseBRL(text);
  if (amount) {
    if (/receb|entr|ganh|sal[aá]rio|bico/i.test(lower)) {
      return {
        intent: "create_income",
        amount,
        description: "renda",
        category: "renda",
        paymentMethod: null,
        date: null,
        confidence: 0.5,
      };
    }
    if (/gast|pag|compr/i.test(lower)) {
      return {
        intent: "create_expense",
        amount,
        description: detectCategory(lower),
        category: detectCategory(lower),
        paymentMethod: detectPaymentMethod(lower),
        date: null,
        confidence: 0.5,
      };
    }
  }

  return fallbackResult("unknown");
}

function fallbackResult(intent: Intent): InterpretedMessage {
  return {
    intent,
    amount: null,
    description: null,
    category: null,
    paymentMethod: null,
    date: null,
    confidence: 0.8,
  };
}

function detectCategory(text: string): string {
  const map: Record<string, string[]> = {
    mercado: ["mercado", "supermercado", "feira"],
    alimentação: ["comida", "almoço", "jantar", "lanche", "restaurante", "ifood", "pizza", "hamburguer", "café"],
    transporte: ["ônibus", "uber", "99", "gasolina", "combustível", "estacionamento", "pedágio"],
    moradia: ["aluguel", "condomínio", "luz", "água", "energia", "gás", "internet"],
    saúde: ["farmácia", "remédio", "médico", "dentista", "hospital", "plano de saúde"],
    lazer: ["cinema", "bar", "festa", "show", "netflix", "spotify", "jogo"],
    roupa: ["camiseta", "calça", "sapato", "tênis", "roupa", "blusa", "vestido"],
    academia: ["academia", "treino"],
    educação: ["curso", "livro", "escola", "faculdade", "mensalidade"],
    moto: ["moto", "mecânico", "peça", "capacete", "pneu"],
    cartão: ["fatura", "cartão"],
  };

  for (const [category, keywords] of Object.entries(map)) {
    if (keywords.some((kw) => text.includes(kw))) {
      return category;
    }
  }
  return "outros";
}

function detectPaymentMethod(text: string): PaymentMethod {
  if (/cr[eé]dito|no\s+cr[eé]dito/i.test(text)) return "credit";
  if (/d[eé]bito|no\s+d[eé]bito/i.test(text)) return "debit";
  if (/pix/i.test(text)) return "pix";
  if (/dinheiro|cash/i.test(text)) return "cash";
  if (/transfer[eê]ncia/i.test(text)) return "bank_transfer";
  return "unknown";
}

function extractDescription(text: string, removeWords: string[]): string | null {
  let cleaned = text;
  for (const w of removeWords) {
    cleaned = cleaned.replace(new RegExp(w, "gi"), "");
  }
  cleaned = cleaned
    .replace(/r\$\s*[\d.,]+/gi, "")
    .replace(/\d+[.,]?\d*\s*reais?/gi, "")
    .replace(/\d+[.,]\d+/g, "")
    .replace(/\d+/g, "")
    .replace(/\s*(no|na|de|do|da|em|com|um|uma|uns|umas)\s+/gi, " ")
    .replace(/\s*(no\s+)?(cr[eé]dito|d[eé]bito|pix|dinheiro)/gi, "")
    .trim();

  return cleaned.length > 1 ? cleaned : null;
}
