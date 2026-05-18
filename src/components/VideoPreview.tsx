"use client";

type VideoPreviewProps = {
  videoUrl: string | null;
  downloadUrl?: string;
  fileName: string;
  isRendering: boolean;
  jobId?: string;
};

export function VideoPreview({ videoUrl, downloadUrl, fileName, isRendering, jobId }: VideoPreviewProps) {
  return (
    <section className="flex min-h-[520px] flex-col rounded border border-neutral-200 bg-white shadow-studio">
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Resultado</h2>
          <p className="text-sm text-neutral-500">Preview MP4 y descarga</p>
        </div>
        {videoUrl ? (
          <a
            className="bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700"
            href={downloadUrl || videoUrl}
            download={fileName}
          >
            Descargar MP4
          </a>
        ) : null}
      </div>

      <div className="flex flex-1 items-center justify-center bg-neutral-950 p-5">
        {isRendering ? (
          <div className="flex flex-col items-center gap-4 text-white">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/25 border-t-white" />
            <p className="text-sm font-medium text-white/80">Renderizando video...</p>
            {jobId && <p className="text-xs text-white/50">Job ID: {jobId.slice(0, 8)}...</p>}
          </div>
        ) : videoUrl ? (
          <video className="max-h-[70vh] w-full bg-black" src={videoUrl} controls />
        ) : (
          <div className="max-w-sm text-center text-white/70">
            <p className="text-lg font-semibold text-white">Aun no hay video</p>
            <p className="mt-2 text-sm">
              Genera una plantilla desde una URL o pega HTML HyperFrames y pulsa renderizar.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
