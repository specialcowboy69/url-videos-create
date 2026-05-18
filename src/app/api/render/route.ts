import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";
import { applyFormatTokens, getVideoFormat } from "@/lib/videoFormats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_HTML_BYTES = 1_000_000;
const RENDER_TIMEOUT_MS = 600_000;
const MAX_LOG_BYTES = 12_000;

type RenderRequest = {
  htmlCode?: unknown;
  format?: unknown;
};

function byteLength(value: string) {
  return Buffer.byteLength(value, "utf8");
}

function trimLog(value: string) {
  if (value.length <= MAX_LOG_BYTES) return value;
  return `${value.slice(0, MAX_LOG_BYTES)}\n... logs truncated ...`;
}

function hyperframesCommand(args: string[]) {
  return {
    command: process.execPath,
    args: [path.join(process.cwd(), "node_modules", "hyperframes", "dist", "cli.js"), ...args]
  };
}

function runHyperframesRender(projectDir: string, outputName: string) {
  return new Promise<void>((resolve, reject) => {
    const command = hyperframesCommand([
      "render",
      ".",
      "--output",
      outputName,
      "--fps",
      "24",
      "--quality",
      "draft",
      "--workers",
      "1"
    ]);
    const child = spawn(
      command.command,
      command.args,
      {
        cwd: projectDir,
        env: {
          ...process.env,
          HYPERFRAMES_BROWSER_PATH:
            process.env.HYPERFRAMES_BROWSER_PATH || process.env.CHROME_BIN || process.env.CHROMIUM_PATH || "/usr/bin/chromium",
          CHROME_BIN: process.env.CHROME_BIN || process.env.CHROMIUM_PATH || "/usr/bin/chromium",
          CHROMIUM_PATH: process.env.CHROMIUM_PATH || process.env.CHROME_BIN || "/usr/bin/chromium",
          FFMPEG_PATH: process.env.FFMPEG_PATH || "/usr/bin/ffmpeg"
        },
        shell: false,
        windowsHide: true
      }
    );

    let stdout = "";
    let stderr = "";
    let finished = false;

    const timeout = setTimeout(() => {
      if (finished) return;
      child.kill("SIGTERM");
      reject(new Error(`Render timeout after ${RENDER_TIMEOUT_MS / 1000}s\n${trimLog(stderr || stdout)}`));
    }, RENDER_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      stdout = trimLog(stdout);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
      stderr = trimLog(stderr);
    });

    child.on("error", (error) => {
      finished = true;
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      finished = true;
      clearTimeout(timeout);

      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`HyperFrames exited with code ${code}\n${trimLog(stderr || stdout)}`));
    });
  });
}

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
  const html = applyFormatTokens(payload.htmlCode, format);

  try {
    await mkdir(projectDir, { recursive: true });
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
