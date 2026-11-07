#!/bin/sh
# macOS: start the skin updater agent (lib/agent.mjs) with whatever Node is around: a system
# node, else T3's own Electron in Node mode. Run by the LaunchAgent install-auto-apply.sh sets up.
here="$(cd "$(dirname "$0")" && pwd)"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if command -v node >/dev/null 2>&1; then exec node "$here/agent.mjs"; fi
for app in "/Applications/T3 Code (Nightly).app" "/Applications/T3 Code.app"; do
  [ -d "$app" ] || continue
  bin="$(ls "$app/Contents/MacOS/" | head -n 1)"
  ELECTRON_RUN_AS_NODE=1 ELECTRON_NO_ASAR=1 exec "$app/Contents/MacOS/$bin" "$here/agent.mjs"
done
echo "No node and no T3 Code found." >&2
exit 1
