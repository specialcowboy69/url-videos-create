import { buildUrlVideoTemplate } from "@/lib/templates";
import { getVideoFormat } from "@/lib/videoFormats";
import { validateApiKey } from "@/lib/auth";
import { generateRateLimit } from "@/lib/rateLimit";
import * as cheerio from "cheerio";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

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

  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "GEMINI_API_KEY is missing." }, { status: 500 });
  }

  const format = getVideoFormat(payload.format);

  try {
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
    
    // Limpieza radical de Cheerio
    const $ = cheerio.load(html);
    const rawTitle = $('meta[property="og:title"]').attr('content') || $('title').text() || parsed.hostname;
    const title = decodeEntities(rawTitle.replace(/\s+/g, " ").trim());

    // Eliminar nodos basura explícitamente
    $('script, style, nav, footer, iframe, noscript').remove();
    
    const bodyText = $('body').text().replace(/\s+/g, " ").trim();
    // Recorte a máximo seguro de 8,000 caracteres
    const cleanContent = bodyText.slice(0, 8000);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Usamos gemini-2.0-flash como solicitaste (familia del 2)
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            tickerText: { type: SchemaType.STRING, description: "Cadena de texto en mayúsculas corta para el banner inferior animado" },
            scenes: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  kicker: { type: SchemaType.STRING, description: "Categoría o concepto corto (max 20 caracteres)" },
                  title: { type: SchemaType.STRING, description: "Titular impactante o frase principal para la escena" },
                  caption: { type: SchemaType.STRING, description: "Subtítulo o descripción breve quemada en pantalla (max 120 caracteres)" }
                },
                required: ["kicker", "title", "caption"]
              }
            },
            narrationText: { type: SchemaType.STRING, description: "Texto completo y fluido unificado que se enviará al sistema TTS para la locución del vídeo" }
          },
          required: ["tickerText", "scenes", "narrationText"]
        }
      }
    });
    
    let geminiData;
    try {
      const prompt = `Actúa como un copywriter experto y director editorial para un vídeo de formato corto. Analiza el siguiente texto de una web y genera un guion impactante creando entre 3 y 4 escenas dinámicas.\n\nTEXTO:\n${cleanContent}`;
      
      const result = await model.generateContent(prompt);
      const textOutput = result.response.text();
      
      geminiData = JSON.parse(textOutput || "{}");
    } catch (error) {
      console.error("Gemini Failure Trailing:", error);
      return Response.json({ error: "Failed to generate content with Gemini." }, { status: 500 });
    }

    if (!geminiData.scenes || geminiData.scenes.length === 0) {
      throw new Error("Gemini returned no scenes.");
    }

    const template = buildUrlVideoTemplate({
      domain: parsed.hostname.replace(/^www\./, ""),
      sourceUrl: parsed.toString(),
      format,
      aiData: geminiData
    });

    return Response.json({
      htmlCode: template.htmlCode,
      narrationText: geminiData.narrationText,
      metadata: {
        title,
        domain: parsed.hostname,
        format
      }
    });
  } catch (error) {
    console.error("Gemini Failure Trailing (General Error):", error);
    const details = error instanceof Error ? error.message : "Unknown URL fetch error.";
    return Response.json({ error: "Could not generate from URL.", details }, { status: 500 });
  }
}
