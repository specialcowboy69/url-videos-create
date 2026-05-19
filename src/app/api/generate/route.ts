import { buildUrlVideoTemplate } from "@/lib/templates";
import { getVideoFormat } from "@/lib/videoFormats";
import { validateApiKey } from "@/lib/auth";
import { generateRateLimit } from "@/lib/rateLimit";
import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_HTML_READ = 750_000;
const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

type GenerateRequest = {
  url?: unknown;
  format?: unknown;
};

function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  return false;
}

function decodeEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

export async function POST(request: Request) {
  const auth = validateApiKey(request);
  if (!auth.valid) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const rateLimit = generateRateLimit(ip);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Too many requests. Please try again later.", retryAfterMs: rateLimit.retryAfterMs }, { status: 429 });
  }

  let payload: GenerateRequest;

  try {
    payload = (await request.json()) as GenerateRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof payload.url !== "string" || payload.url.trim().length === 0) {
    return Response.json({ error: "url is required." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(payload.url);
  } catch {
    return Response.json({ error: "Invalid URL." }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsed.protocol) || isPrivateHostname(parsed.hostname)) {
    return Response.json({ error: "Only public http/https URLs are allowed." }, { status: 400 });
  }

  const format = getVideoFormat(payload.format);

  try {
    // Usamos headers más parecidos a los de un navegador real para evitar bloqueos
    const response = await fetch(parsed.toString(), {
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
      }
    });

    if (!response.ok) {
      return Response.json({ error: `The URL returned HTTP ${response.status}.` }, { status: 502 });
    }

    const html = (await response.text()).slice(0, MAX_HTML_READ);
    
    // Parseo de metadatos básicos con Cheerio (Mucho más robusto que Regex)
    const $ = cheerio.load(html);
    const rawTitle = $('meta[property="og:title"]').attr('content') || $('title').text() || parsed.hostname;
    const title = decodeEntities(rawTitle.replace(/\s+/g, " ").trim());

    const rawDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || "";
    const description = decodeEntities(rawDesc.replace(/\s+/g, " ").trim());

    // Extraer el contenido principal del artículo con JSDOM + Readability
    let articleText = "";
    try {
      const doc = new JSDOM(html, { url: parsed.toString() });
      const reader = new Readability(doc.window.document);
      const article = reader.parse();
      if (article && article.textContent) {
        articleText = article.textContent.replace(/\s+/g, " ").trim();
      }
    } catch (e) {
      console.warn("Readability failed to parse:", e);
    }

    // Mejoramos la descripción enviando el artículo extraído si existe
    const finalDescription = articleText.length > 50 ? articleText : (description || "Video generado automáticamente desde esta URL.");

    const template = buildUrlVideoTemplate({
      title,
      description: finalDescription,
      sourceUrl: parsed.toString(),
      domain: parsed.hostname.replace(/^www\./, ""),
      format
    });

    return Response.json({
      htmlCode: template.htmlCode,
      narrationText: template.narrationText,
      metadata: {
        title,
        description: finalDescription.substring(0, 300) + "...", // Devolvemos un snippet
        domain: parsed.hostname,
        format
      }
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown URL fetch error.";
    return Response.json({ error: "Could not generate from URL.", details }, { status: 500 });
  }
}
