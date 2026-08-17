// Reglas de detección pasiva. Cada función devuelve `null` si pasa, o un
// motivo string si rechaza.
//
// Mitigación de falsos positivos:
// - VOWEL: solo aplica si longitud ≥ 4 → deja pasar Ng, Vy, Wu, Ly.
// - CONSONANT_RUN: umbral 5+ → deja pasar Schwartz, Krzysztof.
// - Mayúsculas anómalas: umbral 40% + longitud > 6 → deja pasar iPhone, MacBook.

const VOWEL_RE = /[aeiouáéíóúü]/i;
const CONSONANT_RUN_RE = /[bcdfghjklmnpqrstvwxyzñ]{5,}/i;
const URL_OR_HTML_RE = /https?:\/\/|\[url=|<a\s+href|<[a-z][^>]*>/i;

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "guerrillamail.com",
  "guerrillamail.info",
  "guerrillamail.biz",
  "10minutemail.com",
  "10minutemail.net",
  "yopmail.com",
  "throwawaymail.com",
  "trashmail.com",
  "getnada.com",
  "maildrop.cc",
  "sharklasers.com",
  "fakeinbox.com",
  "dispostable.com",
  "mintemail.com",
  "emailondeck.com",
  "spam4.me",
  "moakt.com",
  "mohmal.com",
  "harakirimail.com",
  "mytemp.email",
  "temp-mail.io",
]);

export function checkText(field, raw, opts) {
  const v = (raw ?? "").trim();
  const min = opts?.min ?? 2;
  const max = opts?.max ?? 100;
  if (v.length < min) return `${field}: muy corto (${v.length} < ${min})`;
  if (v.length > max) return `${field}: muy largo (${v.length} > ${max})`;
  if (v.length >= 4 && !VOWEL_RE.test(v)) return `${field}: sin vocales`;
  if (CONSONANT_RUN_RE.test(v)) return `${field}: 5+ consonantes seguidas`;
  if (hasAnomalousUppercase(v)) return `${field}: mayúsculas anómalas`;
  if (URL_OR_HTML_RE.test(v)) return `${field}: contiene URL/HTML`;
  return null;
}

export function hasAnomalousUppercase(value) {
  if (value.length <= 6) return false;
  const letters = [...value].filter((c) => /\p{L}/u.test(c));
  if (letters.length === 0) return false;
  const hasLower = letters.some(
    (c) => c === c.toLowerCase() && c !== c.toUpperCase()
  );
  if (!hasLower) return false;
  let interiorUpper = 0;
  for (const word of value.split(/\s+/).filter(Boolean)) {
    let seenFirst = false;
    for (const ch of word) {
      if (!/\p{L}/u.test(ch)) continue;
      const isUpper = ch === ch.toUpperCase() && ch !== ch.toLowerCase();
      if (!seenFirst) seenFirst = true;
      else if (isUpper) interiorUpper++;
    }
  }
  return interiorUpper / letters.length > 0.4;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function checkEmail(raw) {
  const v = (raw ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(v)) return "email: formato inválido";
  const domain = v.split("@")[1];
  if (!domain) return "email: sin dominio";
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return `email: desechable (${domain})`;
  return null;
}

export function checkPhone(raw) {
  const d = (raw ?? "").replace(/[\s\-().+]/g, "");
  if (d === "") return null; // teléfono es opcional en este formulario
  if (!/^\d{8,15}$/.test(d)) return "teléfono: longitud fuera de 8-15";
  if (/^(\d)\1+$/.test(d)) return "teléfono: dígitos idénticos";
  if (d === "1234567890" || d === "0987654321") return "teléfono: secuencia obvia";
  return null;
}

export function checkFreeText(raw, maxLen = 2000) {
  const s = (raw ?? "").trim();
  if (s.length > maxLen) return `mensaje: muy largo (${s.length} > ${maxLen})`;
  const urls = (s.match(/https?:\/\/|www\./gi) || []).length;
  const tags = (s.match(/<[^>]+>|\[[^\]]+\]/g) || []).length;
  if (urls + tags > 2) return "mensaje: demasiados enlaces/etiquetas";
  return null;
}
