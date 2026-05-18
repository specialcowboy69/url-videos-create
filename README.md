# HyperFrames Render Studio

Aplicacion web Next.js para convertir una URL en una plantilla HyperFrames editable y renderizarla como MP4.

## Flujo

1. Pega una URL publica.
2. Elige formato: `16:9`, `9:16` o `1:1`.
3. Genera una plantilla editable.
4. Ajusta el HTML o la narracion si quieres.
5. Pulsa **Renderizar video**.
6. La app genera `narration.wav`, subtitulos en pantalla y el MP4 final.
7. Previsualiza y descarga el MP4.

## Desarrollo local

```bash
npm install
npm run dev
```

La app queda disponible en `http://localhost:3000`.

Para renderizar MP4 en local necesitas FFmpeg disponible en el `PATH`.
En Windows puedes instalarlo con:

```powershell
winget install Gyan.FFmpeg
```

Despues cierra y abre la terminal, y comprueba:

```powershell
ffmpeg -version
```

## Docker

```bash
docker build -t hyperframes-render-studio .
docker run --rm -p 3000:3000 hyperframes-render-studio
```

## Render.com

1. Sube esta carpeta a GitHub.
2. Crea un nuevo **Web Service** en Render.
3. Elige **Docker** como entorno.
4. Render construira el `Dockerfile` e iniciara la app con `npm run start`.

El contenedor incluye Node 22, Chromium, chrome-headless-shell, FFmpeg, espeak-ng y fuentes basicas.

## Endpoints

- `POST /api/generate`
  - Body: `{ "url": "https://...", "format": "16:9" }`
  - Devuelve: `{ htmlCode, metadata }`

- `POST /api/render`
  - Body: `{ "htmlCode": "...", "format": "9:16", "narrationText": "..." }`
  - Devuelve: `video/mp4`

## Seguridad del MVP

El backend aplica limite de tamano al HTML, timeout de render, directorios temporales unicos y bloqueo basico de hosts privados en el modo URL. Si expones esto publicamente, el siguiente paso razonable es anadir autenticacion, cuotas por usuario y una cola de trabajos.

## Troubleshooting

- **`FFmpeg not found`**: instala FFmpeg localmente o ejecuta la app con Docker. El Dockerfile ya incluye FFmpeg.
- **Render timeout**: el backend usa 10 minutos de timeout, 24fps, calidad draft y 1 worker por defecto. Si aun expira, acorta el HTML o sube el plan de Render.
- **PowerShell bloquea `npm`**: usa `npm.cmd install` y `npm.cmd run dev`.
- **Render tarda mucho**: baja la duracion del HTML o usa una cola de trabajos para renders largos.
