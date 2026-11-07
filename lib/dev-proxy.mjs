// Dev loop for the skin: proxies T3's local server and swaps the skin block in index.html
// for the current files in skin/, read on every request. Reload the page to see edits.
// usage: node lib/dev-proxy.mjs [listen port, default 3774] [T3 port, default 3773]
import http from "node:http";
import net from "node:net";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pageConfig } from "./skin-config.mjs";

const skinDir = join(dirname(fileURLToPath(import.meta.url)), "..", "skin");
const port = Number(process.argv[2] ?? 3774);
const target = Number(process.argv[3] ?? 3773);
const START = "<!-- codex-skin:start -->";
const END = "<!-- codex-skin:end -->";

const skinBlock = () =>
  `${START}\n${pageConfig()}<style id="codex-skin-css">\n${readFileSync(join(skinDir, "codex.css"), "utf8")}\n</style>\n<script id="codex-skin-js">\n${readFileSync(join(skinDir, "codex.js"), "utf8")}\n</script>\n${END}\n`;

const reskin = (html) => {
  const start = html.indexOf(START);
  const end = html.indexOf(END);
  if (start !== -1 && end !== -1) html = html.slice(0, start) + html.slice(end + END.length + 1);
  return html.replace("</head>", `${skinBlock()}</head>`);
};

const upstreamHeaders = (headers) => ({ ...headers, host: `127.0.0.1:${target}`, ...(headers.origin ? { origin: `http://127.0.0.1:${target}` } : {}) });

http
  .createServer((req, res) => {
    const up = http.request(
      { host: "127.0.0.1", port: target, method: req.method, path: req.url, headers: { ...upstreamHeaders(req.headers), "accept-encoding": "identity" } },
      (upRes) => {
        const html = (upRes.headers["content-type"] ?? "").includes("text/html") && !req.url.startsWith("/api/");
        if (!html) {
          res.writeHead(upRes.statusCode, upRes.headers);
          return upRes.pipe(res);
        }
        const chunks = [];
        upRes.on("data", (c) => chunks.push(c));
        upRes.on("end", () => {
          const body = Buffer.from(reskin(Buffer.concat(chunks).toString("utf8")));
          const headers = { ...upRes.headers, "content-length": body.length, "cache-control": "no-store" };
          delete headers.etag;
          res.writeHead(upRes.statusCode, headers);
          res.end(body);
        });
      },
    );
    up.on("error", () => res.writeHead(502).end());
    req.pipe(up);
  })
  .on("upgrade", (req, socket, head) => {
    const up = net.connect(target, "127.0.0.1", () => {
      const headers = upstreamHeaders(req.headers);
      up.write(`${req.method} ${req.url} HTTP/1.1\r\n${Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join("\r\n")}\r\n\r\n`);
      if (head.length) up.write(head);
      up.pipe(socket).pipe(up);
    });
    up.on("error", () => socket.destroy());
    socket.on("error", () => up.destroy());
  })
  .listen(port, "127.0.0.1", () => console.log(`codex-skin dev proxy on http://127.0.0.1:${port} -> ${target}`));
