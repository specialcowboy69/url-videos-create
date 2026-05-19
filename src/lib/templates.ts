import type { VideoFormat } from "@/lib/videoFormats";

export type AIScene = {
  kicker: string;
  title: string;
  caption: string;
};

export type AIData = {
  tickerText: string;
  scenes: AIScene[];
  narrationText: string;
};

export type TemplateInput = {
  domain: string;
  sourceUrl: string;
  format: VideoFormat;
  aiData: AIData;
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

export function buildUrlVideoTemplate(input: TemplateInput): GeneratedVideoTemplate {
  const isVertical = input.format.id === "9:16";
  const isSquare = input.format.id === "1:1";
  
  const domain = escapeHtml(input.domain);
  const sourceUrl = escapeHtml(input.sourceUrl);
  
  const titleSize = isVertical ? 68 : isSquare ? 72 : 92;
  const bodySize = isVertical ? 30 : 34;
  const scenePad = isVertical ? "72px 64px 150px" : "92px 120px 132px";
  
  const tickerText = escapeHtml(input.aiData.tickerText || "VIDEO GENERADO AUTOMATICAMENTE");
  const scenes = input.aiData.scenes || [];
  
  // Duraciones
  const SCENE_DURATION = 4; // segundos por escena generada
  const INTRO_DURATION = 3;
  const OUTRO_DURATION = 3.5;
  const totalDuration = INTRO_DURATION + (scenes.length * SCENE_DURATION) + OUTRO_DURATION;

  // Generamos el HTML dinámico de las escenas
  const scenesHtml = scenes.map((scene, index) => {
    const isDark = index % 2 === 1; // Alternar colores
    const bgColor = isDark ? "#0B3D91" : "#fff";
    const textColor = isDark ? "#fff" : "#0B3D91";
    
    return `
    <section id="scene-ai-${index}" class="scene dynamic-scene">
      <p class="kicker">${escapeHtml(scene.kicker)}</p>
      <div class="visual-card" style="background:${bgColor}; color:${textColor}; padding:44px; border:1px solid #D8D1C5; min-height:${isVertical ? '350px' : '450px'}; display:flex; align-items:center; justify-content:center;">
        <h2 style="color:${textColor}; text-align:center; font-size:${isVertical ? '50px' : '72px'}; max-width: 90%; line-height: 1.2;">
          "${escapeHtml(scene.title)}"
        </h2>
      </div>
      <div class="caption">${escapeHtml(shorten(scene.caption, 120))}</div>
    </section>
    `;
  }).join("\n");

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
    data-duration="${totalDuration}"
    data-width="${input.format.width}"
    data-height="${input.format.height}"
    style="position:relative;width:100%;height:100%;background:#F7F4EE;color:#171717;font-family:Arial,sans-serif;overflow:hidden;isolation:isolate;"
  >
    {{NARRATION_AUDIO}}
    <div class="grid"></div>
    <div class="ticker"><span>${tickerText} / ${tickerText} / ${tickerText} / ${tickerText} / </span></div>

    <section id="scene-intro" class="scene hero">
      <div class="stamp">IA</div>
      <p class="kicker">Análisis Inteligente de ${domain}</p>
      <h1>Video Generado por Gemini AI</h1>
      <p class="subtitle">Extrayendo datos de la URL original...</p>
      <div class="caption">Escaneando: ${domain}</div>
    </section>

    ${scenesHtml}

    <section id="scene-outro" class="scene close">
      <p class="kicker">Fuente Original</p>
      <h2>${domain}</h2>
      <p class="source">${sourceUrl}</p>
      <div class="caption">Lee el artículo completo en la web.</div>
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
      .close{background:#101820;color:white}.close .grid{opacity:.1}.close h2{color:white}.source{max-width:100%;font-family:Consolas,monospace;font-size:${isVertical ? "22px" : "28px"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#d9e1e8}
    </style>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      
      const numScenes = ${scenes.length};
      const SCENE_DUR = ${SCENE_DURATION};
      const INTRO_DUR = ${INTRO_DURATION};
      const OUTRO_DUR = ${OUTRO_DURATION};
      
      const beats = [];
      // Intro
      beats.push(["#scene-intro", 0, INTRO_DUR]);
      
      // Dynamic Scenes
      let currentStart = INTRO_DUR;
      for(let i = 0; i < numScenes; i++) {
         beats.push(["#scene-ai-" + i, currentStart, currentStart + SCENE_DUR]);
         currentStart += SCENE_DUR;
      }
      
      // Outro
      beats.push(["#scene-outro", currentStart, currentStart + OUTRO_DUR]);

      tl.set(".scene", { autoAlpha: 0 }, 0);
      
      beats.forEach(([id, start, end]) => {
        tl.set(id, { autoAlpha: 1 }, start);
        tl.fromTo(id + " .kicker", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .35 }, start + .1);
        tl.fromTo(id + " h1," + id + " h2", { opacity: 0, y: 42 }, { opacity: 1, y: 0, duration: .55, ease: "power3.out" }, start + .2);
        tl.fromTo(id + " .caption", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .35 }, start + .45);
        tl.to(id, { autoAlpha: 0, y: -28, duration: .35, ease: "power2.in" }, end - .35);
      });
      
      tl.fromTo("#scene-intro .subtitle", { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: .55 }, .7);
      tl.fromTo("#scene-intro .stamp", { opacity: 0, scale: .75, rotation: -18 }, { opacity: .72, scale: 1, rotation: -8, duration: .65, ease: "back.out(1.4)" }, .25);
      tl.to(".grid", { backgroundPosition: "180px 120px", duration: ${totalDuration}, ease: "none" }, 0);
      
      window.__timelines["url-video"] = tl;
    </script>
  </div>
</body>
</html>`;

  return { htmlCode, narrationText: input.aiData.narrationText || "" };
}
