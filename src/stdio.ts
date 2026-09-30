import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const key = (process.env.PIXABAY_API_KEY || "").trim();
if (!key) {
  console.error("Falta PIXABAY_API_KEY. Configurala en los ajustes de la extensión.");
  process.exit(1);
}

await createServer(key).connect(new StdioServerTransport());
