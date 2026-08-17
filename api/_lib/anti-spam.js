// Orquestador de las capas anti-spam. Devuelve `{ ok: true }` si el envío
// parece humano, o `{ ok: false, reason }` si debe rechazarse
// SILENCIOSAMENTE (200 con cuerpo tipo éxito, sin señal al bot).

import { verifyFormToken } from "./form-token.js";
import {
  checkText,
  checkEmail,
  checkPhone,
  checkFreeText,
} from "./spam-validation.js";
import { rateLimit } from "./rate-limit.js";

export const HONEYPOT_FIELD = "company_website";
export const TOKEN_FIELD = "form_token";

export function runAntiSpamChecks({ body, fields, rateLimitKey }) {
  // Capa 1 — Honeypot.
  const hp = body[HONEYPOT_FIELD];
  if (hp != null && String(hp).trim() !== "") {
    return { ok: false, reason: "honeypot lleno" };
  }

  // Capa 2 — Token de tiempo firmado.
  const tokenResult = verifyFormToken(body[TOKEN_FIELD]);
  if (!tokenResult.valid) {
    return { ok: false, reason: `token: ${tokenResult.reason}` };
  }

  // Capa 3 — Validación de campos.
  if (fields.name && typeof body[fields.name] === "string") {
    const r = checkText("name", body[fields.name], { min: 2, max: 120 });
    if (r) return { ok: false, reason: r };
  }
  if (fields.email && typeof body[fields.email] === "string") {
    const r = checkEmail(body[fields.email]);
    if (r) return { ok: false, reason: r };
  }
  if (fields.phone && typeof body[fields.phone] === "string") {
    const r = checkPhone(body[fields.phone]);
    if (r) return { ok: false, reason: r };
  }
  if (fields.message && typeof body[fields.message] === "string") {
    const r = checkFreeText(body[fields.message]);
    if (r) return { ok: false, reason: r };
  }

  // Capa 5 — Rate limit (best-effort).
  const rl = rateLimit(rateLimitKey);
  if (!rl.allowed) {
    return { ok: false, reason: `rate limit (${rl.count} en ventana)` };
  }

  return { ok: true };
}

export function logAndFakeSuccess(reason, tag = "anti-spam") {
  console.warn(`[${tag}] Descartado: ${reason}`);
}
