# Seguimiento a Recomendaciones — Comité Académico

## Estado del proyecto

Backend (Apps Script + Sheets) desplegado y frontend (React + Vite) construido.
Pendiente: crear el repositorio en GitHub, configurar el workflow de despliegue
y sembrar los destinatarios reales (`sembrarDestinatarios` desde el panel).

## Comandos

```bash
npm run dev       # servidor local (localhost:5173)
npm run build     # build de producción a dist/
npm run lint      # oxlint
```

Backend (`gas/`), con [clasp](https://github.com/google/clasp):

```bash
cd gas
npx @google/clasp push                                   # sube Code.gs / appsscript.json
npx @google/clasp deploy -i <deploymentId>                # actualiza la Web App EN VIVO
```

`clasp push` por sí solo **no** actualiza la Web App publicada — hay que
redesplegar el deployment id existente con `-i`, o el frontend seguirá
hablando con el código anterior.

## Entorno

`.env` (no se commitea):

```
VITE_GAS_URL=https://script.google.com/macros/s/AKfycbxbV9AfaBokUNpJ0keYN92luqA4iDazI6CcDQMfucKwp6vMUcRVwoEIvHSgzF3I2_hR/exec
```

## Arquitectura

```
GitHub Pages (alianzaeducacionrural/seguimientorecomendaciones)
   │  React 19 + Vite + CSS Modules
   │  fetch → Content-Type: text/plain  (evita preflight CORS)
   ▼
Apps Script Web App  (doGet / doPost, ANYONE_ANONYMOUS, executeAs USER_DEPLOYING)
   ├── Spreadsheet "Seguimiento Recomendaciones Comité Académico"
   │      carpeta Drive: 1Jyoqe-gmOlT2rOVm1cdTHnq2Vq7LEjA5
   ├── subcarpeta "Evidencias" (se crea sola la primera vez) → archivos subidos
   └── Catálogo externo (solo lectura, NUNCA se escribe ahí):
          Spreadsheet 1sDwOuJk0x1mO6lxJbzzWTd088SOg7fAWEuXSZEM1Eog
          · pestaña "Instituciones" (gid 28982679) → Municipio | Institución Educativa
          · pestaña de universidades → localizada por encabezado ("Universidad"/"Programa"),
            no por nombre ni gid, para no romperse si la renombran
```

## Rutas

| Ruta | Pantalla |
|---|---|
| `/` | Portada |
| `/panel` | Resumen (dashboard) |
| `/panel/recomendaciones` | CRUD de recomendaciones + asignación de destinatarios |
| `/panel/destinatarios` | Catálogo de destinatarios, siembra desde catálogo externo, magic links |
| `/portal?token=xxxxxxxx` | Portal del destinatario (token-scoped) |

El truco `404.html` (`public/404.html` + `src/spaGithubPagesRedirect.js`,
patrón `spa-github-pages`/rafgraph) es necesario porque los magic links entran
directo a `/portal?token=...` — sin él, GitHub Pages devuelve 404 real.
`spaGithubPagesRedirect.js` se importa **antes** que `App` en `main.jsx`.

## Estructura

```
src/
  main.jsx, App.jsx, index.css, spaGithubPagesRedirect.js
  Home.jsx
  components/        Modal, Estado, EstadoTag, GaugeDial, SelectorDestinatarios, EnlaceMagico
  panel/              PanelLayout, Dashboard, Recomendaciones, Destinatarios, hooks/useEntidad
  portal/             Portal.jsx (token-scoped)
  utils/              api.js (cliente HTTP), formato.js (dominios/formateo)
gas/
  Code.gs             router + esquema autorreparable + CRUD + magic links + evidencias
  appsscript.json
```

## Backend — notas críticas

- **CORS**: todo POST usa `Content-Type: text/plain` (nunca `application/json`) —
  Apps Script no responde el preflight que dispara `application/json`.
- **Decodificación UTF-8**: `e.postData.contents` decodifica como Latin-1 y corrompe
  tildes/ñ. Siempre usar `e.postData.getDataAsString('UTF-8')`.
- **Esquema autorreparable**: `hojaDe()`/`asegurarEsquema()` crean la pestaña y
  ajustan encabezados si `ENCABEZADOS` cambia — no hay que migrar el Sheet a mano.
- **`LockService`** envuelve la creación de registros y la siembra para evitar
  ids/tokens duplicados si dos personas escriben a la vez.
- **Tokens de magic link**: 8 caracteres alfanuméricos, generados **solo en
  servidor** (nunca se acepta uno enviado por el cliente), sin expiración,
  guardados en texto plano en la hoja `destinatarios`. No es autenticación
  fuerte — es el mismo modelo que usan las plataformas hermanas del Comité.
- **Aislamiento por token**: `reportarAvance` y `subirEvidencia` verifican que
  `asignacion.destinatario_id` coincida con el destinatario resuelto por el
  token antes de escribir. Sin esa verificación cualquier token válido podría
  modificar la asignación de otro destinatario.

## Modelo de datos

Una **recomendación** se registra una sola vez; una **asignación** es la fila
por destinatario (puede haber varias por recomendación, incluso mezclando
institución/universidad/entidad), y es la que tiene estado, porcentaje y
evidencias propias.

- `recomendaciones`: id, codigo (`REC-2026-001`, autogenerado), recomendacion, tipo, hallazgo, prioridad, evidencia_esperada, fecha_inicio, fecha_estimada, creado_en, actualizado_en
- `destinatarios`: id, tipo (`institucion_educativa`/`universidad`/`entidad`), nombre, municipio, correo, token, activo
- `asignaciones`: id, recomendacion_id, destinatario_id, estado, porcentaje, tipo_ajuste, descripcion_ajuste, impacto, observaciones, fecha_reporte, actualizado_en
- `evidencias`: id, asignacion_id, tipo (`enlace`/`archivo`), titulo, url, drive_file_id, fecha

`estado`: No iniciada / En proceso / Implementada / Cancelada.
`tipo` (recomendación): Curricular / Académica / Gestión / Bienestar / Evaluación / Permanencia.

## Simplificaciones respecto al plan original

- Sin pestaña `bitacora`: no hay UI que consuma un historial de cambios todavía,
  así que no se agregó — evita código sin consumidor. Se puede sumar cuando haga falta.
- Sin pestaña `config`: `carpeta_drive_evidencias` quedó como constante en `Code.gs`
  (`CARPETA_RAIZ_DRIVE`) porque no cambia en tiempo de ejecución; el `url_magica`
  se construye en el cliente (`EnlaceMagico.jsx`) a partir del token, no se guarda en el Sheet.
- El "resumen" del panel se calcula en el cliente a partir de `recomendaciones` +
  `asignaciones` + `destinatarios` (datasets pequeños) en vez de un endpoint de
  agregación aparte en el backend.

## Diseño

Sistema "consola clara": diales circulares para KPIs y avance, etiquetas de
estado con borde y punto (no pastillas planas), tipografía condensada en
mayúsculas para encabezados. Paleta y tokens en `src/index.css`. Tipografías
autoalojadas vía `@fontsource` (Space Grotesk / Work Sans / Space Mono) — no
Google Fonts CDN, por el ancho de banda en zona rural.

## Lo que NO hay que hacer

- No escribir en el Spreadsheet catálogo externo (`1sDwOuJk...`) — es compartido
  con otras plataformas del Comité y se usa solo en lectura.
- No usar `application/json` en los POST al backend.
- No hacer commit/push a GitHub sin que lo pidan explícitamente.
- No asumir que `clasp push` actualizó la Web App en producción — hay que `deploy -i`.
