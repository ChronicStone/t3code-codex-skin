// "Stop & steer": stop the shell command a T3 thread's Claude session is running, so the
// message steered into that thread lands now instead of when the command ends.
//
//   T3 thread id ──(T3's state db)──> Claude session id ──(ps)──> `claude --session-id=…`
//                                                                   └─ zsh -c "source …/shell-snapshots/…; eval '<command>'"
//
// Each Bash tool call runs in its own process group, so killing that group stops the command
// and everything it started, and nothing else. Claude Code then returns the tool call as failed
// and delivers the steered message. Jobs started with ~/.claude/bin/job run detached in their own
// session, so they survive; only the wait on them is cut.
//
//   node lib/stop-command.mjs <threadId> [command text] [--dry-run]   (manual test)
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const STATE_DB = join(process.env.T3_HOME ?? join(homedir(), ".t3"), "userdata", "statev2.sqlite");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Claude Code's Bash tool sources a shell snapshot first: that marks a tool call's shell, as
// opposed to the session's MCP servers, which are children of `claude` too.
const BASH_TOOL_SHELL = /^\S*\/(zsh|bash|sh) -c .*shell-snapshots\/snapshot-/;

const run = (file, args) =>
  new Promise((resolve, reject) => {
    execFile(file, args, { timeout: 15_000, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) =>
      error ? reject(new Error((stderr || error.message).trim())) : resolve(stdout),
    );
  });

// The Claude session ids behind a T3 thread (one, unless the thread was handed off or forked).
// Thread ids are UUIDs or, for child threads, "thread:delegated-task:command%3A…".
const THREAD_ID = /^[A-Za-z0-9:%._-]{1,400}$/;

export const sessionIds = async (threadId) => {
  if (!THREAD_ID.test(threadId)) throw new Error("bad thread id");
  const rows = await run("/usr/bin/sqlite3", [
    "-readonly",
    STATE_DB,
    `select payload_json from orchestration_v2_projection_provider_threads where thread_id = '${threadId}';`,
  ]);
  const ids = new Set();
  for (const line of rows.split("\n")) {
    if (!line.trim()) continue;
    try {
      const ref = JSON.parse(line).nativeThreadRef;
      if (ref?.driver === "claudeAgent" && UUID.test(ref.nativeId ?? "")) ids.add(ref.nativeId);
    } catch {}
  }
  return [...ids];
};

// "[[dd-]hh:]mm:ss" → seconds
const seconds = (etime) => {
  const [days, rest] = etime.includes("-") ? etime.split("-") : ["0", etime];
  return rest.split(":").reduce((total, part) => total * 60 + Number(part), 0) + Number(days) * 86_400;
};

const processes = async () =>
  (await run("/bin/ps", ["-axww", "-o", "pid=,ppid=,pgid=,etime=,command="]))
    .split("\n")
    .map((line) => line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/))
    .filter(Boolean)
    .map(([, pid, ppid, pgid, etime, command]) => ({ pid: +pid, ppid: +ppid, pgid: +pgid, age: seconds(etime), command }));

// The command as Claude wrote it, from the shell's `eval '<command>'` (quotes undone).
const evaluated = (shellCommand) => {
  const start = shellCommand.indexOf(" eval '");
  if (start === -1) return shellCommand;
  const body = shellCommand.slice(start + 7).replace(/'(?: < \/dev\/null)? && pwd -P >\| \S+$/, "");
  return body.replaceAll(`'"'"'`, "'").replaceAll(`'\\''`, "'");
};

// The RTK hook rewrites commands (`cat` → `rtk read`), so compare words, not strings.
const words = (text) => new Set(text.toLowerCase().match(/[a-z0-9_.\/-]{3,}/g) ?? []);
const overlap = (shown, actual) => {
  const want = words(shown);
  if (!want.size) return 0;
  const have = words(actual);
  let hits = 0;
  for (const word of want) if (have.has(word)) hits++;
  return hits / want.size;
};

export const findCommand = async (threadId, shownCommand = "") => {
  const sessions = await sessionIds(threadId);
  if (!sessions.length) return { error: "No Claude session found for this thread." };
  const all = await processes();
  const claudes = all.filter(
    (p) => /(^|\/)claude(\s|$)/.test(p.command.split(" --")[0]) && sessions.some((id) => p.command.includes(`=${id}`) || p.command.includes(` ${id}`)),
  );
  if (!claudes.length) return { error: "This thread's Claude process isn't running." };
  const shells = all
    .filter((p) => claudes.some((c) => c.pid === p.ppid) && p.pgid === p.pid && BASH_TOOL_SHELL.test(p.command))
    .map((p) => ({ ...p, text: evaluated(p.command), score: shownCommand ? overlap(shownCommand, evaluated(p.command)) : 0 }));
  if (!shells.length) return { error: "No command is running in this thread." };
  if (shells.length === 1) return { shell: shells[0] };
  // Several (a background command next to the running one): the one the row shows, else the newest.
  shells.sort((a, b) => b.score - a.score || a.age - b.age);
  if (shownCommand && shells[0].score < 0.6) return { error: "Couldn't tell which running command is shown." };
  if (shownCommand && shells[0].score - shells[1].score < 0.15 && shells[0].text !== shells[1].text) {
    return { error: "Two running commands look alike; stop it from a terminal." };
  }
  return { shell: shells[0] };
};

const alive = (pgid) => {
  try {
    process.kill(-pgid, 0);
    return true;
  } catch {
    return false;
  }
};

export const stopCommand = async (threadId, shownCommand, { dryRun = false } = {}) => {
  const found = await findCommand(threadId, shownCommand);
  if (!found.shell) return { ok: false, error: found.error };
  const { pgid, text, age } = found.shell;
  const summary = { pid: pgid, age, command: text.slice(0, 200) };
  if (dryRun) return { ok: true, dryRun: true, ...summary };
  process.kill(-pgid, "SIGTERM");
  for (let i = 0; i < 20 && alive(pgid); i++) await new Promise((resolve) => setTimeout(resolve, 100));
  if (alive(pgid)) process.kill(-pgid, "SIGKILL");
  return { ok: true, ...summary };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const [threadId, shown = ""] = args.filter((a) => a !== "--dry-run");
  console.log(JSON.stringify(await stopCommand(threadId, shown, { dryRun }), null, 2));
}
