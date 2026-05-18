import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_HTML_BYTES = 1_000_000;
export const MAX_NARRATION_BYTES = 8_000;
export const RENDER_TIMEOUT_MS = 900_000;
export const TTS_TIMEOUT_MS = 90_000;
export const MAX_LOG_BYTES = 12_000;

export function byteLength(value: string) {
  return Buffer.byteLength(value, "utf8");
}

export function trimLog(value: string) {
  if (value.length <= MAX_LOG_BYTES) return value;
  return `${value.slice(0, MAX_LOG_BYTES)}\n... logs truncated ...`;
}

function hyperframesCommand(args: string[]) {
  // Usar nice -n 10 para reducir la prioridad de la CPU del proceso hijo y evitar congelar Node
  return {
    command: "nice",
    args: ["-n", "10", process.execPath, path.join(process.cwd(), "node_modules", "hyperframes", "dist", "cli.js"), ...args]
  };
}

export function runHyperframes(projectDir: string, args: string[], timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    const command = hyperframesCommand(args);
    const browserPath = process.env.HYPERFRAMES_BROWSER_PATH || process.env.CHROME_BIN || process.env.CHROMIUM_PATH || "/usr/bin/chromium";
    console.log(`[HyperFrames] Spawning: ${command.command} ${command.args.join(" ")}`);
    console.log(`[HyperFrames] Using browser: ${browserPath}`);
    
    const child = spawn(
      command.command,
      command.args,
      {
        cwd: projectDir,
        env: {
          ...process.env,
          HYPERFRAMES_BROWSER_PATH: browserPath,
          CHROME_BIN: browserPath,
          CHROMIUM_PATH: browserPath,
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
      reject(new Error(`HyperFrames timeout after ${timeoutMs / 1000}s\n${trimLog(stderr || stdout)}`));
    }, timeoutMs);

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

export function runHyperframesRender(projectDir: string, outputName: string) {
  return runHyperframes(
    projectDir,
    ["render", ".", "--output", outputName, "--fps", "24", "--quality", "draft", "--workers", "1"],
    RENDER_TIMEOUT_MS
  );
}

export async function maybeGenerateNarration(projectDir: string, narrationText: unknown) {
  if (typeof narrationText !== "string" || narrationText.trim().length === 0) return;

  if (byteLength(narrationText) > MAX_NARRATION_BYTES) {
    throw new Error("narrationText is too large. Maximum size is 8 KB.");
  }

  await writeFile(path.join(projectDir, "narration.txt"), narrationText.trim(), "utf8");
  try {
    await runHyperframes(
      projectDir,
      ["tts", "narration.txt", "--voice", "ef_dora", "--output", "narration.wav"],
      TTS_TIMEOUT_MS
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown TTS error.";
    await writeFile(path.join(projectDir, "tts-warning.txt"), trimLog(message), "utf8");
  }
}
