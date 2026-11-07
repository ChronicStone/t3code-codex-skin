// Replace one file inside an Electron asar archive without unpacking it.
// The new file content is appended after the existing data and the header entry is
// repointed at it, so every other file (and app.asar.unpacked) stays byte-identical.
//
// usage: node patch-asar.mjs <app.asar> <inner/path/file> <command>
//   command "read [out]"     print the file to stdout, or write it to <out>
//   command "list"           list the packed files (diagnostics; <inner> is ignored)
//   command "write <src>"    replace the file with the contents of <src>

import { createHash } from "node:crypto";
import {
  closeSync,
  createReadStream,
  createWriteStream,
  openSync,
  readFileSync,
  readSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { finished } from "node:stream/promises";

const BLOCK_SIZE = 4 * 1024 * 1024;

const [archivePath, innerPath, command, sourcePath] = process.argv.slice(2);
if (!archivePath || !innerPath || !["read", "write", "list"].includes(command)) {
  console.error("usage: node patch-asar.mjs <app.asar> <inner/path> read|write <src>");
  process.exit(2);
}

const readHeader = (path) => {
  const fd = openSync(path, "r");
  try {
    const prefix = Buffer.alloc(16);
    readSync(fd, prefix, 0, 16, 0);
    const headerPickleSize = prefix.readUInt32LE(4);
    const jsonLength = prefix.readUInt32LE(12);
    const json = Buffer.alloc(jsonLength);
    readSync(fd, json, 0, jsonLength, 16);
    return { header: JSON.parse(json.toString("utf8")), dataStart: 8 + headerPickleSize };
  } finally {
    closeSync(fd);
  }
};

const findEntry = (header, path) => {
  let node = header;
  for (const part of path.split("/").filter(Boolean)) {
    node = node.files?.[part];
    if (!node) throw new Error(`not found in archive: ${path}`);
  }
  if (node.files || node.unpacked || node.offset === undefined) {
    throw new Error(`not a packed file: ${path}`);
  }
  return node;
};

const readEntry = (path, dataStart, entry) => {
  const fd = openSync(path, "r");
  try {
    const out = Buffer.alloc(entry.size);
    readSync(fd, out, 0, entry.size, dataStart + Number(entry.offset));
    return out;
  } finally {
    closeSync(fd);
  }
};

const integrityOf = (buffer) => {
  const blocks = [];
  for (let i = 0; i < buffer.length; i += BLOCK_SIZE) {
    blocks.push(createHash("sha256").update(buffer.subarray(i, i + BLOCK_SIZE)).digest("hex"));
  }
  return {
    algorithm: "SHA256",
    hash: createHash("sha256").update(buffer).digest("hex"),
    blockSize: BLOCK_SIZE,
    blocks,
  };
};

// Chromium Pickle layout: [u32 payloadSize][payload], payload = [u32 strLen][str][pad to 4].
const encodeHeader = (header) => {
  const json = Buffer.from(JSON.stringify(header), "utf8");
  const padded = Math.ceil((4 + json.length) / 4) * 4;
  const headerPickle = Buffer.alloc(4 + padded);
  headerPickle.writeUInt32LE(padded, 0);
  headerPickle.writeUInt32LE(json.length, 4);
  json.copy(headerPickle, 8);
  const sizePickle = Buffer.alloc(8);
  sizePickle.writeUInt32LE(4, 0);
  sizePickle.writeUInt32LE(headerPickle.length, 4);
  return Buffer.concat([sizePickle, headerPickle]);
};

// Every packed file path in the archive.
const listFiles = (node, prefix = "", out = []) => {
  for (const [name, child] of Object.entries(node.files ?? {})) {
    const path = prefix ? `${prefix}/${name}` : name;
    if (child.files) listFiles(child, path, out);
    else out.push({ path, entry: child });
  }
  return out;
};

// T3 builds differ between platforms and versions; when the expected path is missing, use the
// archive's UI page: a packed ".../client/index.html", the server's own first.
const resolveEntry = (header, path) => {
  try {
    return findEntry(header, path);
  } catch (error) {
    const pages = listFiles(header).filter((file) => file.path.endsWith("/index.html") && !file.path.includes("node_modules/"));
    const rank = (file) =>
      /server\/dist\/client\/index\.html$/.test(file.path) ? 0 : /(^|\/)client\/index\.html$/.test(file.path) ? 1 : /(^|\/)(web|renderer)\/dist\/index\.html$/.test(file.path) ? 2 : 9;
    const best = pages.filter((file) => rank(file) < 9 && !file.entry.unpacked && file.entry.offset !== undefined).sort((a, b) => rank(a) - rank(b))[0];
    if (best) {
      process.stderr.write(`note: using ${best.path}\n`);
      return best.entry;
    }
    const seen = pages.map((file) => `${file.path}${file.entry.unpacked ? " (unpacked)" : ""}`).slice(0, 20);
    throw new Error(`${error.message}. index.html files in this archive: ${seen.join(", ") || "none"}`);
  }
};

const { header, dataStart } = readHeader(archivePath);

if (command === "list") {
  for (const file of listFiles(header)) if (!file.path.includes("node_modules/")) console.log(file.path + (file.entry.unpacked ? "  (unpacked)" : ""));
  process.exit(0);
}

const entry = resolveEntry(header, innerPath);

if (command === "read") {
  // An output file avoids shells that re-encode piped bytes (Windows PowerShell 5.1).
  const content = readEntry(archivePath, dataStart, entry);
  if (sourcePath) writeFileSync(sourcePath, content);
  else process.stdout.write(content);
} else {
  const replacement = readFileSync(sourcePath);
  const dataLength = statSync(archivePath).size - dataStart;
  entry.offset = String(dataLength);
  entry.size = replacement.length;
  entry.integrity = integrityOf(replacement);

  const tmpPath = `${archivePath}.codex-skin.tmp`;
  const out = createWriteStream(tmpPath);
  out.write(encodeHeader(header));
  const data = createReadStream(archivePath, { start: dataStart });
  data.pipe(out, { end: false });
  await finished(data);
  out.end(replacement);
  await finished(out);
  renameSync(tmpPath, archivePath);
}
