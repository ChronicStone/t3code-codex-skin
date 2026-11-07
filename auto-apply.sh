#!/bin/sh
# Keep the Codex skin in place. Run by the LaunchAgent install-auto-apply.sh sets up (on login,
# when the app bundle changes, and every 5 minutes), through the "Codex Skin Updater" helper app,
# the one process allowed to modify T3 (App Management). Cheap no-op when nothing changed.
#   - T3 updated and lost the skin: re-apply, then offer to restart T3.
#   - The skin files changed (git pull, local edits): re-apply quietly; it shows at the next restart.
#   - The skin's "Update & restart" button (via lib/agent.mjs) left .restart-requested: re-apply
#     if needed, then restart T3 without asking.
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
# Some builds ship the UI (server + web client) in its own server.asar.
[ -f "$app/Contents/Resources/server.asar" ] && asar="$app/Contents/Resources/server.asar"
[ -f "$asar" ] || exit 0

requested=0
if [ -f "$here/.restart-requested" ]; then
  requested=1
  rm -f "$here/.restart-requested"
fi

# Opted out: restore.sh was run on purpose (the rail button overrides it).
[ -f "$here/.auto-apply-off" ] && [ "$requested" = 0 ] && exit 0

# Let the updater finish swapping the bundle first.
i=0
while pgrep -q ShipIt && [ $i -lt 60 ]; do sleep 2; i=$((i + 1)); done
[ "$requested" = 0 ] && sleep 3

bin="$(ls "$app/Contents/MacOS/" | head -n 1)"
run_node() { ELECTRON_RUN_AS_NODE=1 ELECTRON_NO_ASAR=1 "$app/Contents/MacOS/$bin" "$@"; }
name="$(basename "$app" .app)"
t3_running() { ps -axo command= | grep -qF "$app/Contents/MacOS/"; }

restart_t3() {
  log "Restarting $name."
  osascript -e "tell application \"$name\" to quit" >/dev/null 2>&1
  i=0
  while t3_running && [ $i -lt 30 ]; do sleep 1; i=$((i + 1)); done
  open "$app"
}

current="$(run_node "$here/lib/patch-asar.mjs" "$asar" "$inner" read 2>/dev/null)"
want="$(run_node "$here/lib/skin-config.mjs" rev 2>/dev/null)"
if printf '%s' "$current" | grep -q "codex-skin:start"; then
  if [ -n "$want" ] && printf '%s' "$current" | grep -qF "codex-skin:rev $want"; then
    [ "$requested" = 1 ] && t3_running && restart_t3
    exit 0
  fi
  reason="skin"
else
  reason="t3"
fi

version="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$app/Contents/Info.plist")"
stamp="$version $want"
# Already failed on this version and skin: don't retry (and re-notify) every 5 minutes.
[ "$requested" = 0 ] && [ "$(cat "$here/.auto-apply-failed" 2>/dev/null)" = "$stamp" ] && exit 0
if [ "$reason" = "t3" ]; then log "Skin missing in $version, applying."; else log "Skin changed ($want), applying."; fi
if ! "$here/apply.sh" "$app"; then
  log "apply.sh failed."
  echo "$stamp" > "$here/.auto-apply-failed"
  osascript -e "display notification \"Could not apply the skin to $version. See ~/.t3/codex-skin/auto-apply.log\" with title \"Codex skin\"" >/dev/null 2>&1
  exit 0  # non-zero makes the applet show an error dialog
fi

t3_running || exit 0
if [ "$requested" = 1 ]; then
  restart_t3
elif [ "$reason" = "t3" ]; then
  answer="$(osascript -e "button returned of (display dialog \"T3 Code updated to $version and the Codex skin was re-applied. Restart T3 Code now to see it? Running agents will stop.\" with title \"Codex skin\" buttons {\"Later\", \"Restart\"} default button \"Restart\" giving up after 600)" 2>/dev/null)"
  if [ "$answer" = "Restart" ]; then restart_t3; else log "Restart postponed."; fi
else
  log "Skin updated; it shows at the next T3 restart."
fi
