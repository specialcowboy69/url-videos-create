export function validateApiKey(request: Request): { valid: boolean; error?: string } {
  const apiKey = process.env.API_KEY;

  // Sin API_KEY configurada = sin autenticación (dev local)
  if (!apiKey) return { valid: true };

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return { valid: false, error: "Missing Authorization header." };
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { valid: false, error: "Invalid Authorization format. Use: Bearer <key>" };
  }

  if (match[1] !== apiKey) {
    return { valid: false, error: "Invalid API key." };
  }

  return { valid: true };
}
