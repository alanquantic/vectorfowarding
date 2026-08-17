import crypto from "node:crypto";

const FORM_SECRET = process.env.FORM_SECRET || "";
const MIN_TOKEN_AGE_MS = 3_000;
const MAX_TOKEN_AGE_MS = 2 * 60 * 60 * 1_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const URL_OR_HTML = /https?:\/\/|\[url=|<a\s+href|<[a-z][^>]*>/i;
const VOWEL = /[aeiouáéíóúü]/i;
const DISPOSABLE_EMAIL_PARTS = [
  "10minutemail",
  "guerrillamail",
  "mailinator.com",
  "tempmail",
  "throwaway",
  "yopmail",
];

function sign(value) {
  return crypto.createHmac("sha256", FORM_SECRET).update(value).digest("hex");
}

export function issueFormToken() {
  const timestamp = Date.now();
  return FORM_SECRET
    ? `${timestamp}.${sign(String(timestamp))}`
    : `${timestamp}.unsigned`;
}

export function verifyFormToken(token) {
  // Keep the form usable until FORM_SECRET is configured in Vercel.
  if (!FORM_SECRET) {
    return { valid: true, warning: "FORM_SECRET is not configured" };
  }

  if (typeof token !== "string" || !token.includes(".")) {
    return { valid: false, reason: "missing or malformed token" };
  }

  const [timestampString, signature] = token.split(".");
  const timestamp = Number(timestampString);
  if (!Number.isFinite(timestamp) || !signature) {
    return { valid: false, reason: "malformed token" };
  }

  const actual = Buffer.from(signature);
  const expected = Buffer.from(sign(timestampString));
  if (
    actual.length !== expected.length ||
    !crypto.timingSafeEqual(actual, expected)
  ) {
    return { valid: false, reason: "invalid token signature" };
  }

  const age = Date.now() - timestamp;
  if (age < MIN_TOKEN_AGE_MS) {
    return { valid: false, reason: `submitted too quickly (${age}ms)` };
  }
  if (age > MAX_TOKEN_AGE_MS) {
    return { valid: false, reason: "expired token" };
  }

  return { valid: true };
}

function hasAnomalousUppercase(value) {
  const letters = [...value].filter((character) => /\p{L}/u.test(character));
  if (!letters.length) return false;

  const hasLowercase = letters.some(
    (character) =>
      character === character.toLowerCase() &&
      character !== character.toUpperCase(),
  );
  if (!hasLowercase) return false;

  let interiorUppercase = 0;
  for (const word of value.split(/\s+/).filter(Boolean)) {
    let foundFirstLetter = false;
    for (const character of word) {
      if (!/\p{L}/u.test(character)) continue;

      const isUppercase =
        character === character.toUpperCase() &&
        character !== character.toLowerCase();
      if (!foundFirstLetter) {
        foundFirstLetter = true;
      } else if (isUppercase) {
        interiorUppercase += 1;
      }
    }
  }

  return interiorUppercase / letters.length > 0.3;
}

function validateName(value) {
  if (value.length < 2 || value.length > 100) return "name length";
  if (URL_OR_HTML.test(value)) return "URL or HTML in name";
  if (hasAnomalousUppercase(value)) return "anomalous capitalization in name";

  const letters = [...value].filter((character) => /\p{L}/u.test(character));
  if (letters.length > 3 && !VOWEL.test(value)) return "name without vowels";
  return null;
}

function validateEmail(value) {
  if (value.length > 254 || !EMAIL_RE.test(value)) return "invalid email";
  const domain = value.split("@").pop().toLowerCase();
  if (DISPOSABLE_EMAIL_PARTS.some((part) => domain.includes(part))) {
    return "disposable email";
  }
  return null;
}

function validatePhone(value) {
  if (!value) return null;
  const digits = value.replace(/[\s\-().+]/g, "");
  if (!/^\d{10,15}$/.test(digits)) return "invalid phone length";
  if (/^(\d)\1+$/.test(digits)) return "repeated phone digits";
  if (digits === "1234567890" || digits === "0987654321") {
    return "obvious phone sequence";
  }
  return null;
}

function validateMessage(value) {
  if (value.length < 5 || value.length > 2_000) return "message length";
  const urls = (value.match(/https?:\/\/|www\./gi) || []).length;
  const tags = (value.match(/<[^>]+>|\[[^\]]+\]/g) || []).length;
  if (urls + tags > 2) return "too many links or tags";
  return null;
}

export function validateContactPayload({ name, email, phone, message }) {
  const checks = [
    validateName(name),
    validateEmail(email),
    validatePhone(phone),
    validateMessage(message),
  ];
  const reason = checks.find(Boolean);
  return reason ? { valid: false, reason } : { valid: true };
}
