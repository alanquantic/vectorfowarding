import { runAntiSpamChecks, logAndFakeSuccess } from "./_lib/anti-spam.js";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM =
  process.env.RESEND_FROM || "no-reply@vectorforwarding.com.mx";
const RESEND_TO = process.env.RESEND_TO || "alan@ceosnm.com";

function json(response, status, data) {
  response.status(status).setHeader("Content-Type", "application/json");
  response.send(JSON.stringify(data));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char] || char;
  });
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "Method not allowed." });
  }

  if (!RESEND_API_KEY) {
    return json(response, 500, { error: "Missing RESEND_API_KEY." });
  }

  const body = request.body || {};
  const { name = "", email = "", phone = "", message = "" } = body;

  // ── Anti-spam (rechazo silencioso: 200 con cuerpo tipo éxito) ──
  const antiSpam = runAntiSpamChecks({
    body,
    fields: { name: "name", email: "email", phone: "phone", message: "message" },
    rateLimitKey: typeof email === "string" ? email.trim().toLowerCase() : undefined,
  });
  if (!antiSpam.ok) {
    logAndFakeSuccess(antiSpam.reason, "CONTACT");
    return json(response, 200, { ok: true, id: null });
  }

  const safeName = String(name).trim();
  const safeEmail = String(email).trim();
  const safePhone = String(phone).trim();
  const safeMessage = String(message).trim();

  if (!safeName || !safeEmail || !safeMessage) {
    return json(response, 400, { error: "Missing required fields." });
  }

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [RESEND_TO],
        reply_to: safeEmail,
        subject: `Manufacturing project inquiry - ${safeName}`,
        html: `
          <h1>New Vector inquiry</h1>
          <p><strong>Name:</strong> ${escapeHtml(safeName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(safeEmail)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(safePhone || "Not provided")}</p>
          <p><strong>Message:</strong></p>
          <p>${escapeHtml(safeMessage).replace(/\n/g, "<br>")}</p>
        `,
        text: [
          "New Vector inquiry",
          `Name: ${safeName}`,
          `Email: ${safeEmail}`,
          `Phone: ${safePhone || "Not provided"}`,
          "",
          "Message:",
          safeMessage,
        ].join("\n"),
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      const resendError =
        resendData?.message ||
        resendData?.error ||
        "Resend could not process the message.";

      return json(response, 502, { error: resendError });
    }

    return json(response, 200, { ok: true, id: resendData.id || null });
  } catch (error) {
    return json(response, 500, {
      error:
        error instanceof Error
          ? error.message
          : "Unexpected error sending the message.",
    });
  }
}
