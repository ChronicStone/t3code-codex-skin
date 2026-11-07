// Shared facts about the skin checkout, used by the build, the dev proxy and the updater agent.
//   node lib/skin-config.mjs rev     prints the skin's revision (a hash of skin/*)
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// The updater agent listens here, on 127.0.0.1 only.
export const AGENT_PORT = 47391;

// Revision of what would be applied: a hash of the skin files themselves, so local edits count
// as much as pulled commits. Applied pages carry the revision they were built from.
export const skinRev = (root = ROOT) => {
  const hash = createHash("sha256");
  for (const file of ["codex.css", "codex.js"]) {
    hash.update(readFileSync(join(root, "skin", file)));
    hash.update("\0");
  }
  return hash.digest("hex").slice(0, 12);
};

// Shared secret between the page and the agent, so other local pages can't drive the agent.
export const agentToken = (root = ROOT) => {
  const file = join(root, ".agent-token");
  if (!existsSync(file)) writeFileSync(file, randomBytes(24).toString("hex") + "\n", { mode: 0o600 });
  return readFileSync(file, "utf8").trim();
};

// What the page needs to know: <script> that runs before the skin's own script.
export const pageConfig = (root = ROOT) =>
  `<!-- codex-skin:rev ${skinRev(root)} -->\n<script id="codex-skin-config">window.__codexSkin = ${JSON.stringify({
    rev: skinRev(root),
    agent: { port: AGENT_PORT, token: agentToken(root) },
  })};</script>\n`;

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2] === "rev") {
  console.log(skinRev());
}
