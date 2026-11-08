// VERSION and CHANGELOG.md: the skin's version number and its release notes.
//   ## 1.4.0 (2026-11-08)
//   - **Title**: what changed, in words a user would use.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export const readVersion = (root) => readFileSync(join(root, "VERSION"), "utf8").trim();

// -1, 0 or 1, like a sort comparator.
export const compareVersions = (a, b) => {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1;
  return 0;
};

// [{ version, date, items: [{ title, text }] }], newest first, as written.
export const parseChangelog = (markdown) => {
  const releases = [];
  let item = null;
  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^## (\d+\.\d+\.\d+)(?: \((\d{4}-\d{2}-\d{2})\))?\s*$/);
    if (heading) {
      releases.push({ version: heading[1], date: heading[2] ?? null, items: [] });
      item = null;
    } else if (!releases.length) {
      continue;
    } else if (line.startsWith("- ")) {
      item = { raw: line.slice(2).trim() };
      releases.at(-1).items.push(item);
    } else if (item && /^\s+\S/.test(line)) {
      item.raw += ` ${line.trim()}`;
    } else {
      item = null;
    }
  }
  for (const release of releases) {
    release.items = release.items.map(({ raw }) => {
      const bold = raw.match(/^\*\*(.+?)\*\*(?:\s*\(([^)]*)\))?:?\s*(.*)$/);
      const plain = (text) => text.replace(/\*\*|`/g, "");
      return bold
        ? { title: plain(bold[1]) + (bold[2] ? ` (${bold[2]})` : ""), text: plain(bold[3]) }
        : { title: null, text: plain(raw) };
    });
  }
  return releases;
};

// The markdown of one release, for a tag message or a GitHub release body.
export const releaseNotes = (markdown, version) => {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith(`## ${version} `) || line === `## ${version}`);
  if (start === -1) return null;
  let end = lines.findIndex((line, i) => i > start && line.startsWith("## "));
  if (end === -1) end = lines.length;
  return lines.slice(start + 1, end).join("\n").trim();
};
