export type VideoFormatId = "16:9" | "9:16" | "1:1";

export type VideoFormat = {
  id: VideoFormatId;
  label: string;
  width: number;
  height: number;
  description: string;
};

export const VIDEO_FORMATS: Record<VideoFormatId, VideoFormat> = {
  "16:9": {
    id: "16:9",
    label: "Horizontal",
    width: 1920,
    height: 1080,
    description: "YouTube, web y presentaciones"
  },
  "9:16": {
    id: "9:16",
    label: "Vertical",
    width: 1080,
    height: 1920,
    description: "TikTok, Reels y Shorts"
  },
  "1:1": {
    id: "1:1",
    label: "Cuadrado",
    width: 1080,
    height: 1080,
    description: "Feed social y anuncios"
  }
};

export function getVideoFormat(value: unknown): VideoFormat {
  if (value === "9:16" || value === "1:1" || value === "16:9") {
    return VIDEO_FORMATS[value];
  }

  return VIDEO_FORMATS["16:9"];
}

export function applyFormatTokens(html: string, format: VideoFormat): string {
  return html
    .replaceAll("{{WIDTH}}", String(format.width))
    .replaceAll("{{HEIGHT}}", String(format.height))
    .replaceAll("{{FORMAT}}", format.id)
    .replace(/\bdata-width="[^"]*"/g, `data-width="${format.width}"`)
    .replace(/\bdata-height="[^"]*"/g, `data-height="${format.height}"`);
}
