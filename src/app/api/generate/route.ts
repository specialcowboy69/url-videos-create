import { buildUrlVideoTemplate } from "@/lib/templates";
import { getVideoFormat } from "@/lib/videoFormats";

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

function readMeta(html: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return html.match(pattern)?.[1]?.trim() || "";
}

function readTitle(html: string) {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || "";
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
    const response = await fetch(parsed.toString(), {
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "User-Agent": "HyperframesRenderStudio/0.1 (+https://render.com)"
      }
    });

    if (!response.ok) {
      return Response.json({ error: `The URL returned HTTP ${response.status}.` }, { status: 502 });
    }

    const html = (await response.text()).slice(0, MAX_HTML_READ);
    const title = decodeEntities(readMeta(html, "og:title") || readTitle(html) || parsed.hostname);
    const description = decodeEntities(
      readMeta(html, "og:description") ||
      readMeta(html, "description") ||
      "Video generado automaticamente desde esta URL."
    );

    const template = buildUrlVideoTemplate({
      title,
      description,
      sourceUrl: parsed.toString(),
      domain: parsed.hostname.replace(/^www\./, ""),
      format
    });

    return Response.json({
      htmlCode: template.htmlCode,
      narrationText: template.narrationText,
      metadata: {
        title,
        description,
        domain: parsed.hostname,
        format
      }
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown URL fetch error.";
    return Response.json({ error: "Could not generate from URL.", details }, { status: 500 });
  }
}
