interface SendMessageResponse {
  success: boolean;
  error?: string;
}

export async function sendMessage(phone: string, text: string): Promise<SendMessageResponse> {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const instance = process.env.EVOLUTION_INSTANCE;
  const apiKey = process.env.EVOLUTION_API_KEY;

  if (!baseUrl || !instance || !apiKey) {
    console.warn("[WhatsApp] Evolution API não configurada. Mensagem não enviada.");
    console.log(`[WhatsApp] Para: ${phone}`);
    console.log(`[WhatsApp] Texto:\n${text}`);
    return { success: false, error: "Evolution API não configurada" };
  }

  try {
    const url = `${baseUrl}/message/sendText/${instance}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({ number: phone, text }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[WhatsApp] Erro ${response.status}: ${body}`);
      return { success: false, error: `HTTP ${response.status}` };
    }

    console.log(`[WhatsApp] Mensagem enviada para ${phone}`);
    return { success: true };
  } catch (error) {
    console.error("[WhatsApp] Erro ao enviar mensagem:", error);
    return { success: false, error: String(error) };
  }
}
