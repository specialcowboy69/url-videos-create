import { createReadStream, existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";
import { applyFormatTokens, getVideoFormat } from "@/lib/videoFormats";
import {
  byteLength,
  trimLog,
  MAX_HTML_BYTES,
  maybeGenerateNarration,
  runHyperframesRender
} from "@/lib/hyperframesUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RenderRequest = {
  htmlCode?: unknown;
  format?: unknown;
  narrationText?: unknown;
};

// Se recomienda usar /api/render-jobs para producción (Render) para evitar errores 502 por timeout.
export async function POST(request: Request) {
  let payload: RenderRequest;

  try {
    payload = (await request.json()) as RenderRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof payload.htmlCode !== "string" || payload.htmlCode.trim().length === 0) {
    return Response.json({ error: "htmlCode is required." }, { status: 400 });
  }

  if (byteLength(payload.htmlCode) > MAX_HTML_BYTES) {
    return Response.json({ error: "htmlCode is too large. Maximum size is 1 MB." }, { status: 413 });
  }

  const format = getVideoFormat(payload.format);
  const projectDir = path.join(tmpdir(), `hyperframes-render-${randomUUID()}`);
  const outputName = `video-${format.id.replace(":", "x")}.mp4`;
  const outputPath = path.join(projectDir, outputName);
  let html = applyFormatTokens(payload.htmlCode, format);

  try {
    await mkdir(projectDir, { recursive: true });

    await maybeGenerateNarration(projectDir, payload.narrationText);
    const audioTag = existsSync(path.join(projectDir, "narration.wav"))
      ? '<audio id="voiceover" src="narration.wav" data-start="0" data-duration="14" data-track-index="0" data-volume="1"></audio>'
      : "";
    html = html.replaceAll("{{NARRATION_AUDIO}}", audioTag);

    await writeFile(path.join(projectDir, "index.html"), html, "utf8");
    await runHyperframesRender(projectDir, outputName);

    const stream = createReadStream(outputPath);
    stream.on("close", () => {
      void rm(projectDir, { recursive: true, force: true }).catch(() => {});
    });

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `inline; filename="${outputName}"`,
        "Cache-Control": "no-store",
        "X-Video-Format": format.id,
        "X-Video-Width": String(format.width),
        "X-Video-Height": String(format.height)
      }
    });
  } catch (error) {
    await rm(projectDir, { recursive: true, force: true }).catch(() => {});

    const message = error instanceof Error ? error.message : "Unknown render error.";
    return Response.json(
      {
        error: "Render failed.",
        details: trimLog(message)
      },
      { status: 500 }
    );
  }
}
