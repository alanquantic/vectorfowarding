import {
  validateContactPayload,
  verifyFormToken,
} from "../lib/form-security.mjs";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM =
  process.env.RESEND_FROM || "no-reply@vectorforwarding.com.mx";
const RESEND_TO = process.env.RESEND_TO || "alan@ceosnm.com";
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1_000;
const rateLimitHits = new Map();

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

function success(response) {
  return json(response, 200, { ok: true });
}

function rejectSpam(response, reason, request, email = "") {
  const forwardedFor = request.headers?.["x-forwarded-for"];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : String(forwardedFor || request.socket?.remoteAddress || "unknown")
        .split(",")[0]
        .trim();
  const emailDomain = email.includes("@") ? email.split("@").pop() : "unknown";

  console.warn("[anti-spam] Contact submission discarded", {
    reason,
    ip,
    emailDomain,
  });
  return success(response);
}

function rateLimit(key) {
  if (!key) return { allowed: true };

  const now = Date.now();
  const recent = (rateLimitHits.get(key) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitHits.set(key, recent);
    return { allowed: false };
  }

  recent.push(now);
  rateLimitHits.set(key, recent);
  return { allowed: true };
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "Method not allowed." });
  }

  const {
    name = "",
    email = "",
    phone = "",
    message = "",
    company_website: companyWebsite = "",
    formToken = "",
  } = request.body || {};

  const safeName = String(name).trim();
  const safeEmail = String(email).trim();
  const safePhone = String(phone).trim();
  const safeMessage = String(message).trim();

  if (String(companyWebsite).trim()) {
    return rejectSpam(response, "honeypot", request, safeEmail);
  }

  const tokenCheck = verifyFormToken(formToken);
  if (!tokenCheck.valid) {
    return rejectSpam(response, tokenCheck.reason, request, safeEmail);
  }

  if (tokenCheck.warning) {
    console.warn(`[anti-spam] ${tokenCheck.warning}; timing checks disabled`);
  }

  if (!safeName || !safeEmail || !safeMessage) {
    return json(response, 400, { error: "Missing required fields." });
  }

  const validation = validateContactPayload({
    name: safeName,
    email: safeEmail,
    phone: safePhone,
    message: safeMessage,
  });
  if (!validation.valid) {
    return rejectSpam(response, validation.reason, request, safeEmail);
  }

  if (!rateLimit(safeEmail.toLowerCase()).allowed) {
    return rejectSpam(response, "email rate limit", request, safeEmail);
  }

  if (!RESEND_API_KEY) {
    return json(response, 500, { error: "Missing RESEND_API_KEY." });
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

    return success(response);
  } catch (error) {
    return json(response, 500, {
      error:
        error instanceof Error
          ? error.message
          : "Unexpected error sending the message.",
    });
  }
}
