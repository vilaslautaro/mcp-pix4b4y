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

- `search_images` — fotos, ilustraciones y vectores (orientación, color, categoría, tamaño mínimo, editors choice)
- `search_videos` — videos en varias resoluciones
- `get_image` / `get_video` — por ID

Las URLs de archivo que devuelve Pixabay vencen en ~24 h: descargá lo que uses.

Basado en la idea de [Unlock-MCP/pixabay-mcp-server](https://github.com/Unlock-MCP/pixabay-mcp-server) (MIT), reescrito sobre el SDK actual de MCP.
