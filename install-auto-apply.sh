#!/bin/sh
# macOS: re-apply the skin automatically after every T3 Code update.
# Installs a LaunchAgent that runs auto-apply.sh at login, whenever the app bundle changes,
# and every 5 minutes (a no-op while the skin is in place), plus the small updater agent behind
# the skin's "Codex skin" rail button (checks for skin updates, pulls, applies, restarts T3).
#   ./install-auto-apply.sh            install or update
#   ./install-auto-apply.sh --uninstall remove it
#
# It runs through a tiny helper app, "Codex Skin Updater.app", because macOS only lets an app
# you approved under System Settings > Privacy & Security > App Management modify another app.
set -eu

here="$(cd "$(dirname "$0")" && pwd)"
label="dev.t3-codex-skin.auto-apply"
plist="$HOME/Library/LaunchAgents/$label.plist"
agent_label="dev.t3-codex-skin.agent"
agent_plist="$HOME/Library/LaunchAgents/$agent_label.plist"
helper="$here/Codex Skin Updater.app"
uid="$(id -u)"

# Earlier versions of this setup used another label.
for old in "$HOME"/Library/LaunchAgents/com.*.codex-skin.plist; do
  [ -f "$old" ] || continue
  launchctl bootout "gui/$uid/$(basename "$old" .plist)" 2>/dev/null || true
  rm -f "$old"
done

if [ "${1:-}" = "--uninstall" ]; then
  launchctl bootout "gui/$uid/$label" 2>/dev/null || true
  launchctl bootout "gui/$uid/$agent_label" 2>/dev/null || true
  rm -f "$plist" "$agent_plist"
  echo "Auto-apply removed. (The helper app stays in $here; delete it if you like.)"
  exit 0
fi

# The helper app. Built once and then left alone: rebuilding it changes its signature and
# macOS forgets the App Management approval.
if [ ! -d "$helper" ]; then
  osacompile -o "$helper" -e "do shell script \"/bin/sh '$here/auto-apply.sh' >> '$here/auto-apply.log' 2>&1\""
  /usr/libexec/PlistBuddy -c 'Add :LSUIElement bool true' "$helper/Contents/Info.plist"
  /usr/libexec/PlistBuddy -c 'Add :CFBundleIdentifier string dev.t3-codex-skin.updater' "$helper/Contents/Info.plist" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c 'Set :CFBundleIdentifier dev.t3-codex-skin.updater' "$helper/Contents/Info.plist"
  codesign --force --sign - "$helper" >/dev/null 2>&1
  new_helper=1
else
  new_helper=0
fi

# Watch every installed T3 build.
watch=""
for app in "/Applications/T3 Code (Nightly).app" "/Applications/T3 Code.app"; do
  [ -d "$app" ] || continue
  watch="$watch    <string>$app/Contents/Info.plist</string>
    <string>$app/Contents/Resources/app.asar</string>
"
done
if [ -z "$watch" ]; then
  echo "T3 Code isn't in /Applications. Install it first." >&2
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents"
cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$label</string>
  <key>ProgramArguments</key><array><string>$helper/Contents/MacOS/applet</string></array>
  <key>WatchPaths</key><array>
$watch  </array>
  <key>RunAtLoad</key><true/>
  <key>StartInterval</key><integer>300</integer>
</dict></plist>
EOF
plutil -lint "$plist" >/dev/null

launchctl bootout "gui/$uid/$label" 2>/dev/null || true
launchctl bootstrap "gui/$uid" "$plist"
echo "Auto-apply installed ($label)."

cat > "$agent_plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$agent_label</string>
  <key>ProgramArguments</key><array><string>/bin/sh</string><string>$here/lib/agent.sh</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$here/agent.log</string>
  <key>StandardErrorPath</key><string>$here/agent.log</string>
</dict></plist>
EOF
plutil -lint "$agent_plist" >/dev/null
launchctl bootout "gui/$uid/$agent_label" 2>/dev/null || true
launchctl bootstrap "gui/$uid" "$agent_plist"
echo "Updater agent installed ($agent_label, http://127.0.0.1:47391)."

if [ "$new_helper" = 1 ]; then
  echo
  echo "One manual step: allow the helper to update T3 Code."
  echo "  System Settings > Privacy & Security > App Management > + > choose"
  echo "  $helper"
  echo "  (Cmd+Shift+G in the file picker and paste that path), then switch it on."
  open "x-apple.systempreferences:com.apple.preference.security?Privacy_AppBundles" 2>/dev/null || true
  open -R "$helper" 2>/dev/null || true
fi
echo "Log: $here/auto-apply.log"
