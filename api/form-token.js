import { issueFormToken } from "../lib/form-security.mjs";

function json(response, status, data) {
  response.status(status).setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  response.send(JSON.stringify(data));
}

export default function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return json(response, 405, { error: "Method not allowed." });
  }

  return json(response, 200, { token: issueFormToken() });
}
