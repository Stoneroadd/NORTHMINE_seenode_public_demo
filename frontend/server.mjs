import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = resolve(__dirname, "dist");
const PORT = Number(process.env.PORT || 8080);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function safeAssetPath(requestUrl) {
  const pathname = new URL(requestUrl || "/", "http://localhost").pathname;
  const candidate = normalize(join(BUILD_DIR, decodeURIComponent(pathname)));
  return candidate.startsWith(BUILD_DIR) ? candidate : null;
}

async function sendFile(response, filePath) {
  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    return false;
  }
  if (!fileStat.isFile()) return false;
  response.writeHead(200, {
    "Cache-Control": filePath.endsWith("index.html") ? "no-store" : "public, max-age=31536000, immutable",
    "Content-Length": fileStat.size,
    "Content-Type": MIME_TYPES[extname(filePath)] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
  return true;
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url || "/", "http://localhost").pathname;
    if (pathname === "/health" || pathname.startsWith("/api/")) {
      sendJson(response, 503, {
        detail: "Backend FastAPI no disponible en este proceso. Usa npm start desde la raiz o configura VITE_API_URL hacia el backend.",
        service: "northmine-frontend",
      });
      return;
    }

    const assetPath = safeAssetPath(request.url);
    if (assetPath && await sendFile(response, assetPath)) return;

    const indexHtml = await readFile(join(BUILD_DIR, "index.html"));
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
    });
    response.end(indexHtml);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("NORTHMINE frontend server error");
  }
}).listen(PORT, "0.0.0.0", () => {
  console.log(`NORTHMINE frontend listening on 0.0.0.0:${PORT}`);
});
