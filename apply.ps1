# Apply the Codex skin to T3 Code on Windows. Safe to re-run.
#   powershell -ExecutionPolicy Bypass -File .\apply.ps1             (T3 must be closed)
#   powershell -ExecutionPolicy Bypass -File .\apply.ps1 -Restart    (closes T3, applies, reopens it)
#   ... -AppDir "C:\path\to\T3 Code"                                  (pick the install yourself)
param([switch]$Restart, [string]$AppDir)
. (Join-Path $PSScriptRoot 'lib/windows.ps1')

$app = Find-T3App -AppDir $AppDir
if (-not $app) { throw 'T3 Code not found. Pass its install folder: -AppDir "C:\...\T3 Code"' }
Write-Host "Found $($app.Name) $($app.Version) in $($app.Dir)"

$running = [bool](Get-T3Processes $app)
if ($running -and -not $Restart) {
  throw "$($app.Name) is running. Close it, or re-run with -Restart (running agents will stop)."
}

$work = Join-Path ([IO.Path]::GetTempPath()) ("codex-skin-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $work | Out-Null
try {
  $backupDir = Join-Path $SkinRoot "backups/$($app.Version)"
  $backup = Join-Path $backupDir 'app.asar'

  # An unskinned archive is the original: (re)take the backup from it, so the backup always
  # matches the installed build, even when two builds share a version number.
  if (-not (Test-Skinned $app $app.Asar)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Copy-Item -LiteralPath $app.Asar -Destination $backup -Force
    Write-Host "Backed up the original $(Split-Path -Leaf $app.Asar) for $($app.Version)"
    # Keep the 2 most recent version backups.
    Get-ChildItem (Join-Path $SkinRoot 'backups') -Directory | Sort-Object LastWriteTime -Descending |
      Select-Object -Skip 2 | Remove-Item -Recurse -Force
  }

  # Patch a copy of the original, so re-applying never stacks patches.
  $base = $app.Asar
  if (Test-Path $backup) { $base = $backup }
  $copy = Join-Path $work 'app.asar'
  Copy-Item -LiteralPath $base -Destination $copy

  $patcher = Join-Path $SkinRoot 'lib/patch-asar.mjs'
  Read-Inner $app $copy (Join-Path $work 'base.html')
  Invoke-SkinNode $app @((Join-Path $SkinRoot 'lib/build-html.mjs'), (Join-Path $work 'base.html'), (Join-Path $work 'patched.html'), (Join-Path $SkinRoot 'skin'))
  Invoke-SkinNode $app @($patcher, $copy, $Inner, 'write', (Join-Path $work 'patched.html'))
  if (-not (Test-Skinned $app $copy)) { throw 'Verification failed: skin not found after patching. Nothing was changed.' }

  if ($running) { Write-Host "Closing $($app.Name)..."; Stop-T3 $app }
  Set-Asar $app $copy
  Remove-Item (Join-Path $SkinRoot '.auto-apply-off') -Force -ErrorAction SilentlyContinue
  Remove-Item (Join-Path $SkinRoot '.auto-apply-failed'), (Join-Path $SkinRoot '.auto-apply-later') -Force -ErrorAction SilentlyContinue
  Write-Host "Codex skin applied to $($app.Name) $($app.Version)."
  if ($running) { Start-Process -FilePath $app.Exe; Write-Host "Reopened $($app.Name)." }
  # The updater agent exits after an update; bring it back if auto-apply is installed.
  if (Get-ScheduledTask -TaskName 'T3 Codex Skin auto-apply' -ErrorAction SilentlyContinue) {
    try { Start-SkinAgent $app } catch {}
  }
  else { Write-Host 'Open T3 Code to see it. Toggle the skin live with Ctrl+Alt+K.' }
} finally {
  Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue
}
