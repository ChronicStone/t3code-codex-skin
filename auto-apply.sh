#!/bin/sh
# Re-apply the Codex skin when a T3 Code update removes it. Run by the LaunchAgent
# LaunchAgent that install-auto-apply.sh sets up (on login, when the app bundle
# changes, and every 5 minutes as a fallback). Cheap no-op when the skin is in place.
set -u

here="$(cd "$(dirname "$0")" && pwd)"
inner="apps/server/dist/client/index.html"
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*"; }

app=""
for candidate in "/Applications/T3 Code (Nightly).app" "/Applications/T3 Code.app"; do
  if [ -d "$candidate" ]; then app="$candidate"; break; fi
done
[ -n "$app" ] || exit 0
asar="$app/Contents/Resources/app.asar"
[ -f "$asar" ] || exit 0

# Opted out: restore.sh was run on purpose.
[ -f "$here/.auto-apply-off" ] && exit 0

# Let the updater finish swapping the bundle first.
i=0
while pgrep -q ShipIt && [ $i -lt 60 ]; do sleep 2; i=$((i + 1)); done
sleep 3

bin="$(ls "$app/Contents/MacOS/" | head -n 1)"
run_node() { ELECTRON_RUN_AS_NODE=1 ELECTRON_NO_ASAR=1 "$app/Contents/MacOS/$bin" "$@"; }

if run_node "$here/lib/patch-asar.mjs" "$asar" "$inner" read 2>/dev/null | grep -q "codex-skin:start"; then
  exit 0
fi

version="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$app/Contents/Info.plist")"
# Already failed on this version: don't retry (and re-notify) every 5 minutes.
[ "$(cat "$here/.auto-apply-failed" 2>/dev/null)" = "$version" ] && exit 0
log "Skin missing in $version, applying."
if ! "$here/apply.sh" "$app"; then
  log "apply.sh failed."
  echo "$version" > "$here/.auto-apply-failed"
  osascript -e "display notification \"Could not re-apply the skin to $version. See ~/.t3/codex-skin/auto-apply.log\" with title \"Codex skin\"" >/dev/null 2>&1
  exit 0  # non-zero makes the applet show an error dialog
fi

name="$(basename "$app" .app)"
if ps -axo command= | grep -qF "$app/Contents/MacOS/"; then
  answer="$(osascript -e "button returned of (display dialog \"T3 Code updated to $version and the Codex skin was re-applied. Restart T3 Code now to see it? Running agents will stop.\" with title \"Codex skin\" buttons {\"Later\", \"Restart\"} default button \"Restart\" giving up after 600)" 2>/dev/null)"
  if [ "$answer" = "Restart" ]; then
    log "Restarting $name."
    osascript -e "tell application \"$name\" to quit" >/dev/null 2>&1
    i=0
    while ps -axo command= | grep -qF "$app/Contents/MacOS/" && [ $i -lt 30 ]; do sleep 1; i=$((i + 1)); done
    open "$app"
  else
    log "Restart postponed."
  fi
fi
