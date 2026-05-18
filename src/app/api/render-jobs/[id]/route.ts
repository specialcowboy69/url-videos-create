import { renderQueue } from "@/lib/renderQueue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const jobId = params.id;
  const job = renderQueue.getJob(jobId);

  // Trigger manual cleanup of old jobs when checking status
  renderQueue.cleanupOldJobs();

  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  const response: any = {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    error: job.error,
  };

  if (job.status === "done") {
    response.downloadUrl = `/api/render-jobs/${job.id}/download`;
  }

  return Response.json(response, { status: 200 });
}
