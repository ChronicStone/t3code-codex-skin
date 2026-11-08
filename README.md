# Codex skin for T3 Code

Makes [T3 Code](https://github.com/pingdotgg/t3code) look and feel like the Codex desktop app, in light and dark, without forking it. Works on **macOS** and **Windows**, and re-applies itself after every T3 Code update.

What it changes:

- **Codex palette and spacing**: neutral surfaces, Codex's measured row and composer tones, its blue for links and focus, and one soft lilac highlight for work in progress and the selected project.
- **Project rail** on the left edge: every project, pinned ones first. Click to filter the sidebar to that project and open its last thread. Drag to reorder or pin, and right-click for more.
- **Working threads**: a spinning badge with a count on each busy project, and one at the bottom of the rail that opens a list of every running thread.
- **New thread / New chat** opens straight in the project you're in, with no picker.
- **Stop & steer** (macOS): a message steered into a running turn waits for the current command to end. The button next to its "Steer" label stops that shell command, so your message lands now and the turn goes on. Jobs started detached keep running.
- Many smaller fixes: quieter composer chips, flat thread rows, and a collapsed sidebar that stays clean.

**Ctrl+Alt+K** turns the skin on and off live.

## How it works

T3 Code serves its UI from `index.html` inside the app's `app.asar` archive. `apply` inlines `skin/codex.css` and `skin/codex.js` into that one file:

- The new copy of the file is appended to the archive and the archive's index is pointed at it. Every other file stays byte-identical.
- The original archive is backed up once per T3 version, under `backups/<version>/`, and the last 2 versions are kept.
- `restore` puts the original back.

An update replaces the whole app, which removes the skin. The auto-apply job below puts it back.

No Node install needed: the scripts use your `node` if you have one, otherwise T3 Code's own runtime.

## Setup on macOS

```sh
git clone https://github.com/ChronicStone/t3code-codex-skin.git ~/.t3/codex-skin
cd ~/.t3/codex-skin
./apply.sh                 # then restart T3 Code
./install-auto-apply.sh    # re-apply after every update (one manual step, below)
```

**The one manual step**: macOS only lets apps you approve modify other apps. `install-auto-apply.sh` builds a small helper, `Codex Skin Updater.app`, opens the right Settings page and shows you the helper in Finder:

1. In System Settings, open **Privacy & Security > App Management**.
2. Drag **Codex Skin Updater** into the list, or click **+** and pick it.
3. Switch it on.

From then on, each update is followed within seconds by a "T3 Code updated… Restart now?" prompt. Choose **Restart** to see the skin right away, or **Later** to see it at your next restart. The log is in `auto-apply.log`.

Two cautions:
- Don't delete or rebuild `Codex Skin Updater.app`. macOS ties the approval to that exact copy, so you would have to approve it again.
- If `apply.sh` says it can't write inside the app, give your terminal App Management access the same way.

## Setup on Windows

In PowerShell:

```powershell
git clone https://github.com/ChronicStone/t3code-codex-skin.git "$HOME\.t3\codex-skin"
cd "$HOME\.t3\codex-skin"
powershell -ExecutionPolicy Bypass -File .\apply.ps1 -Restart          # closes T3, applies, reopens it
powershell -ExecutionPolicy Bypass -File .\install-auto-apply.ps1      # re-apply after every update
```

- Windows won't let a script replace a file the running app has open, so applying needs T3 closed. `-Restart` closes T3 for you, applies the skin and reopens it. Running agents stop when T3 closes.
- `install-auto-apply.ps1` creates a Task Scheduler task, **T3 Codex Skin auto-apply**, that runs hidden at logon and every 5 minutes. It doesn't need admin rights.
  - If T3 is closed when an update has removed the skin, the task re-applies it silently.
  - If T3 is open, it asks once whether to restart T3 now. If you answer No, it asks again after 2 hours, or applies the skin silently at your next logon.
- The scripts find T3 in the usual places (`%LOCALAPPDATA%\Programs\T3 Code*`, Squirrel `app-*` folders, Program Files). If yours is elsewhere, pass `-AppDir "C:\path\to\T3 Code"`.
- The log is in `auto-apply.log`.

## Skin updates from inside T3

The palette button at the bottom of the rail, above Settings, shows the skin's version (for example "Version 1.4.0") and checks this repo for new commits. It gets a small lilac dot when an update is waiting, and the menu then shows the new version and what's new in it, from [`CHANGELOG.md`](CHANGELOG.md).

- **Update & restart** pulls the repo, applies the skin and restarts T3 Code.
- **Changelog** opens the full list of changes.
- **Check for updates** looks right away. Otherwise the button checks when T3 starts, then every 30 minutes.

A web page can't run git or restart an app, so the button talks to a small local helper, `lib/agent.mjs`. It listens on `127.0.0.1:47391` only and answers only the skin, which carries a per-machine secret from `.agent-token`. The `install-auto-apply` scripts start it: a second LaunchAgent on macOS, the existing scheduled task on Windows. On macOS, applying still goes through `Codex Skin Updater.app`, so you don't approve anything new. If the button says "Updater not running", run the `install-auto-apply` script again.

Auto-apply also picks up new skin files on its own, after a `git pull` or a local edit. On macOS it applies them quietly and they show at the next restart. On Windows it applies them the next time T3 is closed.

## Everyday commands

| | macOS | Windows |
|---|---|---|
| Apply / re-apply | `./apply.sh` | `.\apply.ps1 -Restart` |
| Remove the skin (pauses auto-apply) | `./restore.sh` | `.\restore.ps1 -Restart` |
| Remove auto-apply | `./install-auto-apply.sh --uninstall` | `.\install-auto-apply.ps1 -Uninstall` |
| Update the skin | Rail button > **Update & restart**, or `git pull && ./apply.sh` | Rail button > **Update & restart**, or `git pull; .\apply.ps1 -Restart` |

On Windows, run each `.ps1` as `powershell -ExecutionPolicy Bypass -File …`, as in the setup above. `restore` pauses auto-apply until you run `apply` again. If auto-apply fails on one version, it notifies you once and waits for the next update; run `apply` by hand to see the error.

## Customizing

- **Colors**: the `--cx-*` variables at the top of `skin/codex.css`, a light block then `.dark`.
  - `--cx-highlight` is the single accent for work in progress and the selected project.
  - `--cx-accent` is the blue for links and focus.
- **Behaviour**: `skin/codex.js`. The rail's layout is stored per machine in the browser storage (`codex-skin:*` keys), so pins and order don't sync between computers.
- **Live preview without restarting T3**: run `node lib/dev-proxy.mjs`, which serves T3 on `http://127.0.0.1:3774` with the current `skin/` files on every reload.
  1. Run `t3 pair --scope orchestration:read` to get a pairing token.
  2. In a browser, open `http://127.0.0.1:3774/pair#token=…` with that token.
  3. Reload after each edit.
- After editing, run `apply` again and restart T3 Code.

## Versions and releases

The version lives in `VERSION` and follows [semantic versioning](https://semver.org): a patch (1.4.1) fixes something, a minor (1.5.0) adds something, a major (2.0.0) needs a manual step from people who installed it. Every release has a section in [`CHANGELOG.md`](CHANGELOG.md), written for people who use the skin, and a `v1.4.0` tag with a GitHub release.

To release:

1. Bump `VERSION`, and add a `## 1.5.0 (YYYY-MM-DD)` section at the top of `CHANGELOG.md`, one `- **What**: what it does for you.` line per change.
2. Commit both with the change.
3. Run `node lib/release.mjs`. It checks the version against the changelog and the last tag, then tags, pushes, and creates the GitHub release. `--check` only checks.

## If something breaks

- **A T3 update changed its markup**: the skin may look off, but the app keeps working. Toggle the skin off with Ctrl+Alt+K, or run `restore`.
- **T3 won't start after applying**: run `restore`. It reinstalls the backed-up original for that version.

This is an unofficial theme. It isn't affiliated with T3 Code or OpenAI.

## License

MIT
