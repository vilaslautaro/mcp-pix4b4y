// Grilla de miniaturas en JS puro (sin dependencias nativas): anda igual en Vercel y en la extensión .mcpb.
import jpeg from "jpeg-js";

export const GRID_MAX = 20;
const COLS = 5;
const CELL = 192; // caja cuadrada: la miniatura entra entera, así se ve si es vertical u horizontal
const GAP = 8;
const SCALE = 2; // fuente 5x7 al doble
const BG = [24, 24, 24];
const EMPTY = [60, 60, 60];

export type GridCell = { thumb?: string; line1: string; line2: string };

// Fuente 5x7 mínima: solo los caracteres que usan las etiquetas.
const FONT: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  s: ["00000", "00000", "01111", "10000", "01110", "00001", "11110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

type Img = { width: number; height: number; data: Uint8Array };

function fill(img: Img, x0: number, y0: number, w: number, h: number, c: number[]) {
  for (let y = Math.max(0, y0); y < Math.min(img.height, y0 + h); y++)
    for (let x = Math.max(0, x0); x < Math.min(img.width, x0 + w); x++) {
      const i = (y * img.width + x) * 4;
      img.data[i] = c[0];
      img.data[i + 1] = c[1];
      img.data[i + 2] = c[2];
      img.data[i + 3] = 255;
    }
}

function text(img: Img, x: number, y: number, s: string) {
  const w = s.length * 6 * SCALE + 2 * SCALE;
  fill(img, x, y, w, 9 * SCALE, [0, 0, 0]);
  let cx = x + SCALE;
  for (const ch of s) {
    const g = FONT[ch] ?? FONT["?"];
    for (let r = 0; r < 7; r++)
      for (let c = 0; c < 5; c++)
        if (g[r][c] === "1") fill(img, cx + c * SCALE, y + SCALE + r * SCALE, SCALE, SCALE, [255, 255, 255]);
    cx += 6 * SCALE;
  }
}

// Escala bilineal para encajar la miniatura dentro de la celda.
function blit(dst: Img, src: Img, x0: number, y0: number) {
  const k = Math.min(CELL / src.width, CELL / src.height);
  const w = Math.max(1, Math.round(src.width * k));
  const h = Math.max(1, Math.round(src.height * k));
  const ox = x0 + Math.floor((CELL - w) / 2);
  const oy = y0 + Math.floor((CELL - h) / 2);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(src.height - 1, ((y + 0.5) / k) - 0.5);
    const y1 = Math.max(0, Math.floor(sy)), y2 = Math.min(src.height - 1, y1 + 1), fy = Math.max(0, sy - y1);
    for (let x = 0; x < w; x++) {
      const sx = Math.min(src.width - 1, ((x + 0.5) / k) - 0.5);
      const x1 = Math.max(0, Math.floor(sx)), x2 = Math.min(src.width - 1, x1 + 1), fx = Math.max(0, sx - x1);
      const di = ((oy + y) * dst.width + ox + x) * 4;
      for (let c = 0; c < 3; c++) {
        const p = (yy: number, xx: number) => src.data[(yy * src.width + xx) * 4 + c];
        const top = p(y1, x1) * (1 - fx) + p(y1, x2) * fx;
        const bot = p(y2, x1) * (1 - fx) + p(y2, x2) * fx;
        dst.data[di + c] = Math.round(top * (1 - fy) + bot * fy);
      }
      dst.data[di + 3] = 255;
    }
  }
}

async function load(url: string): Promise<Img | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf[0] !== 0xff || buf[1] !== 0xd8) return null; // solo JPEG
    const d = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true, maxResolutionInMP: 12, maxMemoryUsageInMB: 128 });
    return { width: d.width, height: d.height, data: d.data };
  } catch {
    return null;
  }
}

/** Devuelve un JPEG en base64 con las celdas en el mismo orden que se pasan. */
export async function renderGrid(cells: GridCell[]): Promise<string> {
  const list = cells.slice(0, GRID_MAX);
  const cols = Math.min(COLS, Math.max(1, list.length));
  const rows = Math.ceil(list.length / cols);
  const img: Img = {
    width: cols * CELL + (cols + 1) * GAP,
    height: rows * CELL + (rows + 1) * GAP,
    data: new Uint8Array((cols * CELL + (cols + 1) * GAP) * (rows * CELL + (rows + 1) * GAP) * 4),
  };
  fill(img, 0, 0, img.width, img.height, BG);

  const thumbs = await Promise.all(list.map((c) => (c.thumb ? load(c.thumb) : Promise.resolve(null))));
  list.forEach((c, i) => {
    const x = GAP + (i % cols) * (CELL + GAP);
    const y = GAP + Math.floor(i / cols) * (CELL + GAP);
    fill(img, x, y, CELL, CELL, EMPTY);
    const t = thumbs[i];
    if (t) blit(img, t, x, y);
    text(img, x, y, c.line1);
    text(img, x, y + CELL - 9 * SCALE, c.line2);
  });

  return Buffer.from(jpeg.encode({ width: img.width, height: img.height, data: img.data }, 72).data).toString("base64");
}
