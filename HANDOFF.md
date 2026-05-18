# Handoff - HyperFrames Render Studio

## Objetivo

Crear y desplegar una app web capaz de:

1. Recibir una URL publica.
2. Leer metadatos basicos de esa pagina.
3. Generar una plantilla HTML compatible con HyperFrames.
4. Permitir editar HTML y narracion.
5. Renderizar el resultado como un video MP4.
6. Ejecutarse en Render.com usando Docker.

## Estado Actual

La app esta en `hyperframes-render-studio`.

Es una app Next.js 14 con estos endpoints principales:

- `POST /api/generate`: recibe una URL y devuelve una plantilla HTML + narracion.
- `POST /api/render`: recibe HTML/narracion/formato y devuelve un MP4.
- `GET /api/health`: health check ligero para Render.

La build local funciona:

```powershell
npm.cmd run build
```

El proyecto incluye un `Dockerfile` con Node 22, Chromium, chrome-headless-shell, FFmpeg, espeak-ng y fuentes basicas para poder renderizar videos.

## Problema Detectado

Se recibio una pagina HTML de Render con:

- `502 Bad Gateway`
- `This service is currently unavailable`
- `Request ID: ...-SEA`

Eso no era un error generado por la app, sino por el proxy de Render. Significa que Render no pudo comunicarse correctamente con el servicio desplegado.

Las causas mas probables son:

1. El proceso de la app no estaba escuchando en el puerto esperado por Render.
2. El proceso arrancaba y luego se cerraba.
3. Render estaba apuntando a una carpeta incorrecta del repo.
4. El renderizado de video consumia demasiada memoria/CPU y Render mataba el proceso.
5. El render tardaba demasiado para una respuesta HTTP directa.

## Cambios Realizados

### 1. Arranque propio para Next

Se creo `server.js` para controlar explicitamente el servidor HTTP:

- escucha en `0.0.0.0`;
- usa `process.env.PORT`;
- deja `keepAliveTimeout` y `headersTimeout` en 120 segundos;
- evita depender directamente de `next start`.

`package.json` ahora arranca con:

```json
"start": "node server.js"
```

### 2. Health check

Se agrego:

```text
src/app/api/health/route.ts
```

Devuelve:

```json
{ "ok": true, "service": "hyperframes-render-studio" }
```

Render deberia configurar el Health Check Path como:

```text
/api/health
```

### 3. Dependencia HyperFrames fijada

Antes estaba:

```json
"hyperframes": "latest"
```

Ahora queda fijada a:

```json
"hyperframes": "0.6.21"
```

Esto evita builds no reproducibles en Render.

### 4. Dockerfile ajustado

Se cambio:

- `npm install` por `npm ci`;
- `PORT=10000`;
- `EXPOSE 10000`;
- copia de `server.js` al contenedor final.

Render inyecta `PORT`, pero dejar `10000` como valor por defecto encaja con su convencion habitual.

### 5. README actualizado

Se documento:

- usar Docker en Render;
- configurar `Root Directory` como `hyperframes-render-studio` si el repo contiene mas carpetas;
- configurar `/api/health`;
- revisar logs para errores de puerto, crash, timeout o falta de recursos.

## Como Probar Localmente

Desde:

```powershell
cd "c:\Users\USUARIO\Downloads\videos automatizado\hyperframes-render-studio"
```

Instalar dependencias:

```powershell
npm.cmd install
```

Build:

```powershell
npm.cmd run build
```

Arrancar:

```powershell
$env:PORT="3000"
npm.cmd run start
```

Health check:

```powershell
Invoke-WebRequest -Uri http://127.0.0.1:3000/api/health -UseBasicParsing
```

## Como Desplegar en Render

Configuracion recomendada:

- Service type: Web Service
- Runtime: Docker
- Root Directory: `hyperframes-render-studio`
- Health Check Path: `/api/health`
- No usar un start command manual si Render esta usando el Dockerfile; dejar que ejecute el `CMD` del Dockerfile.

Despues del deploy, revisar los logs y buscar:

- `Ready on http://0.0.0.0:...`
- `SIGKILL`
- `SIGTERM`
- `out of memory`
- errores de Chromium;
- errores de FFmpeg;
- errores de HyperFrames;
- errores de permisos en `/tmp`.

## Pendientes / Siguiente Trabajo

### Prioridad Alta

1. Verificar el deploy real en Render con la configuracion anterior.
2. Confirmar que `/api/health` responde 200 en produccion.
3. Probar `POST /api/generate` con una URL publica simple.
4. Probar `POST /api/render` con un HTML minimo antes de usar plantillas complejas.

### Prioridad Media

1. Si `/api/render` causa 502 o timeouts, pasar el renderizado a una cola:
   - `POST /api/render-jobs` crea un job;
   - `GET /api/render-jobs/:id` consulta estado;
   - `GET /api/render-jobs/:id/download` descarga el MP4.
2. Guardar outputs temporalmente en disco o storage externo.
3. Limitar duracion, resolucion, fps y numero de renders concurrentes.
4. Agregar autenticacion o una clave simple si se expone publicamente.

### Prioridad Baja

1. Mejorar logs estructurados de `/api/render`.
2. Mostrar logs resumidos en la UI cuando falla un render.
3. Permitir elegir voces TTS.
4. Añadir presets visuales para distintos tipos de URL.

## Hipotesis Principal

El 502 de Render no viene del HTML de la app. Viene de infraestructura: Render no recibe respuesta valida del proceso Node, o el proceso muere durante una operacion pesada.

Los cambios actuales atacan la parte de arranque/puerto/health check. Si despues de esto el 502 solo ocurre durante renderizado, el siguiente paso real es desacoplar el render de la peticion HTTP con una cola de trabajos.

