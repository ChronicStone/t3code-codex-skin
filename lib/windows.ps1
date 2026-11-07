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
    # Nightlies share one file version (0.1.8.0), so the build date tells builds apart.
    $version = '{0}-{1:yyyyMMddHHmm}' -f $version, $exe.LastWriteTime
    # Windows builds ship the UI (the server and its web client) in server.asar; app.asar only
    # holds the window shell. macOS builds keep everything in app.asar.
    $asar = Join-Path $appDir 'resources/server.asar'
    if (-not (Test-Path $asar)) { $asar = Join-Path $appDir 'resources/app.asar' }
    $found += [pscustomobject]@{
      Name    = [IO.Path]::GetFileNameWithoutExtension($exe.Name)
      Dir     = $appDir
      Exe     = $exe.FullName
      Asar    = $asar
      Version = ($version -replace '[^0-9A-Za-z.\-]', '_')
    }
  }
  $found | Sort-Object { if ($_.Name -like '*Nightly*') { 0 } else { 1 } } | Select-Object -First 1
}

# Runs one of the skin's Node scripts: system node if installed, else T3's own Electron
# binary in Node mode (ELECTRON_NO_ASAR lets it read app.asar as a plain file).
function Invoke-SkinNode {
  param($App, [string[]]$Arguments, [string]$OutFile)
  $node = Get-Command node -ErrorAction SilentlyContinue
  $quoted = ($Arguments | ForEach-Object { '"' + $_ + '"' }) -join ' '
  $err = [IO.Path]::GetTempFileName()
  $extra = @{}
  if ($OutFile) { $extra.RedirectStandardOutput = $OutFile }
  try {
    if ($node) {
      $p = Start-Process -FilePath $node.Source -ArgumentList $quoted -Wait -PassThru -NoNewWindow -RedirectStandardError $err @extra
    } else {
      $env:ELECTRON_RUN_AS_NODE = '1'
      $env:ELECTRON_NO_ASAR = '1'
      try {
        $p = Start-Process -FilePath $App.Exe -ArgumentList $quoted -Wait -PassThru -NoNewWindow -RedirectStandardError $err @extra
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

# Revision of the skin files (lib/skin-config.mjs); applied pages carry the one they were built from.
function Get-SkinRev {
  param($App)
  $out = [IO.Path]::GetTempFileName()
  try {
    Invoke-SkinNode $App @((Join-Path $script:SkinRoot 'lib/skin-config.mjs'), 'rev') -OutFile $out
    return (Get-Content $out -Raw).Trim()
  } finally {
    Remove-Item $out -ErrorAction SilentlyContinue
  }
}

# True when the installed skin was built from the current skin files.
function Test-SkinCurrent {
  param($App, [string]$Asar)
  $tmp = [IO.Path]::GetTempFileName()
  try {
    Read-Inner $App $Asar $tmp
    $rev = Get-SkinRev $App
    return [bool]($rev -and (Select-String -Path $tmp -SimpleMatch "codex-skin:rev $rev" -Quiet))
  } finally {
    Remove-Item $tmp -ErrorAction SilentlyContinue
  }
}

# The updater agent behind the skin's rail button (lib/agent.mjs, port 47391). Starts it hidden
# unless it already answers.
$script:AgentPort = 47391
function Test-SkinAgent {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $wait = $client.BeginConnect('127.0.0.1', $script:AgentPort, $null, $null)
    return ($wait.AsyncWaitHandle.WaitOne(500) -and $client.Connected)
  } catch { return $false } finally { $client.Close() }
}

function Start-SkinAgent {
  param($App)
  if (Test-SkinAgent) { return }
  $script = Join-Path $script:SkinRoot 'lib/agent.mjs'
  $log = Join-Path $script:SkinRoot 'agent.log'
  $node = Get-Command node -ErrorAction SilentlyContinue
  if ($node) {
    Start-Process -FilePath $node.Source -ArgumentList ('"' + $script + '"') -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError "$log.err" | Out-Null
  } elseif ($App) {
    $env:ELECTRON_RUN_AS_NODE = '1'
    $env:ELECTRON_NO_ASAR = '1'
    try {
      Start-Process -FilePath $App.Exe -ArgumentList ('"' + $script + '"') -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError "$log.err" | Out-Null
    } finally {
      Remove-Item Env:ELECTRON_RUN_AS_NODE, Env:ELECTRON_NO_ASAR -ErrorAction SilentlyContinue
    }
  }
}

function Stop-SkinAgent {
  $pidFile = Join-Path $script:SkinRoot '.agent-pid'
  if (-not (Test-Path $pidFile)) { return }
  $agentPid = 0
  if ([int]::TryParse((Get-Content $pidFile -Raw).Trim(), [ref]$agentPid)) {
    Stop-Process -Id $agentPid -Force -ErrorAction SilentlyContinue
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
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
  # The updater agent may run on T3's own exe (when there is no system node); it isn't T3.
  $agentPid = -1
  $pidFile = Join-Path $script:SkinRoot '.agent-pid'
  if (Test-Path $pidFile) { [void][int]::TryParse((Get-Content $pidFile -Raw).Trim(), [ref]$agentPid) }
  Get-Process -ErrorAction SilentlyContinue | Where-Object {
    try { $_.Id -ne $agentPid -and $_.Path -and $_.Path.StartsWith($App.Dir, [StringComparison]::OrdinalIgnoreCase) } catch { $false }
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
