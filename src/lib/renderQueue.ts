import { randomUUID } from "node:crypto";
import { rm, writeFile, readFile, readdir } from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
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

const PERSISTENCE_DIR = "/tmp/hyperframes-jobs";

class RenderQueue {
  private jobs: Map<string, RenderJob> = new Map();
  private activeJobs: number = 0;
  private readonly MAX_CONCURRENT_JOBS = 1;
  private queue: string[] = [];
  private initialized = false;

  constructor() {
    mkdirSync(PERSISTENCE_DIR, { recursive: true });
    // Iniciar limpieza periódica de trabajos (cada 5 minutos)
    setInterval(() => this.cleanupOldJobs(), 5 * 60 * 1000);
  }

  async initialize() {
    if (this.initialized) return;
    this.initialized = true;
    try {
      const files = await readdir(PERSISTENCE_DIR);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const content = await readFile(path.join(PERSISTENCE_DIR, file), "utf8");
          const job: RenderJob = JSON.parse(content);
          if (job.status === "rendering" || job.status === "pending") {
            job.status = "failed";
            job.error = "Server restarted while job was in progress.";
            job.completedAt = Date.now();
            await this.saveJob(job);
          }
          this.jobs.set(job.id, job);
        }
      }
    } catch (error) {
      console.error("Error initializing render queue:", error);
    }
  }

  private async saveJob(job: RenderJob) {
    try {
      await writeFile(path.join(PERSISTENCE_DIR, `${job.id}.json`), JSON.stringify(job), "utf8");
    } catch (error) {
      console.error("Error saving job to disk:", error);
    }
  }

  async createJob(projectDir: string, outputName: string): Promise<string> {
    await this.initialize();
    const id = randomUUID();
    const job: RenderJob = {
      id,
      status: "pending",
      createdAt: Date.now(),
      outputName,
      projectDir,
    };
    this.jobs.set(id, job);
    await this.saveJob(job);
    return id;
  }

  async getJob(id: string): Promise<RenderJob | undefined> {
    await this.initialize();
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
    await this.saveJob(job);

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
      await this.saveJob(job);
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

  async getJobResult(id: string): Promise<string | undefined> {
    await this.initialize();
    const job = this.jobs.get(id);
    if (job?.status === "done") {
      return path.join(job.projectDir, job.outputName);
    }
    return undefined;
  }

  async cleanupOldJobs() {
    const now = Date.now();
    const THIRTY_MINUTES = 30 * 60 * 1000;
    for (const [id, job] of this.jobs.entries()) {
      if (job.completedAt && now - job.completedAt > THIRTY_MINUTES) {
        // Eliminar directorio temporal y JSON persistente
        rm(job.projectDir, { recursive: true, force: true }).catch(console.error);
        rm(path.join(PERSISTENCE_DIR, `${id}.json`), { force: true }).catch(console.error);
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
      // No borramos el job de memoria inmediatamente para que el estado quede como "failed/done"
    }
  }
}

// Singleton global
export const renderQueue = new RenderQueue();
