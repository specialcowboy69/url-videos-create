"use client";

import { useEffect, useMemo, useState } from "react";
import { VideoPreview } from "@/components/VideoPreview";
import { DEFAULT_HTML } from "@/lib/templates";
import { VIDEO_FORMATS, type VideoFormatId } from "@/lib/videoFormats";

type GenerateResponse = {
  htmlCode?: string;
  narrationText?: string;
  metadata?: {
    title: string;
    description: string;
    domain: string;
  };
  error?: string;
  details?: string;
};

const formats = Object.values(VIDEO_FORMATS);

export default function HomePage() {
  const [mode, setMode] = useState<"url" | "editor">("url");
  const [sourceUrl, setSourceUrl] = useState("");
  const [format, setFormat] = useState<VideoFormatId>("16:9");
  const [htmlCode, setHtmlCode] = useState(DEFAULT_HTML);
  const [narrationText, setNarrationText] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  const activeFormat = VIDEO_FORMATS[format];
  const outputName = useMemo(() => `hyperframes-${format.replace(":", "x")}.mp4`, [format]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  function clearVideo() {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
  }

  async function generateFromUrl() {
    setError("");
    setStatus("");
    clearVideo();

    if (!sourceUrl.trim()) {
      setError("Pega una URL publica para generar la plantilla.");
      return;
    }

    setIsGenerating(true);
    setStatus("Leyendo la URL y preparando la plantilla...");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sourceUrl, format })
      });

      const data = (await response.json()) as GenerateResponse;

      if (!response.ok || !data.htmlCode) {
        throw new Error(data.details || data.error || "No se pudo generar la plantilla.");
      }

      setHtmlCode(data.htmlCode);
      setNarrationText(data.narrationText || "");
      setMode("editor");
      setStatus(`Plantilla lista desde ${data.metadata?.domain || "la URL"}. Puedes editarla antes de renderizar.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Error generando desde URL.");
      setStatus("");
    } finally {
      setIsGenerating(false);
    }
  }

  async function renderVideo() {
    setError("");
    setStatus("");
    clearVideo();

    if (!htmlCode.trim()) {
      setError("El HTML no puede estar vacio.");
      return;
    }

    setIsRendering(true);
    setStatus("Render en curso. Esto puede tardar uno o dos minutos en Render.com.");

    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlCode, format, narrationText })
      });

      const contentType = response.headers.get("content-type") || "";

      if (!response.ok) {
        if (contentType.includes("application/json")) {
          const data = (await response.json()) as { error?: string; details?: string };
          throw new Error(data.details || data.error || "Render fallido.");
        }
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setStatus("Render completado. Ya puedes previsualizar o descargar el MP4.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Error renderizando video.");
      setStatus("");
    } finally {
      setIsRendering(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-6 text-ink md:px-8">
      <header className="mx-auto mb-6 flex max-w-7xl flex-col gap-5 border-b border-neutral-300 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-danger">HyperFrames</p>
          <h1 className="mt-1 font-serif text-4xl font-bold tracking-normal md:text-5xl">
            Render Studio
          </h1>
          <p className="mt-2 max-w-2xl text-base font-medium text-neutral-600">
            Convierte una URL en una plantilla editable o pega tu HTML HyperFrames y genera un MP4.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {formats.map((item) => (
            <button
              key={item.id}
              className={`border px-4 py-3 text-left transition ${
                format === item.id
                  ? "border-signal bg-signal text-white"
                  : "border-neutral-300 bg-white text-ink hover:border-signal"
              }`}
              type="button"
              onClick={() => setFormat(item.id)}
            >
              <span className="block text-sm font-black">{item.id}</span>
              <span className="block text-xs opacity-80">{item.label}</span>
            </button>
          ))}
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1.03fr)_minmax(420px,.97fr)]">
        <div className="flex flex-col gap-4">
          <section className="rounded border border-neutral-200 bg-white p-5 shadow-studio">
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                className={`px-4 py-2 text-sm font-bold ${mode === "url" ? "bg-ink text-white" : "bg-neutral-100 text-ink"}`}
                onClick={() => setMode("url")}
              >
                URL
              </button>
              <button
                type="button"
                className={`px-4 py-2 text-sm font-bold ${mode === "editor" ? "bg-ink text-white" : "bg-neutral-100 text-ink"}`}
                onClick={() => setMode("editor")}
              >
                Editor HTML
              </button>
            </div>

            {mode === "url" ? (
              <div className="grid gap-3">
                <label className="text-sm font-black uppercase text-neutral-500" htmlFor="url">
                  URL publica
                </label>
                <input
                  id="url"
                  className="w-full border border-neutral-300 bg-panel px-4 py-3 text-base outline-none transition focus:border-signal"
                  placeholder="https://www.ejemplo.com/noticia-o-producto"
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-neutral-600">
                    Formato actual: {activeFormat.width}x{activeFormat.height}. {activeFormat.description}.
                  </p>
                  <button
                    type="button"
                    className="bg-signal px-5 py-3 text-sm font-black text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-neutral-400"
                    onClick={generateFromUrl}
                    disabled={isGenerating || isRendering}
                  >
                    {isGenerating ? "Generando..." : "Generar plantilla"}
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="flex min-h-[620px] flex-col rounded border border-neutral-200 bg-white shadow-studio">
            <div className="flex flex-col gap-3 border-b border-neutral-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink">HTML HyperFrames</h2>
                <p className="text-sm text-neutral-500">
                  Puedes usar tokens <code>{"{{WIDTH}}"}</code> y <code>{"{{HEIGHT}}"}</code>. Si hay narracion, se genera como <code>narration.wav</code>.
                </p>
              </div>
              <button
                type="button"
                className="bg-danger px-5 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
                onClick={renderVideo}
                disabled={isRendering || isGenerating}
              >
                {isRendering ? "Renderizando..." : "Renderizar video"}
              </button>
            </div>
            <textarea
              className="min-h-[520px] flex-1 resize-y border-0 bg-neutral-950 p-5 font-mono text-sm leading-6 text-neutral-100 outline-none"
              value={htmlCode}
              onChange={(event) => setHtmlCode(event.target.value)}
              spellCheck={false}
            />
          </section>

          <section className="rounded border border-neutral-200 bg-white shadow-studio">
            <div className="border-b border-neutral-200 px-5 py-4">
              <h2 className="text-base font-semibold text-ink">Narracion y subtitulos</h2>
              <p className="text-sm text-neutral-500">
                Este texto se convierte en audio TTS y la plantilla generada ya incluye subtitulos visibles.
              </p>
            </div>
            <textarea
              className="min-h-36 w-full resize-y border-0 bg-panel p-5 text-sm leading-6 text-ink outline-none"
              value={narrationText}
              onChange={(event) => setNarrationText(event.target.value)}
              placeholder="Genera una plantilla desde URL para crear narracion automaticamente."
            />
          </section>

          {status ? (
            <div className="border border-success/30 bg-green-50 px-4 py-3 text-sm font-semibold text-success">
              {status}
            </div>
          ) : null}

          {error ? (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap border border-danger/30 bg-red-50 px-4 py-3 text-sm font-semibold text-danger">
              {error}
            </pre>
          ) : null}
        </div>

        <VideoPreview videoUrl={videoUrl} fileName={outputName} isRendering={isRendering} />
      </section>
    </main>
  );
}
