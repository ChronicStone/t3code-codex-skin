// Publish the version in VERSION: check it against CHANGELOG.md and the last tag, tag it
// (v1.4.0, the changelog section as message), push main and the tag, and create the GitHub release.
//   node lib/release.mjs            release
//   node lib/release.mjs --check    only check, change nothing
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./skin-config.mjs";
import { VERSION_PATTERN, compareVersions, parseChangelog, readVersion, releaseNotes } from "./changelog.mjs";

const checkOnly = process.argv.includes("--check");
const run = (file, args, options = {}) => execFileSync(file, args, { cwd: ROOT, encoding: "utf8", ...options }).trim();
const git = (...args) => run("git", args);
const fail = (message) => {
  console.error(`release: ${message}`);
  process.exit(1);
};

const version = readVersion(ROOT);
if (!VERSION_PATTERN.test(version)) fail(`VERSION must look like 1.4.0, found "${version}"`);
const tag = `v${version}`;

const changelog = readFileSync(join(ROOT, "CHANGELOG.md"), "utf8");
const releases = parseChangelog(changelog);
if (releases[0]?.version !== version) fail(`CHANGELOG.md must start with "## ${version} (YYYY-MM-DD)"`);
if (!releases[0].date) fail(`the ${version} heading needs a date: "## ${version} (YYYY-MM-DD)"`);
if (!releases[0].items.length) fail(`the ${version} section has no entries`);
const notes = releaseNotes(changelog, version);

const tags = git("tag", "--list", "v*").split("\n").filter((t) => VERSION_PATTERN.test(t.slice(1)));
if (tags.includes(tag)) fail(`${tag} already exists: bump VERSION and add a changelog section first`);
const latest = tags.map((t) => t.slice(1)).sort(compareVersions).at(-1);
if (latest && compareVersions(version, latest) <= 0) fail(`${version} must be newer than the last release, ${latest}`);
if (git("status", "--porcelain")) fail("commit your changes first");
if (git("rev-parse", "--abbrev-ref", "HEAD") !== "main") fail("release from main");

console.log(`${tag}${latest ? ` (after v${latest})` : ""}\n\n${notes}\n`);
if (checkOnly) process.exit(0);

git("tag", "-a", tag, "-m", `${version}\n\n${notes}`);
git("push", "origin", "main", tag);
try {
  run("gh", ["release", "create", tag, "--title", version, "--notes", notes, "--verify-tag"], { stdio: ["ignore", "pipe", "pipe"] });
  console.log(`released ${tag} on GitHub`);
} catch (error) {
  console.log(`tagged and pushed ${tag}; the GitHub release failed (${String(error.stderr ?? error.message).trim()}), create it by hand`);
}
