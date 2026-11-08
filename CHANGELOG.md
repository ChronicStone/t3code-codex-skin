# Changelog

Every release of the Codex skin, newest first. Versions follow [semantic versioning](https://semver.org):
a **patch** (1.4.1) fixes something, a **minor** (1.5.0) adds something, and a **major** (2.0.0) needs you
to do something by hand, such as re-running the setup.

The skin's menu (the palette button at the bottom of the rail) shows the version you run, and the
entries below when an update is waiting.

## 1.4.0 (2026-11-08)

- **Versions and changelog**: the skin now has a version number and this changelog. The skin menu
  shows the version you run and, when an update is waiting, its version and what's new in it.

## 1.3.0 (2026-11-08)

- **Stop & steer** (macOS): a message steered into a running turn waits for the current command to
  end. The new button next to its "Steer" label stops that shell command, so your message lands now
  and the turn goes on. Jobs started detached keep running.

## 1.2.0 (2026-11-08)

- **Skin updates from the rail**: a palette button at the bottom of the rail shows whether the skin
  is up to date, and "Update & restart" pulls the new version, applies it and restarts T3 Code.
- **Working threads**: the list of running threads opens them in the desktop app too.

## 1.1.2 (2026-11-07)

- **Dark mode fixes**: the rail's shadow follows the panel's rounded corners, the collapsed rail has
  no stray line, and the working badges are smaller.

## 1.1.1 (2026-11-07)

- **Windows fixes**: the skin is applied where Windows builds keep the UI, and backups always match
  the installed build, since nightlies share a version number.
- **Windows diagnostics**: `diagnose.ps1` prints what the scripts see.

## 1.1.0 (2026-11-07)

- **Codex depth**: one raised card with Codex's measured edge and shadow, and hairline panel edges
  on Retina screens.
- **Title bar**: the logo sits right after the sidebar toggle.
- **Windows**: T3's UI page is found in any build.

## 1.0.0 (2026-11-07)

- **First release**: the Codex look for T3 Code on macOS and Windows, with apply, restore, and
  auto-apply after every T3 Code update.
