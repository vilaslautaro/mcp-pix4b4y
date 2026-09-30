import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServer } from "../src/server.js";

// Cada alumno usa SU key de Pixabay: ?key=XXX en la URL del conector
// (o header x-pixabay-key / Authorization: Bearer para clientes que lo soporten).
function getKey(req: Request): string | null {
  const url = new URL(req.url);
  const k =
    url.searchParams.get("key") ||
    req.headers.get("x-pixabay-key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return k && /^[A-Za-z0-9-]{10,80}$/.test(k.trim()) ? k.trim() : null;
}

function rpcError(status: number, message: string) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: Request) {
  const key = getKey(req);
  if (!key) return rpcError(401, "Falta tu API key de Pixabay. Agregala al final de la URL: ?key=TU_KEY");

  const server = createServer(key);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless: ideal para serverless
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    // Se cierra al terminar el request; no queda estado entre llamadas.
    queueMicrotask(() => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });
  }
}

// Modo stateless: no hay stream SSE abierto ni sesiones que borrar.
export function GET() {
  return rpcError(405, "Usá POST. Esta URL es un servidor MCP: agregala como conector en Claude.");
}
export function DELETE() {
  return rpcError(405, "Sin sesiones en modo stateless.");
}
