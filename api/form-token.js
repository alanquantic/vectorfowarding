import { issueFormToken } from "./_lib/form-token.js";

export default function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return response.status(204).end();
  }
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  // Evita que CDN/browser reciclen el mismo timestamp entre usuarios.
  response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("Content-Type", "application/json");

  return response.status(200).send(JSON.stringify({ token: issueFormToken() }));
}
