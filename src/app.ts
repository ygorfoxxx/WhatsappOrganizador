import express from "express";
import whatsappRoutes from "./routes/whatsapp.routes";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", project: "Finança Projeto Fox", phase: 1 });
});

app.use(whatsappRoutes);

export default app;
