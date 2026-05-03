export interface ParsedMessage {
  phone: string | null;
  name: string | null;
  text: string | null;
  fromMe: boolean;
}

export function parseWebhookPayload(body: Record<string, unknown>): ParsedMessage {
  const result: ParsedMessage = { phone: null, name: null, text: null, fromMe: false };

  result.phone = extractPhone(body);
  result.name = extractName(body);
  result.text = extractText(body);
  result.fromMe = extractFromMe(body);

  return result;
}

function extractFromMe(body: Record<string, unknown>): boolean {
  const paths = [
    "data.key.fromMe",
    "key.fromMe",
    "fromMe",
  ];

  for (const path of paths) {
    const val = getNestedValue(body, path);
    if (val === true) return true;
  }
  return false;
}

function extractPhone(body: Record<string, unknown>): string | null {
  const paths = [
    "data.key.remoteJid",
    "data.key.participant",
    "key.remoteJid",
    "key.participant",
    "phone",
    "from",
    "sender",
  ];

  for (const path of paths) {
    const val = getNestedValue(body, path);
    if (typeof val === "string" && val.length > 0) {
      return cleanPhone(val);
    }
  }
  return null;
}

function extractName(body: Record<string, unknown>): string | null {
  const paths = [
    "data.pushName",
    "pushName",
    "name",
    "senderName",
    "data.senderName",
  ];

  for (const path of paths) {
    const val = getNestedValue(body, path);
    if (typeof val === "string" && val.length > 0) {
      return val;
    }
  }
  return null;
}

function extractText(body: Record<string, unknown>): string | null {
  const paths = [
    "data.message.conversation",
    "data.message.extendedTextMessage.text",
    "message.conversation",
    "message.extendedTextMessage.text",
    "body.message.conversation",
    "body.text",
    "text",
    "data.body",
    "body",
  ];

  for (const path of paths) {
    const val = getNestedValue(body, path);
    if (typeof val === "string" && val.trim().length > 0) {
      return val.trim();
    }
  }
  return null;
}

function cleanPhone(raw: string): string {
  return raw.replace(/@s\.whatsapp\.net$/, "").replace(/\D/g, "");
}

function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
