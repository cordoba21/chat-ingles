# Matrix English Chat

Chat bilingue (ES/EN) para practicar ingles con correcciones automaticas.

## Requisitos
- Node.js 18+
- API Key de Google AI Studio (Gemini)

## Configuracion
1. Copia `.env.example` a `.env.local`
2. Agrega tu clave:

```bash
GEMINI_API_KEY=tu_key
GEMINI_MODEL=gemini-1.5-flash
```

## Desarrollo
```bash
npm run dev
```

## Deploy en Vercel
- Agrega `GEMINI_API_KEY` en Project Settings -> Environment Variables.
- (Opcional) `GEMINI_MODEL` si quieres cambiar el modelo.

## Notas
- El historial vive solo en memoria del navegador.
- El endpoint esta en `src/app/api/chat/route.ts`.
