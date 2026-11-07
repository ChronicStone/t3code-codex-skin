#!/bin/sh
# Apply the Codex skin to T3 Code. Safe to re-run; run it again after every T3 update.
#   ./apply.sh                      auto-detects T3 Code (Nightly) or T3 Code
#   ./apply.sh "/path/to/T3 Code.app"
set -eu

here="$(cd "$(dirname "$0")" && pwd)"
inner="apps/server/dist/client/index.html"

app="${1:-}"
if [ -z "$app" ]; then
  for candidate in "/Applications/T3 Code (Nightly).app" "/Applications/T3 Code.app"; do
    if [ -d "$candidate" ]; then app="$candidate"; break; fi
  done
fi
if [ -z "$app" ] || [ ! -d "$app" ]; then
  echo "T3 Code app not found. Pass its path: ./apply.sh \"/Applications/T3 Code.app\"" >&2
  exit 1
fi

asar="$app/Contents/Resources/app.asar"
version="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$app/Contents/Info.plist")"

# Prefer system node; fall back to T3's bundled Electron in node mode.
if command -v node >/dev/null 2>&1; then
  run_node() { node "$@"; }
else
  bin="$(ls "$app/Contents/MacOS/" | head -n 1)"
  run_node() { ELECTRON_RUN_AS_NODE=1 ELECTRON_NO_ASAR=1 "$app/Contents/MacOS/$bin" "$@"; }
fi

if ! touch "$app/Contents/Resources/.codex-skin-write-test" 2>/dev/null; then
  echo "Cannot write inside $app." >&2
  echo "Give your terminal 'App Management' access: System Settings > Privacy & Security > App Management." >&2
  exit 1
fi
rm -f "$app/Contents/Resources/.codex-skin-write-test"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

run_node "$here/lib/patch-asar.mjs" "$asar" "$inner" read > "$work/current.html"

# Back up the pristine archive once per version (only while it is still unpatched).
backup_dir="$here/backups/$version"
if ! grep -q "codex-skin:start" "$work/current.html" && [ ! -f "$backup_dir/app.asar" ]; then
  mkdir -p "$backup_dir"
  cp "$asar" "$backup_dir/app.asar"
  echo "Backed up original app.asar for $version"
  # Keep only the 2 most recent version backups.
  ls -1t "$here/backups" | tail -n +3 | while read -r old; do rm -rf "$here/backups/$old"; done
fi

# Patch a copy of the pristine archive, so re-applying never stacks patches or grows the file.
base="$asar"
[ -f "$backup_dir/app.asar" ] && base="$backup_dir/app.asar"
cp "$base" "$work/app.asar"

run_node "$here/lib/patch-asar.mjs" "$work/app.asar" "$inner" read > "$work/base.html"
run_node "$here/lib/build-html.mjs" "$work/base.html" "$work/patched.html" "$here/skin"
run_node "$here/lib/patch-asar.mjs" "$work/app.asar" "$inner" write "$work/patched.html"


run_node "$here/lib/patch-asar.mjs" "$work/app.asar" "$inner" read > "$work/check.html"
if ! grep -q "codex-skin:start" "$work/check.html"; then
  echo "Verification failed: skin not found after patching. Nothing was changed." >&2
  exit 1
fi
cp "$work/app.asar" "$asar.codex-skin.tmp"
mv "$asar.codex-skin.tmp" "$asar"

rm -f "$here/.auto-apply-off" "$here/.auto-apply-failed"
echo "Codex skin applied to $(basename "$app") $version."
echo "Restart T3 Code to see it. Toggle the skin live with Ctrl+Alt+K."
