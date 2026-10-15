# Pixabay MCP

Servidor MCP para buscar fotos, ilustraciones y videos libres de derechos en Pixabay desde Claude. Solo lectura, sin estado, sin logs de la API key.

Dos formas de usarlo:

| | Remoto (Vercel) | Extensión Desktop (.mcpb) |
|---|---|---|
| Dónde anda | claude.ai web, desktop y móvil | Solo Claude Desktop |
| Instalación del usuario | Pegar una URL en Connectors | Doble click al archivo y pegar la key |
| Actualizaciones | Automáticas (redeploy) | Mandar un .mcpb nuevo |

## Remoto

Cada usuario usa su propia key de Pixabay en la URL:

```
https://TU-DOMINIO/mcp?key=SU_KEY
```

En la raíz del dominio hay una página que les arma ese link (la key no sale del navegador).

Deploy: importar el repo en Vercel, framework "Other", sin variables de entorno. No hace falta una key propia en el server.

## Extensión Desktop

```bash
npm install
npm run build:mcpb   # genera dist/pixabay.mcpb
```

## Herramientas

- `search_videos` — filtros del lado del servidor: `orientation`, `min_duration`, `min_crop_height` (alto del recorte 9:16, default 1080). `exclude_ai: true` descarta lo generado con IA (cada item trae `ai_generated`). Devuelve `dropped_by` con cuántos no cumplen cada filtro y `best`: el archivo más liviano con recorte 9:16 de al menos `best_crop_height` (default 1440; si ninguno llega, el más grande), con url, alto y MB. Los `tags` vienen cortados a los primeros 8.
- `get_videos` — hasta 20 videos por ID en una llamada.
- `search_images` — fotos, ilustraciones y vectores.
- `get_image` / `get_video` — por ID.
- `grid: true` en las búsquedas y en `get_videos` agrega una imagen (~1000 px, hasta 20 celdas) con las miniaturas numeradas en el orden de `results`.

### Contrato de respuesta

Todas las respuestas traen `v` (versión del formato, hoy `1`). Hay scripts que las leen: renombrar, quitar o cambiar el tipo de un campo exige subir `v` (constante `FORMAT` en `src/server.ts`). Agregar campos no.

Las URLs de archivo que devuelve Pixabay vencen en ~24 h: descargá lo que uses.

Basado en la idea de [Unlock-MCP/pixabay-mcp-server](https://github.com/Unlock-MCP/pixabay-mcp-server) (MIT), reescrito sobre el SDK actual de MCP.
