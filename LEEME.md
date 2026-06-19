# ServicePro — archivos para subir (versión final, IA gratis con Groq)

## Paso 1 — Sube estos 9 archivos a tu repo de GitHub

En GitHub (Add file → Upload files), en 3 lugares:

**Carpeta `api/`** (entra a la carpeta `api` y sube estos 7 — reemplazan a los actuales):
- ai-suggest.js
- _guard.js  *(nuevo)*
- make-call.js
- send-sms.js
- send-invoice.js
- send-estimate.js
- upload-photo.js

**Carpeta `scripts/`** (sube este 1, es nuevo):
- route-ai-proxy.mjs

**Raíz del repo** (reemplaza el actual):
- package.json

Dale **Commit changes**. Vercel desplegará solo.

## Paso 2 — Saca tu key GRATIS de Groq (2 minutos, sin tarjeta)

1. Entra a **console.groq.com** y crea cuenta (con Google o email).
2. Menú **API Keys** → **Create API Key** → cópiala (empieza con `gsk_...`).

## Paso 3 — Pega la key en Vercel

Vercel → proyecto `servicepro` → **Settings → Environment Variables** → **Add**:

| Name | Value |
|---|---|
| `GROQ_API_KEY` | tu key `gsk_...` |
| `ALLOWED_ORIGIN` *(opcional)* | `https://servicepro-beta.vercel.app` |

Guarda y haz **Redeploy** (Deployments → … → Redeploy) para que tome la variable.

## Listo
La IA de toda la app funciona gratis con Groq. Si algún día quieres subir a Claude, NO cambias código: solo agregas `ANTHROPIC_API_KEY` en Vercel y quitas la de Groq.

*(El teléfono/IVR también usa IA, pero eso lo conectamos cuando montemos Twilio — ahí apunto su IA a Groq también.)*
