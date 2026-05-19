import type { VideoFormat } from "@/lib/videoFormats";

export type TemplateInput = {
  title: string;
  description: string;
  sourceUrl: string;
  domain: string;
  format: VideoFormat;
};

export type GeneratedVideoTemplate = {
  htmlCode: string;
  narrationText: string;
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

function getPills(text: string, count: number): string[] {
  const matches = text.match(/[^.!?]+[.!?]+/g) || [text];
  const sentences = Array.from(matches).map(s => s.trim()).filter(s => s.length > 15);
  
  if (sentences.length < count) {
    // Si no hay suficientes frases claras, simplemente troceamos el texto
    const chunkLength = Math.ceil(text.length / count);
    const chunks = [];
    for (let i = 0; i < count; i++) {
       chunks.push(text.slice(i * chunkLength, (i + 1) * chunkLength).trim());
    }
    return chunks.map(c => c + (c.endsWith(".") ? "" : "..."));
  }
  return sentences.slice(0, count);
}

export function buildUrlVideoTemplate(input: TemplateInput): GeneratedVideoTemplate {
  const isVertical = input.format.id === "9:16";
  const isSquare = input.format.id === "1:1";
  
  const pills = getPills(input.description || "Video generado desde URL.", 3);
  const pill1 = escapeHtml(shorten(pills[0] || "", 150));
  const pill2 = escapeHtml(shorten(pills[1] || "", 150));
  const pill3 = escapeHtml(shorten(pills[2] || "", 150));

  const title = escapeHtml(shorten(input.title || input.domain, isVertical ? 76 : 110));
  const description = escapeHtml(shorten(input.description || "Resumen visual generado desde la URL.", isVertical ? 120 : 180));
  const domain = escapeHtml(input.domain);
  const sourceUrl = escapeHtml(input.sourceUrl);
  
  const titleSize = isVertical ? 68 : isSquare ? 72 : 92;
  const bodySize = isVertical ? 30 : 34;
  const scenePad = isVertical ? "72px 64px 150px" : "92px 120px 132px";
  const cardGrid = isVertical ? "1fr" : "1.1fr .9fr";
  
  // Narration es ahora 100% fiel a lo que mostramos y extraemos de la noticia real
  const narrationText = [
    `Analizando: ${title}.`,
    pills[0] || "",
    pills[1] || "",
    pills[2] || "",
    `Fuente original: ${domain}.`
  ].join(" ");

  const htmlCode = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
</head>
<body style="margin:0;background:#F7F4EE;overflow:hidden;">
  <div
    data-composition-id="url-video"
    data-start="0"
    data-duration="14"
    data-width="${input.format.width}"
    data-height="${input.format.height}"
    style="position:relative;width:100%;height:100%;background:#F7F4EE;color:#171717;font-family:Arial,sans-serif;overflow:hidden;isolation:isolate;"
  >
    {{NARRATION_AUDIO}}
    <div class="grid"></div>
    <div class="ticker"><span>${domain} / VIDEO DESDE URL / GUION / SUBTITULOS / MP4 / ${domain} / VIDEO DESDE URL / </span></div>

    <section id="scene-1" class="scene hero">
      <div class="stamp">URL</div>
      <p class="kicker">Video generado desde ${domain}</p>
      <h1>${title}</h1>
      <p class="subtitle">${description}</p>
      <div class="caption">Analizando: ${shorten(title, 80)}</div>
    </section>

    <section id="scene-2" class="scene split">
      <div class="copy">
        <p class="kicker">Contexto</p>
        <h2>Datos Clave</h2>
        <p class="body">${pill1}</p>
      </div>
      <div class="visual-card">
        <div class="scan"></div>
        <strong>EXTRACTO</strong>
        <span style="font-size: 26px; font-weight: normal; line-height: 1.4; margin-top: 10px;">"${pill1}"</span>
      </div>
      <div class="caption">${shorten(pill1, 80)}</div>
    </section>

    <section id="scene-3" class="scene data">
      <p class="kicker">Análisis</p>
      <div class="metric-row" style="grid-template-columns: 1fr;">
        <div style="background:#0B3D91; color:white; display:flex; align-items:center; min-height: ${isVertical ? "300px" : "200px"};">
          <span style="font-size:${isVertical ? "40px" : "50px"}; font-family:Georgia,serif; font-weight:normal; line-height:1.3;">"${pill2}"</span>
        </div>
      </div>
      <div class="caption">${shorten(pill2, 80)}</div>
    </section>

    <section id="scene-4" class="scene cards-scene">
      <p class="kicker">Más Detalles</p>
      <h2>Información Extraída</h2>
      <div class="card-stack" style="grid-template-columns: 1fr;">
        <article style="font-size:${isVertical ? "38px" : "46px"}; font-weight:normal; line-height:1.4; display:block; padding: 50px;">
          "${pill3}"
        </article>
      </div>
      <div class="caption">${shorten(pill3, 80)}</div>
    </section>

    <section id="scene-5" class="scene close">
      <p class="kicker">Fuente</p>
      <h2>${domain}</h2>
      <p class="source">${sourceUrl}</p>
      <div class="caption">Lee el artículo completo en la web original.</div>
    </section>

    <style>
      .grid{position:absolute;inset:0;background-image:linear-gradient(#D8D1C5 1px,transparent 1px),linear-gradient(90deg,#D8D1C5 1px,transparent 1px);background-size:96px 96px;opacity:.45;z-index:0}
      .ticker{position:absolute;left:0;right:0;bottom:0;height:${isVertical ? "70px" : "58px"};background:#101820;color:white;display:flex;align-items:center;overflow:hidden;font-family:Consolas,monospace;font-size:${isVertical ? "22px" : "24px"};z-index:10}
      .ticker span{display:inline-block;white-space:nowrap;padding-left:100%;animation:crawl 16s linear infinite}
      @keyframes crawl{to{transform:translateX(-100%)}}
      .scene{position:absolute;inset:0;padding:${scenePad};display:flex;flex-direction:column;justify-content:center;gap:28px;opacity:0;visibility:hidden;z-index:2}
      .kicker{margin:0;color:#C7352B;font-size:${isVertical ? "24px" : "30px"};font-weight:900;text-transform:uppercase}
      h1,h2,p{margin:0} h1{font-family:Georgia,serif;font-size:${titleSize}px;line-height:.96;letter-spacing:0;max-width:${isVertical ? "92%" : "76%"}} h2{font-family:Georgia,serif;font-size:${isVertical ? "58px" : "82px"};line-height:1;letter-spacing:0;max-width:1050px}
      .subtitle,.body{font-size:${bodySize}px;line-height:1.16;font-weight:800;max-width:${isVertical ? "880px" : "1120px"};color:#343434}
      .caption{position:absolute;left:${isVertical ? "48px" : "120px"};right:${isVertical ? "48px" : "120px"};bottom:${isVertical ? "94px" : "82px"};background:rgba(16,24,32,.92);color:white;padding:${isVertical ? "22px 28px" : "20px 30px"};font-size:${isVertical ? "28px" : "32px"};line-height:1.15;font-weight:900;z-index:8}
      .stamp{position:absolute;right:${isVertical ? "50px" : "130px"};top:${isVertical ? "70px" : "80px"};width:${isVertical ? 150 : 210}px;height:${isVertical ? 150 : 210}px;border:8px solid #0B3D91;border-radius:999px;display:flex;align-items:center;justify-content:center;color:#0B3D91;font-family:Georgia,serif;font-size:${isVertical ? 42 : 58}px;font-weight:900;transform:rotate(-8deg);opacity:.72}
      .split{display:grid;grid-template-columns:${cardGrid};align-items:center}.copy{display:flex;flex-direction:column;gap:26px}.visual-card{min-height:${isVertical ? "430px" : "520px"};background:#fff;border:1px solid #D8D1C5;box-shadow:0 24px 70px rgba(16,24,32,.16);padding:44px;display:flex;flex-direction:column;gap:24px;justify-content:center;position:relative;overflow:hidden}.visual-card strong{font-size:58px;color:#0B3D91}.visual-card span{font-size:34px;font-weight:900;border-bottom:3px solid #D8D1C5;padding-bottom:14px}.scan{position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(11,61,145,.18),transparent);width:45%}
      .metric-row{display:grid;gap:24px}.metric-row div{background:#fff;border:1px solid #D8D1C5;padding:42px}.metric-row strong{display:block;font-family:Georgia,serif;font-size:${isVertical ? "70px" : "96px"};line-height:1;color:#0B3D91}.metric-row span{font-size:${isVertical ? "26px" : "32px"};font-weight:900}
      .cards-scene .card-stack{display:grid;gap:24px}.card-stack article{background:#0B3D91;color:white;padding:42px;font-size:${isVertical ? "34px" : "42px"};font-weight:900;min-height:${isVertical ? "150px" : "230px"};display:flex;align-items:center; justify-content:center; text-align:center;}
      .close{background:#101820;color:white}.close .grid{opacity:.1}.close h2{color:white}.source{max-width:100%;font-family:Consolas,monospace;font-size:${isVertical ? "22px" : "28px"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#d9e1e8}
    </style>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      const beats = [
        ["#scene-1", 0, 3],
        ["#scene-2", 3, 5.8],
        ["#scene-3", 5.8, 8.7],
        ["#scene-4", 8.7, 11.4],
        ["#scene-5", 11.4, 14]
      ];
      tl.set(".scene", { autoAlpha: 0 }, 0);
      beats.forEach(([id, start, end]) => {
        tl.set(id, { autoAlpha: 1 }, start);
        tl.fromTo(id + " .kicker", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .35 }, start + .1);
        tl.fromTo(id + " h1," + id + " h2", { opacity: 0, y: 42 }, { opacity: 1, y: 0, duration: .55, ease: "power3.out" }, start + .2);
        tl.fromTo(id + " .caption", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .35 }, start + .45);
        tl.to(id, { autoAlpha: 0, y: -28, duration: .35, ease: "power2.in" }, end - .35);
      });
      tl.fromTo("#scene-1 .subtitle", { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: .55 }, .7);
      tl.fromTo("#scene-1 .stamp", { opacity: 0, scale: .75, rotation: -18 }, { opacity: .72, scale: 1, rotation: -8, duration: .65, ease: "back.out(1.4)" }, .25);
      tl.fromTo(".visual-card", { opacity: 0, x: 80 }, { opacity: 1, x: 0, duration: .65, ease: "power3.out" }, 3.35);
      tl.to(".scan", { x: "190%", duration: 2.2, ease: "none" }, 3.6);
      tl.fromTo(".metric-row div", { opacity: 0, y: 50 }, { opacity: 1, y: 0, stagger: .12, duration: .45 }, 6.05);
      tl.fromTo(".card-stack article", { opacity: 0, y: 70, rotation: 2 }, { opacity: 1, y: 0, rotation: 0, stagger: .14, duration: .5 }, 9.1);
      tl.to(".grid", { backgroundPosition: "180px 120px", duration: 14, ease: "none" }, 0);
      window.__timelines["url-video"] = tl;
    </script>
  </div>
</body>
</html>`;

  return { htmlCode, narrationText };
}
