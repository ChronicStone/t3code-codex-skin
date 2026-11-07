# Windows: re-apply the skin when a T3 Code update removed it. Run hidden by the scheduled
# task that install-auto-apply.ps1 creates (at logon and every 5 minutes). A cheap no-op while
# the skin is in place.
#   - T3 closed: re-applies silently.
#   - T3 open: asks once per version whether to restart it now (running agents would stop).
#     "Later" is asked again after 2 hours, or applied silently at the next logon.
. (Join-Path $PSScriptRoot 'lib/windows.ps1')
$log = Join-Path $SkinRoot 'auto-apply.log'
function Write-Log([string]$m) { Add-Content -Path $log -Value ("{0:yyyy-MM-dd HH:mm:ss} {1}" -f (Get-Date), $m) }

try {
  if (Test-Path (Join-Path $SkinRoot '.auto-apply-off')) { exit 0 }
  $app = Find-T3App
  if (-not $app) { exit 0 }

  # Let an update finish installing first.
  for ($i = 0; $i -lt 60; $i++) {
    $installing = Get-Process -ErrorAction SilentlyContinue | Where-Object {
      try { $_.Path -and (($_.Path -like "$env:LOCALAPPDATA\*-updater\*") -or (($_.Path -like "$env:TEMP\*") -and ($_.Name -match 'setup|install|update'))) } catch { $false }
    }
    if (-not $installing) { break }
    Start-Sleep -Seconds 2
  }
  Start-Sleep -Seconds 3
  $app = Find-T3App
  if (-not $app -or (Test-Skinned $app $app.Asar)) { exit 0 }

  $failed = Join-Path $SkinRoot '.auto-apply-failed'
  if ((Test-Path $failed) -and (Get-Content $failed -Raw).Trim() -eq $app.Version) { exit 0 }

  $running = [bool](Get-T3Processes $app)
  if ($running) {
    $later = Join-Path $SkinRoot '.auto-apply-later'
    if ((Test-Path $later) -and ((Get-Content $later -Raw).Trim() -eq $app.Version) -and
        ((Get-Item $later).LastWriteTime -gt (Get-Date).AddHours(-2))) { exit 0 }
    Add-Type -AssemblyName System.Windows.Forms
    $owner = New-Object System.Windows.Forms.Form -Property @{ TopMost = $true }
    $answer = [System.Windows.Forms.MessageBox]::Show($owner,
      "T3 Code updated to $($app.Version) and lost the Codex skin.`n`nRestart T3 Code now to put it back? Running agents will stop.",
      'Codex skin', 'YesNo', 'Question')
    $owner.Dispose()
    if ($answer -ne 'Yes') {
      Set-Content -Path $later -Value $app.Version
      Write-Log "Skin missing in $($app.Version); restart postponed."
      exit 0
    }
  }

  Write-Log "Skin missing in $($app.Version), applying."
  $output = & (Join-Path $SkinRoot 'apply.ps1') -Restart:$running 2>&1 | Out-String
  Write-Log $output.Trim()
} catch {
  Write-Log "apply failed: $($_.Exception.Message)"
  if ($app) { Set-Content -Path (Join-Path $SkinRoot '.auto-apply-failed') -Value $app.Version }
  try {
    Add-Type -AssemblyName System.Windows.Forms
    [void][System.Windows.Forms.MessageBox]::Show("Could not re-apply the Codex skin. See $log", 'Codex skin', 'OK', 'Warning')
  } catch {}
}
exit 0
