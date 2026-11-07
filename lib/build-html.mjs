// Inline the skin into T3's index.html (idempotent: an existing skin block is replaced).
// usage: node build-html.mjs <index.html in> <index.html out> <skin dir>   (inject)
//        node build-html.mjs <index.html in> <index.html out> --strip       (remove)

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pageConfig } from "./skin-config.mjs";

const START = "<!-- codex-skin:start -->";
const END = "<!-- codex-skin:end -->";

const [input, output, skinDir] = process.argv.slice(2);
if (!input || !output || !skinDir) {
  console.error("usage: node build-html.mjs <in> <out> <skin dir>|--strip");
  process.exit(2);
}

const stripBlock = (html) => {
  const start = html.indexOf(START);
  if (start === -1) return html;
  const end = html.indexOf(END, start);
  if (end === -1) throw new Error("found codex-skin:start without codex-skin:end");
  let after = end + END.length;
  if (html[after] === "\n") after += 1;
  return html.slice(0, start) + html.slice(after);
};

let html = stripBlock(readFileSync(input, "utf8"));

if (skinDir !== "--strip") {
  const css = readFileSync(join(skinDir, "codex.css"), "utf8");
  const js = readFileSync(join(skinDir, "codex.js"), "utf8");
  if (css.includes("</style") || js.includes("</script")) {
    throw new Error("skin files must not contain closing style/script tags");
  }
  if (!html.includes("</head>")) throw new Error("index.html has no </head>");
  const block = `${START}\n${pageConfig(dirname(resolve(skinDir)))}<style id="codex-skin-css">\n${css}\n</style>\n<script id="codex-skin-js">\n${js}\n</script>\n${END}\n`;
  html = html.replace("</head>", `${block}</head>`);
}

writeFileSync(output, html);
