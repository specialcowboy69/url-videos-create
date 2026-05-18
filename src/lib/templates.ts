import type { VideoFormat } from "@/lib/videoFormats";

export type TemplateInput = {
  title: string;
  description: string;
  sourceUrl: string;
  domain: string;
  format: VideoFormat;
};

export const DEFAULT_HTML = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
</head>
<body style="margin:0;background:#101820;overflow:hidden;">
  <div
    data-composition-id="demo"
    data-start="0"
    data-duration="8"
    data-width="{{WIDTH}}"
    data-height="{{HEIGHT}}"
    style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#101820;color:white;font-family:Arial,sans-serif;overflow:hidden;"
  >
    <div class="panel" style="width:82%;padding:72px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);">
      <p class="label" style="margin:0 0 24px;color:#B38B21;font-size:34px;font-weight:800;text-transform:uppercase;">HyperFrames Render Studio</p>
      <h1 id="title" style="margin:0;font-size:110px;line-height:.95;letter-spacing:0;">Hola Render!</h1>
      <p id="subtitle" style="margin:32px 0 0;max-width:900px;font-size:38px;line-height:1.12;color:#e8ecf0;">Edita este HTML, elige formato y genera un MP4.</p>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(".panel", { opacity: 0, y: 70, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: "power3.out" }, 0);
      tl.fromTo("#title", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.75, ease: "power3.out" }, 0.35);
      tl.fromTo("#subtitle", { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.65, ease: "power2.out" }, 0.75);
      tl.to(".panel", { scale: 1.025, duration: 6.2, ease: "none" }, 0.9);
      tl.to(".panel", { opacity: 0, y: -40, duration: 0.5, ease: "power2.in" }, 7.35);
      window.__timelines.demo = tl;
    </script>
  </div>
</body>
</html>`;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function shorten(value: string, maxLength: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trim()}…`;
}

export function buildUrlVideoTemplate(input: TemplateInput) {
  const title = escapeHtml(shorten(input.title || input.domain, input.format.id === "9:16" ? 76 : 110));
  const description = escapeHtml(shorten(input.description || "Resumen visual generado desde la URL.", input.format.id === "9:16" ? 120 : 180));
  const domain = escapeHtml(input.domain);
  const sourceUrl = escapeHtml(input.sourceUrl);
  const isVertical = input.format.id === "9:16";
  const isSquare = input.format.id === "1:1";
  const titleSize = isVertical ? 78 : isSquare ? 82 : 96;
  const bodySize = isVertical ? 30 : 34;
  const panelWidth = isVertical ? "86%" : "78%";

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
</head>
<body style="margin:0;background:#F7F4EE;overflow:hidden;">
  <div
    data-composition-id="url-video"
    data-start="0"
    data-duration="18"
    data-width="${input.format.width}"
    data-height="${input.format.height}"
    style="position:relative;width:100%;height:100%;background:#F7F4EE;color:#171717;font-family:Arial,sans-serif;overflow:hidden;"
  >
    <div class="grid" style="position:absolute;inset:0;background-image:linear-gradient(#D8D1C5 1px,transparent 1px),linear-gradient(90deg,#D8D1C5 1px,transparent 1px);background-size:96px 96px;opacity:.45;"></div>
    <div class="stamp" style="position:absolute;right:7%;top:7%;width:${isVertical ? 160 : 210}px;height:${isVertical ? 160 : 210}px;border:8px solid #0B3D91;border-radius:999px;display:flex;align-items:center;justify-content:center;color:#0B3D91;font-family:Georgia,serif;font-size:${isVertical ? 44 : 58}px;font-weight:900;transform:rotate(-8deg);">URL</div>
    <main class="panel" style="position:absolute;left:8%;top:${isVertical ? "13%" : "17%"};width:${panelWidth};padding:${isVertical ? "52px" : "64px"};background:rgba(255,255,255,.82);border:1px solid #D8D1C5;box-shadow:0 28px 80px rgba(16,24,32,.16);">
      <p class="kicker" style="margin:0 0 24px;color:#C7352B;font-size:${isVertical ? 24 : 28}px;font-weight:900;text-transform:uppercase;">Video generado desde ${domain}</p>
      <h1 class="title" style="margin:0;font-family:Georgia,serif;font-size:${titleSize}px;line-height:.98;letter-spacing:0;">${title}</h1>
      <p class="desc" style="margin:34px 0 0;max-width:${isVertical ? 760 : 1160}px;font-size:${bodySize}px;line-height:1.15;font-weight:700;color:#343434;">${description}</p>
    </main>
    <section class="cards" style="position:absolute;left:8%;right:8%;bottom:${isVertical ? "12%" : "13%"};display:grid;grid-template-columns:${isVertical ? "1fr" : "repeat(3,1fr)"};gap:22px;">
      <div class="card" style="padding:28px;background:#101820;color:white;"><strong style="display:block;font-size:${isVertical ? 30 : 36}px;">1. Captura</strong><span style="display:block;margin-top:12px;font-size:24px;color:#d9e1e8;">Texto, titulo y contexto inicial.</span></div>
      <div class="card" style="padding:28px;background:#0B3D91;color:white;"><strong style="display:block;font-size:${isVertical ? 30 : 36}px;">2. Guion</strong><span style="display:block;margin-top:12px;font-size:24px;color:#e1e9ff;">Estructura visual por beats.</span></div>
      <div class="card" style="padding:28px;background:#B38B21;color:white;"><strong style="display:block;font-size:${isVertical ? 30 : 36}px;">3. Render</strong><span style="display:block;margin-top:12px;font-size:24px;color:#fff6d8;">MP4 listo para descargar.</span></div>
    </section>
    <footer class="source" style="position:absolute;left:8%;right:8%;bottom:4%;font-family:Consolas,monospace;font-size:${isVertical ? 18 : 22}px;color:#5e5b55;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Fuente: ${sourceUrl}</footer>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(".panel", { opacity: 0, y: 70 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, 0);
      tl.fromTo(".stamp", { opacity: 0, scale: 0.8, rotation: -18 }, { opacity: 1, scale: 1, rotation: -8, duration: 0.7, ease: "back.out(1.4)" }, 0.35);
      tl.fromTo(".title", { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, 0.55);
      tl.fromTo(".desc", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.65, ease: "power2.out" }, 1.05);
      tl.fromTo(".card", { opacity: 0, y: 50 }, { opacity: 1, y: 0, stagger: 0.16, duration: 0.65, ease: "power3.out" }, 2.4);
      tl.to(".grid", { backgroundPosition: "160px 96px", duration: 16, ease: "none" }, 0);
      tl.to(".stamp", { scale: 1.04, yoyo: true, repeat: 8, duration: 0.9, ease: "sine.inOut" }, 1.2);
      tl.to(".panel", { y: -18, duration: 10, ease: "none" }, 4);
      tl.to(".card", { y: -10, stagger: 0.12, duration: 4, ease: "sine.inOut" }, 5.4);
      tl.to([".panel", ".cards", ".stamp", ".source"], { opacity: 0, y: -35, duration: 0.65, ease: "power2.in" }, 17.2);
      window.__timelines["url-video"] = tl;
    </script>
  </div>
</body>
</html>`;
}
