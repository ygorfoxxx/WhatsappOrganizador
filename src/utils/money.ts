export function parseBRL(text: string): number | null {
  // Remove "R$", "reais", "real" e espaços
  let cleaned = text
    .replace(/r\$\s*/gi, "")
    .replace(/\s*reais?\s*/gi, "")
    .replace(/\s*conto[s]?\s*/gi, "")
    .trim();

  // Formato brasileiro: 1.234,56
  const brMatch = cleaned.match(/(\d{1,3}(?:\.\d{3})*,\d{1,2})/);
  if (brMatch) {
    const val = brMatch[1].replace(/\./g, "").replace(",", ".");
    const num = parseFloat(val);
    return num > 0 ? num : null;
  }

  // Formato com vírgula simples: 12,50
  const commaMatch = cleaned.match(/(\d+,\d{1,2})/);
  if (commaMatch) {
    const val = commaMatch[1].replace(",", ".");
    const num = parseFloat(val);
    return num > 0 ? num : null;
  }

  // Número inteiro ou decimal com ponto
  const numMatch = cleaned.match(/(\d+(?:\.\d{1,2})?)/);
  if (numMatch) {
    const num = parseFloat(numMatch[1]);
    return num > 0 ? num : null;
  }

  return null;
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
