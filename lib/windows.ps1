# Shared helpers for the Windows scripts (dot-sourced). Windows PowerShell 5.1 compatible.
# Keep this file ASCII: PowerShell 5.1 reads BOM-less scripts in the system code page.

$ErrorActionPreference = 'Stop'
$script:SkinRoot = Split-Path -Parent $PSScriptRoot
$script:Inner = 'apps/server/dist/client/index.html'
$script:Marker = 'codex-skin:start'

# Finds the installed T3 Code: { Name, Dir, Exe, Asar, Version }. Prefers the Nightly build,
# like the macOS scripts. Pass -AppDir to pick an install folder yourself.
function Find-T3App {
  param([string]$AppDir)
  $dirs = @()
  if ($AppDir) {
    $dirs += $AppDir
  } else {
    $roots = @("$env:LOCALAPPDATA\Programs", $env:LOCALAPPDATA, $env:ProgramFiles, ${env:ProgramFiles(x86)}) | Where-Object { $_ -and (Test-Path $_) }
    foreach ($root in $roots) {
      $dirs += Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like 'T3*' -or $_.Name -like 't3code*' } |
        ForEach-Object { $_.FullName }
    }
  }
  $found = @()
  foreach ($dir in $dirs) {
    $appDir = $null
    if (Test-Path (Join-Path $dir 'resources/app.asar')) {
      $appDir = $dir
    } else {
      # Squirrel.Windows layout: <dir>\app-1.2.3\resources\app.asar, newest wins.
      $latest = Get-ChildItem -Path $dir -Directory -Filter 'app-*' -ErrorAction SilentlyContinue |
        Where-Object { Test-Path (Join-Path $_.FullName 'resources/app.asar') } |
        Sort-Object { try { [version]($_.Name -replace '^app-', '' -replace '[^0-9.].*$', '') } catch { [version]'0.0' } } -Descending |
        Select-Object -First 1
      if ($latest) { $appDir = $latest.FullName }
    }
    if (-not $appDir) { continue }
    $exe = Get-ChildItem -Path $appDir -Filter '*.exe' -File |
      Where-Object { $_.Name -notmatch '^(Uninstall|Update|elevate|squirrel|crashpad)' } |
      Sort-Object { if ($_.Name -like 'T3*') { 0 } else { 1 } } |
      Select-Object -First 1
    if (-not $exe) { continue }
    $version = $exe.VersionInfo.ProductVersion
    if (-not $version) { $version = $exe.VersionInfo.FileVersion }
    if (-not $version) { $version = 'unknown' }
    $found += [pscustomobject]@{
      Name    = [IO.Path]::GetFileNameWithoutExtension($exe.Name)
      Dir     = $appDir
      Exe     = $exe.FullName
      Asar    = Join-Path $appDir 'resources/app.asar'
      Version = ($version -replace '[^0-9A-Za-z.\-]', '_')
    }
  }
  $found | Sort-Object { if ($_.Name -like '*Nightly*') { 0 } else { 1 } } | Select-Object -First 1
}

# Runs one of the skin's Node scripts: system node if installed, else T3's own Electron
# binary in Node mode (ELECTRON_NO_ASAR lets it read app.asar as a plain file).
function Invoke-SkinNode {
  param($App, [string[]]$Arguments)
  $node = Get-Command node -ErrorAction SilentlyContinue
  $quoted = ($Arguments | ForEach-Object { '"' + $_ + '"' }) -join ' '
  $err = [IO.Path]::GetTempFileName()
  try {
    if ($node) {
      $p = Start-Process -FilePath $node.Source -ArgumentList $quoted -Wait -PassThru -NoNewWindow -RedirectStandardError $err
    } else {
      $env:ELECTRON_RUN_AS_NODE = '1'
      $env:ELECTRON_NO_ASAR = '1'
      try {
        $p = Start-Process -FilePath $App.Exe -ArgumentList $quoted -Wait -PassThru -NoNewWindow -RedirectStandardError $err
      } finally {
        Remove-Item Env:ELECTRON_RUN_AS_NODE, Env:ELECTRON_NO_ASAR -ErrorAction SilentlyContinue
      }
    }
    if ($p.ExitCode -ne 0) {
      throw "Node step failed ($($Arguments[0])): $((Get-Content $err -Raw))"
    }
  } finally {
    Remove-Item $err -ErrorAction SilentlyContinue
  }
}

function Read-Inner {
  param($App, [string]$Asar, [string]$Out)
  Invoke-SkinNode $App @((Join-Path $script:SkinRoot 'lib/patch-asar.mjs'), $Asar, $script:Inner, 'read', $Out)
}

function Test-Skinned {
  param($App, [string]$Asar)
  $tmp = [IO.Path]::GetTempFileName()
  try {
    Read-Inner $App $Asar $tmp
    return [bool](Select-String -Path $tmp -SimpleMatch $script:Marker -Quiet)
  } finally {
    Remove-Item $tmp -ErrorAction SilentlyContinue
  }
}

function Get-T3Processes {
  param($App)
  Get-Process -ErrorAction SilentlyContinue | Where-Object {
    try { $_.Path -and $_.Path.StartsWith($App.Dir, [StringComparison]::OrdinalIgnoreCase) } catch { $false }
  }
}

# Closes T3 politely (like clicking the close button), then whatever is left.
function Stop-T3 {
  param($App)
  foreach ($p in (Get-T3Processes $App)) { if ($p.MainWindowHandle -ne 0) { [void]$p.CloseMainWindow() } }
  for ($i = 0; $i -lt 30 -and (Get-T3Processes $App); $i++) { Start-Sleep -Milliseconds 500 }
  Get-T3Processes $App | Stop-Process -Force -ErrorAction SilentlyContinue
  for ($i = 0; $i -lt 20 -and (Get-T3Processes $App); $i++) { Start-Sleep -Milliseconds 250 }
}

# Swaps in a new app.asar. Windows won't replace a file the running app holds open, and
# rewriting it in place would break the running app, so T3 must be closed first.
function Set-Asar {
  param($App, [string]$Source)
  if (Get-T3Processes $App) { throw 'T3 Code is running. Close it first, or run with -Restart.' }
  $tmp = "$($App.Asar).codex-skin.tmp"
  Copy-Item -LiteralPath $Source -Destination $tmp -Force
  try {
    [IO.File]::Replace($tmp, $App.Asar, $null)
  } catch {
    Remove-Item -LiteralPath $App.Asar -Force
    Move-Item -LiteralPath $tmp -Destination $App.Asar
  }
}
