// Skin updater agent: a tiny local server behind the skin's "Codex skin" rail button.
// The page can't run git or restart T3 itself; it asks this agent (127.0.0.1 only, token).
//   GET  /status[?refresh=1]  { head, behind, rev, version, latest, updating }
//                             (fetches origin at most every 10 min; latest = the upstream version
//                             and the CHANGELOG.md releases newer than this one)
//   POST /update              git pull, then apply the skin and restart T3
//   POST /stop-command        { threadId, command } stop the shell command a thread is running
//                             (lib/stop-command.mjs), so a steered message lands now
// Started by install-auto-apply.sh (LaunchAgent, macOS) or auto-apply.ps1 (Windows).
import http from "node:http";
import { execFile, spawn } from "node:child_process";
import { timingSafeEqual } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { AGENT_PORT, ROOT, agentToken, skinRev } from "./skin-config.mjs";
import { stopCommand } from "./stop-command.mjs";
import { VERSION_PATTERN, compareVersions, parseChangelog, readVersion } from "./changelog.mjs";

const FETCH_EVERY_MS = 10 * 60_000;
const log = (...parts) => console.log(new Date().toISOString(), ...parts);

const git = (...args) =>
  new Promise((resolve, reject) => {
    execFile("git", args, { cwd: ROOT, timeout: 60_000, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } }, (error, stdout, stderr) =>
      error ? reject(new Error((stderr || error.message).trim())) : resolve(stdout.trim()),
    );
  });

// What the pending update brings: its version and the changelog entries newer than ours.
const upstreamRelease = async (current) => {
  const version = (await git("show", "@{u}:VERSION").catch(() => "")).trim();
  if (!VERSION_PATTERN.test(version)) return null;
  const changelog = await git("show", "@{u}:CHANGELOG.md").catch(() => "");
  const releases = parseChangelog(changelog).filter(
    (release) => !current || !VERSION_PATTERN.test(current) || compareVersions(release.version, current) > 0,
  );
  return { version, releases };
};

let lastFetch = 0;
let fetchError = null;
let updating = false;

const status = async (refresh) => {
  if (refresh || Date.now() - lastFetch > FETCH_EVERY_MS) {
    lastFetch = Date.now();
    try {
      await git("fetch", "--quiet");
      fetchError = null;
    } catch (error) {
      fetchError = error.message;
    }
  }
  const behind = Number(await git("rev-list", "--count", "HEAD..@{u}").catch(() => "0")) || 0;
  let version = null;
  try {
    version = readVersion(ROOT);
  } catch {}
  return {
    head: await git("rev-parse", "--short", "HEAD").catch(() => null),
    behind,
    rev: skinRev(),
    version,
    latest: behind > 0 ? await upstreamRelease(version) : null,
    updating,
    fetchError,
  };
};

// Apply + restart. macOS goes through the "Codex Skin Updater" helper app, the only process
// allowed to modify T3 (App Management); the flag tells it to restart T3 without asking.
const applyAndRestart = () => {
  if (process.platform === "darwin") {
    writeFileSync(join(ROOT, ".restart-requested"), new Date().toISOString() + "\n");
    spawn("open", ["-g", join(ROOT, "Codex Skin Updater.app")], { detached: true, stdio: "ignore" }).unref();
  } else if (process.platform === "win32") {
    spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(ROOT, "apply.ps1"), "-Restart"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
  } else {
    throw new Error(`unsupported platform ${process.platform}`);
  }
};

const update = async () => {
  if (updating) return { ok: false, error: "An update is already running." };
  updating = true;
  try {
    const before = await git("rev-parse", "HEAD");
    await git("pull", "--ff-only", "--quiet");
    const pulled = Number(await git("rev-list", "--count", `${before}..HEAD`)) || 0;
    log(`update: pulled ${pulled} commit(s), applying and restarting T3`);
    applyAndRestart();
    // The agent's own code may have changed: exit so it restarts on the new version
    // (launchd keeps it alive on macOS; auto-apply.ps1 starts it again on Windows).
    setTimeout(() => process.exit(0), 3000);
    return { ok: true, pulled };
  } catch (error) {
    updating = false;
    log("update failed:", error.message);
    return { ok: false, error: error.message };
  }
};

const readJson = (req) =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 64_000) req.destroy(new Error("body too large"));
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("bad JSON"));
      }
    });
    req.on("error", reject);
  });

const authorized = (req) => {
  const given = Buffer.from(String(req.headers["x-codex-skin-token"] ?? ""));
  const want = Buffer.from(agentToken());
  return given.length === want.length && timingSafeEqual(given, want);
};

http
  .createServer(async (req, res) => {
    const send = (code, body) => {
      res.writeHead(code, {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "x-codex-skin-token, content-type",
        "access-control-allow-methods": "GET, POST",
        "access-control-allow-private-network": "true",
        "cache-control": "no-store",
      });
      res.end(body === undefined ? "" : JSON.stringify(body));
    };
    if (req.method === "OPTIONS") return send(204);
    if (!authorized(req)) return send(403, { error: "bad token" });
    const url = new URL(req.url, "http://127.0.0.1");
    try {
      if (req.method === "GET" && url.pathname === "/status") return send(200, await status(url.searchParams.has("refresh")));
      if (req.method === "POST" && url.pathname === "/update") return send(200, await update());
      if (req.method === "POST" && url.pathname === "/stop-command") {
        if (process.platform !== "darwin") return send(200, { ok: false, error: "Only on macOS for now." });
        const { threadId, command } = await readJson(req);
        const result = await stopCommand(String(threadId ?? ""), String(command ?? ""));
        log(`stop-command ${threadId}:`, result.ok ? `stopped pid ${result.pid} after ${result.age}s` : result.error);
        return send(200, result);
      }
      send(404, { error: "not found" });
    } catch (error) {
      send(500, { error: error.message });
    }
  })
  .on("error", (error) => {
    // Another agent already serves this port: nothing to do.
    if (error.code === "EADDRINUSE") process.exit(0);
    throw error;
  })
  .listen(AGENT_PORT, "127.0.0.1", () => {
    agentToken();
    writeFileSync(join(ROOT, ".agent-pid"), `${process.pid}\n`);
    log(`codex-skin agent on http://127.0.0.1:${AGENT_PORT} (${ROOT})`);
  });
