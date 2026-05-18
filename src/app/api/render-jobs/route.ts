import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { renderQueue } from "@/lib/renderQueue";
import { byteLength, MAX_HTML_BYTES } from "@/lib/hyperframesUtils";
import { applyFormatTokens, getVideoFormat } from "@/lib/videoFormats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RenderRequest = {
  htmlCode?: unknown;
  format?: unknown;
  narrationText?: unknown;
};

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
  const html = applyFormatTokens(payload.htmlCode, format);

  try {
    await mkdir(projectDir, { recursive: true });

    // Encolar job
    const jobId = renderQueue.createJob(projectDir, outputName);
    
    // Iniciar sin await (fire and forget)
    renderQueue.startJob(jobId, html, payload.narrationText).catch(console.error);

    return Response.json({ jobId, status: "pending" }, { status: 202 });
  } catch (error) {
    return Response.json(
      { error: "Failed to create render job." },
      { status: 500 }
    );
  }
}
