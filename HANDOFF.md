# Handoff - HyperFrames Render Studio

## Objetivo Cumplido

Crear y desplegar una app web capaz de generar vídeos MP4 de alta calidad a partir de plantillas HTML y URLs, con un sistema robusto preparado para producción en una VPS de Hostinger.

## Estado Actual y Arquitectura

La aplicación está desplegada en una VPS de Hostinger usando Docker Compose y Nginx como Proxy Inverso. Se ha refactorizado la arquitectura para garantizar resiliencia frente a renders pesados (evitando los antiguos errores 502 de Render.com) y caídas por falta de memoria (OOM).

### 1. Sistema de Colas Asíncrono (Job Queue)
El renderizado ya no bloquea la petición HTTP principal.
- `POST /api/render-jobs`: Recibe el HTML y encola el trabajo (Job). Devuelve un `jobId` al instante.
- `GET /api/render-jobs/:id`: El frontend (cliente) hace "polling" cada 3 segundos para consultar si el trabajo está `pending`, `rendering` o `done`.
- `GET /api/render-jobs/:id/download`: Sirve el archivo `.mp4` final de forma segura mediante un Blob URL.

### 2. Persistencia en Disco
Para evitar perder trabajos si el contenedor Docker se reinicia inesperadamente, el estado de la cola se persiste en archivos JSON dentro de `/tmp/hyperframes-jobs/`. Al arrancar, el servidor Node.js recupera automáticamente los trabajos que quedaron pendientes.

### 3. Anti-OOM (Gestión de Memoria)
Hostinger nos proporciona 8GB de RAM. Para evitar que Chromium consuma toda la memoria del sistema operativo generando bloqueos en cascada:
- Se implementó `chrome-wrapper.sh` que limita la memoria v8 de Chromium a 2GB (`--max-old-space-size=2048`).
- Se definió un archivo `swapfile` de 2GB en la VPS.
- En `docker-compose.yml`, se limitó el uso de memoria RAM del contenedor a 6GB y se amplió el `shm_size` a 2GB para evitar cuelgues del navegador headless.
- Se configuró `PORT="0"` en la ejecución del subproceso `hyperframes` para evitar colisiones de puertos internos con Next.js.

### 4. Seguridad (API Key & Rate Limiting)
- Se ha protegido toda la API de generación y renderizado mediante el uso de un header `Authorization: Bearer <API_KEY>`.
- La clave `API_KEY` se define en el archivo `.env` del servidor.
- El frontend ahora incluye un campo seguro para introducir esta clave antes de interactuar.
- Se ha añadido un Middleware de Rate Limiting por IP para prevenir abusos.

### 5. Proxy Nginx
Nginx escucha en el puerto 80 (HTTP) público y reenvía el tráfico internamente al puerto `10000` de Docker, protegiendo así el servicio Node.js.

## Cómo Probar y Actualizar en la VPS

Para desplegar cualquier cambio nuevo de código en la VPS:

1. Subir cambios desde local a GitHub:
   ```powershell
   git add -A
   git commit -m "Descripción del cambio"
   git push origin main
   ```
2. Entrar por SSH a la VPS y actualizar el contenedor:
   ```bash
   cd /root/hyperframes-render-studio
   git pull origin main
   docker compose down
   docker compose up -d --build
   ```

## Siguientes Pasos (Next Steps)

### Prioridad Alta
1. **Prueba End-to-End en Producción:** Generar un vídeo completo en la VPS, comprobando que el archivo final `.mp4` se descarga correctamente, se escucha la narración TTS y la calidad visual es fluida.
2. **Asignación de Dominio y HTTPS:** Comprar/vincular un dominio web apuntando a la IP de la VPS. Una vez apuntado, utilizar Certbot (`sudo certbot --nginx -d tudominio.com`) para securizar todo el tráfico con HTTPS automáticamente y evitar avisos de navegador inseguro.

### Prioridad Media
1. **Maping Permanente de Volúmenes:** Actualmente `/tmp/hyperframes-jobs/` está dentro del contenedor y sobrevive reinicios *del servicio*, pero si se destruye el contenedor (`docker compose down -v`), se pierde el historial. Configurar un volumen persistente de Docker en `docker-compose.yml` para los jobs y los outputs `.mp4`.
2. **Limpieza Automática (Cron):** Los archivos MP4 generados se quedan en disco ocupando espacio. Implementar un "Garbage Collector" en `renderQueue.ts` que borre vídeos y trabajos (jobs) que tengan más de 24 horas de antigüedad.

### Prioridad Baja
1. Integración de plantillas avanzadas con voces TTS premium (Kokoro / ElevenLabs) si la máquina lo soporta.
2. Ajustar calidades de codificación de FFmpeg desde la UI (Resolución, FPS, CRF).
