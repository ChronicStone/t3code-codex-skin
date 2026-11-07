# Remove the Codex skin from T3 Code on Windows, and pause auto-apply (apply.ps1 resumes it).
#   powershell -ExecutionPolicy Bypass -File .\restore.ps1 [-Restart] [-AppDir "C:\...\T3 Code"]
param([switch]$Restart, [string]$AppDir)
. (Join-Path $PSScriptRoot 'lib/windows.ps1')

$app = Find-T3App -AppDir $AppDir
if (-not $app) { throw 'T3 Code not found. Pass its install folder: -AppDir "C:\...\T3 Code"' }

$running = [bool](Get-T3Processes $app)
if ($running -and -not $Restart) {
  throw "$($app.Name) is running. Close it, or re-run with -Restart (running agents will stop)."
}

$backup = Join-Path $SkinRoot "backups/$($app.Version)/app.asar"
$work = Join-Path ([IO.Path]::GetTempPath()) ("codex-skin-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $work | Out-Null
try {
  if (Test-Path $backup) {
    $source = $backup
  } elseif (Test-Skinned $app $app.Asar) {
    # No backup for this version: strip the skin block out of a copy.
    $source = Join-Path $work 'app.asar'
    Copy-Item -LiteralPath $app.Asar -Destination $source
    Read-Inner $app $source (Join-Path $work 'current.html')
    Invoke-SkinNode $app @((Join-Path $SkinRoot 'lib/build-html.mjs'), (Join-Path $work 'current.html'), (Join-Path $work 'clean.html'), '--strip')
    Invoke-SkinNode $app @((Join-Path $SkinRoot 'lib/patch-asar.mjs'), $source, $Inner, 'write', (Join-Path $work 'clean.html'))
  } else {
    Write-Host "No skin installed in $($app.Version); nothing to do."
    exit 0
  }
  if ($running) { Write-Host "Closing $($app.Name)..."; Stop-T3 $app }
  Set-Asar $app $source
  New-Item -ItemType File -Path (Join-Path $SkinRoot '.auto-apply-off') -Force | Out-Null
  Write-Host "Removed the skin from $($app.Name) $($app.Version). Auto-apply is paused until you run apply.ps1."
  if ($running) { Start-Process -FilePath $app.Exe }
} finally {
  Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue
}
