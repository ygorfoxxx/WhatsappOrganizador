import dotenv from "dotenv";
dotenv.config();

import app from "./app";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🦊 Finança Projeto Fox rodando na porta ${PORT}`);
  console.log(`📡 Webhook: POST http://localhost:${PORT}/webhook/whatsapp`);
  console.log(`❤️  Health: GET http://localhost:${PORT}/health`);
});
