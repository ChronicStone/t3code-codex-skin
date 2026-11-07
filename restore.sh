#!/bin/sh
# Remove the Codex skin from T3 Code.
#   ./restore.sh                      auto-detects T3 Code (Nightly) or T3 Code
#   ./restore.sh "/path/to/T3 Code.app"
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
  echo "T3 Code app not found. Pass its path: ./restore.sh \"/Applications/T3 Code.app\"" >&2
  exit 1
fi

asar="$app/Contents/Resources/app.asar"
# Some builds ship the UI (server + web client) in its own server.asar.
[ -f "$app/Contents/Resources/server.asar" ] && asar="$app/Contents/Resources/server.asar"
version="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$app/Contents/Info.plist")"
backup="$here/backups/$version/app.asar"

if [ -f "$backup" ]; then
  cp "$backup" "$asar.codex-skin.tmp"
  mv "$asar.codex-skin.tmp" "$asar"
  echo "Restored the original app.asar for $version."
else
  if command -v node >/dev/null 2>&1; then
    run_node() { node "$@"; }
  else
    bin="$(ls "$app/Contents/MacOS/" | head -n 1)"
    run_node() { ELECTRON_RUN_AS_NODE=1 ELECTRON_NO_ASAR=1 "$app/Contents/MacOS/$bin" "$@"; }
  fi
  work="$(mktemp -d)"
  trap 'rm -rf "$work"' EXIT
  run_node "$here/lib/patch-asar.mjs" "$asar" "$inner" read > "$work/current.html"
  if ! grep -q "codex-skin:start" "$work/current.html"; then
    echo "No skin installed in $version; nothing to do."
    exit 0
  fi
  run_node "$here/lib/build-html.mjs" "$work/current.html" "$work/clean.html" --strip
  run_node "$here/lib/patch-asar.mjs" "$asar" "$inner" write "$work/clean.html"
  echo "Removed the skin from $version (no backup for this version, so it was stripped in place)."
fi

touch "$here/.auto-apply-off"  # stop the LaunchAgent from re-applying; apply.sh turns it back on
echo "Restart T3 Code to see the change."
