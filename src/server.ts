import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const API = "https://pixabay.com/api/";
const VIDEO_API = "https://pixabay.com/api/videos/";
const VERSION = "1.0.0";

type Params = Record<string, string | number | boolean | undefined>;

async function pixabay(base: string, apiKey: string, params: Params) {
  const qs = new URLSearchParams({ key: apiKey });
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  // Nunca se loguea la URL: lleva la API key.
  const res = await fetch(`${base}?${qs}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 200);
    if (res.status === 400 && /key/i.test(body)) throw new Error("API key de Pixabay inválida.");
    if (res.status === 429) throw new Error("Límite de Pixabay alcanzado (100 búsquedas/min por key). Esperá un minuto.");
    throw new Error(`Pixabay respondió ${res.status}: ${body}`);
  }
  return res.json() as Promise<{ total: number; totalHits: number; hits: any[] }>;
}

// Respuestas compactas: solo lo útil, para no gastar contexto del modelo.
function slimImage(h: any) {
  return {
    id: h.id,
    tags: h.tags,
    type: h.type,
    width: h.imageWidth,
    height: h.imageHeight,
    preview: h.previewURL,
    web_640: h.webformatURL,
    large_1280: h.largeImageURL,
    page: h.pageURL,
    author: h.user,
    downloads: h.downloads,
    likes: h.likes,
    ai_generated: h.isAiGenerated ?? undefined,
  };
}

function slimVideo(h: any) {
  const pick = (v: any) => (v?.url ? { url: v.url, width: v.width, height: v.height, size: v.size } : undefined);
  return {
    id: h.id,
    tags: h.tags,
    duration_s: h.duration,
    page: h.pageURL,
    author: h.user,
    downloads: h.downloads,
    likes: h.likes,
    files: {
      large: pick(h.videos?.large),
      medium: pick(h.videos?.medium),
      small: pick(h.videos?.small),
      tiny: pick(h.videos?.tiny),
    },
    thumbnail: h.videos?.medium?.thumbnail ?? h.videos?.tiny?.thumbnail,
  };
}

const NOTE =
  "Fuente: Pixabay (pixabay.com). Las URLs de archivo son temporales (~24 h): descargá lo que sirva; para un link permanente usá `page`.";

function result(total: number, items: unknown[]) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ total, count: items.length, note: NOTE, results: items }, null, 2) }],
  };
}

function fail(e: unknown) {
  return { isError: true, content: [{ type: "text" as const, text: e instanceof Error ? e.message : String(e) }] };
}

const common = {
  q: z.string().max(100).optional().describe("Qué buscar. Conviene en inglés para más resultados (ej: 'woman skincare')."),
  lang: z.string().optional().describe("Idioma de la búsqueda, ej 'es' o 'en'. Default 'en'."),
  category: z
    .enum(["backgrounds", "fashion", "nature", "science", "education", "feelings", "health", "people", "religion", "places", "animals", "industry", "computer", "food", "sports", "transportation", "travel", "buildings", "business", "music"])
    .optional(),
  min_width: z.number().int().min(0).optional(),
  min_height: z.number().int().min(0).optional(),
  editors_choice: z.boolean().optional().describe("Solo piezas premiadas por los editores (mejor calidad)."),
  safesearch: z.boolean().optional(),
  order: z.enum(["popular", "latest"]).optional(),
  page: z.number().int().min(1).optional(),
  per_page: z.number().int().min(3).max(200).optional().describe("Resultados por página, 3 a 200. Default 20."),
};

export function createServer(apiKey: string) {
  const server = new McpServer({ name: "pixabay", version: VERSION });

  server.registerTool(
    "search_images",
    {
      title: "Buscar imágenes en Pixabay",
      description: "Busca fotos, ilustraciones y vectores libres de derechos en Pixabay.",
      inputSchema: {
        ...common,
        image_type: z.enum(["all", "photo", "illustration", "vector"]).optional(),
        orientation: z.enum(["all", "horizontal", "vertical"]).optional(),
        colors: z.string().optional().describe("Filtro de color separado por comas: grayscale, transparent, red, orange, yellow, green, turquoise, blue, lilac, pink, white, gray, black, brown."),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const d = await pixabay(API, apiKey, { ...args, per_page: args.per_page ?? 20 });
        return result(d.totalHits, d.hits.map(slimImage));
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "search_videos",
    {
      title: "Buscar videos en Pixabay",
      description: "Busca videos libres de derechos en Pixabay. Devuelve archivos en varias resoluciones.",
      inputSchema: {
        ...common,
        video_type: z.enum(["all", "film", "animation"]).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const d = await pixabay(VIDEO_API, apiKey, { ...args, per_page: args.per_page ?? 20 });
        return result(d.totalHits, d.hits.map(slimVideo));
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "get_image",
    {
      title: "Imagen por ID",
      description: "Trae una imagen de Pixabay por su ID.",
      inputSchema: { id: z.union([z.string(), z.number()]).describe("ID de la imagen") },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ id }) => {
      try {
        const d = await pixabay(API, apiKey, { id: String(id) });
        return result(d.totalHits, d.hits.map(slimImage));
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "get_video",
    {
      title: "Video por ID",
      description: "Trae un video de Pixabay por su ID.",
      inputSchema: { id: z.union([z.string(), z.number()]).describe("ID del video") },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ id }) => {
      try {
        const d = await pixabay(VIDEO_API, apiKey, { id: String(id) });
        return result(d.totalHits, d.hits.map(slimVideo));
      } catch (e) {
        return fail(e);
      }
    }
  );

  return server;
}
