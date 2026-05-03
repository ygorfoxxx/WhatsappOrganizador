import { Router } from "express";
import { handleWebhook } from "../controllers/whatsapp.controller";

const router = Router();

router.post("/webhook/whatsapp", handleWebhook);

export default router;
