import { randomUUID } from "node:crypto";
import { rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { maybeGenerateNarration, runHyperframesRender, trimLog } from "./hyperframesUtils";

export type JobStatus = "pending" | "rendering" | "done" | "failed";

export interface RenderJob {
  id: string;
  status: JobStatus;
  createdAt: number;
  completedAt?: number;
  error?: string;
  outputName: string;
  projectDir: string;
}

class RenderQueue {
  private jobs: Map<string, RenderJob> = new Map();
  private activeJobs: number = 0;
  private readonly MAX_CONCURRENT_JOBS = 1;
  private queue: string[] = [];

  constructor() {
    // Iniciar limpieza periódica de trabajos (cada 5 minutos)
    setInterval(() => this.cleanupOldJobs(), 5 * 60 * 1000);
  }

  createJob(projectDir: string, outputName: string): string {
    const id = randomUUID();
    this.jobs.set(id, {
      id,
      status: "pending",
      createdAt: Date.now(),
      outputName,
      projectDir,
    });
    return id;
  }

  getJob(id: string): RenderJob | undefined {
    return this.jobs.get(id);
  }

  async startJob(id: string, html: string, narrationText: unknown): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) return;

    // Encolar si hay renders en curso
    if (this.activeJobs >= this.MAX_CONCURRENT_JOBS) {
      this.queue.push(id);
      // Guardar info para cuando le toque
      (job as any).pendingArgs = { html, narrationText };
      return;
    }

    this.activeJobs++;
    job.status = "rendering";

    try {
      await maybeGenerateNarration(job.projectDir, narrationText);
      
      const audioTag = existsSync(path.join(job.projectDir, "narration.wav"))
        ? '<audio id="voiceover" src="narration.wav" data-start="0" data-duration="14" data-track-index="0" data-volume="1"></audio>'
        : "";
      
      const finalHtml = html.replaceAll("{{NARRATION_AUDIO}}", audioTag);
      await writeFile(path.join(job.projectDir, "index.html"), finalHtml, "utf8");
      
      await runHyperframesRender(job.projectDir, job.outputName);
      
      job.status = "done";
      job.completedAt = Date.now();
    } catch (error) {
      job.status = "failed";
      job.completedAt = Date.now();
      job.error = error instanceof Error ? trimLog(error.message) : "Unknown render error.";
    } finally {
      this.activeJobs--;
      this.processNextJob();
    }
  }

  private processNextJob() {
    if (this.queue.length > 0 && this.activeJobs < this.MAX_CONCURRENT_JOBS) {
      const nextId = this.queue.shift()!;
      const job = this.jobs.get(nextId);
      if (job && (job as any).pendingArgs) {
        const { html, narrationText } = (job as any).pendingArgs;
        delete (job as any).pendingArgs;
        // Iniciar sin await para que se procese en background
        this.startJob(nextId, html, narrationText).catch(console.error);
      }
    }
  }

  getJobResult(id: string): string | undefined {
    const job = this.jobs.get(id);
    if (job?.status === "done") {
      return path.join(job.projectDir, job.outputName);
    }
    return undefined;
  }

  cleanupOldJobs() {
    const now = Date.now();
    const THIRTY_MINUTES = 30 * 60 * 1000;
    for (const [id, job] of this.jobs.entries()) {
      if (job.completedAt && now - job.completedAt > THIRTY_MINUTES) {
        // Eliminar directorio temporal
        rm(job.projectDir, { recursive: true, force: true }).catch(console.error);
        this.jobs.delete(id);
      }
    }
  }

  // Permite limpiar manualmente tras la descarga del MP4 si se desea, 
  // o dejarlo en manos del cleanup global.
  async removeJobFiles(id: string) {
    const job = this.jobs.get(id);
    if (job) {
      await rm(job.projectDir, { recursive: true, force: true }).catch(console.error);
      // No borramos el job de memoria inmediatamente para que el estado quede como "failed/done",
      // pero si ya descargó el MP4, podríamos hacerlo.
    }
  }
}

// Singleton global
export const renderQueue = new RenderQueue();
