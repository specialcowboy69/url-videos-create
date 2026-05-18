import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { renderQueue } from "@/lib/renderQueue";
import { stat } from "node:fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const jobId = params.id;
  const job = renderQueue.getJob(jobId);

  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "done") {
    return Response.json({ error: "Job is not done yet" }, { status: 400 });
  }

  const resultPath = renderQueue.getJobResult(jobId);
  if (!resultPath) {
    return Response.json({ error: "Job result file path missing" }, { status: 500 });
  }

  try {
    const fileStat = await stat(resultPath);
    const stream = createReadStream(resultPath);

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `inline; filename="${job.outputName}"`,
        "Content-Length": fileStat.size.toString(),
        "Cache-Control": "no-store",
      }
    });
  } catch (error) {
    return Response.json({ error: "Could not read result file" }, { status: 500 });
  }
}
