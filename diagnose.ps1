# Prints what the skin scripts see on this PC, to paste into a bug report. Changes nothing.
#   powershell -ExecutionPolicy Bypass -File .\diagnose.ps1
param([string]$AppDir)
. (Join-Path $PSScriptRoot 'lib/windows.ps1')
$ErrorActionPreference = 'Continue'

Write-Host '== T3 installs found'
$roots = @("$env:LOCALAPPDATA\Programs", $env:LOCALAPPDATA, $env:ProgramFiles, ${env:ProgramFiles(x86)}) | Where-Object { $_ -and (Test-Path $_) }
foreach ($root in $roots) {
  Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like 'T3*' -or $_.Name -like 't3code*' } |
    ForEach-Object { Write-Host "  $($_.FullName)" }
}
Get-Process -ErrorAction SilentlyContinue | Where-Object { try { $_.Path -like '*T3*' } catch { $false } } |
  Select-Object -ExpandProperty Path -Unique | ForEach-Object { Write-Host "  running: $_" }

$app = Find-T3App -AppDir $AppDir
if (-not $app) { Write-Host 'Find-T3App: nothing found'; exit 0 }
Write-Host "== Picked: $($app.Name) $($app.Version)"
Write-Host "  exe:  $($app.Exe)"
Write-Host "  asar: $($app.Asar) ($([math]::Round((Get-Item $app.Asar).Length / 1MB, 1)) MB)"

Write-Host '== resources folder'
Get-ChildItem (Join-Path $app.Dir 'resources') | ForEach-Object { Write-Host "  $($_.Name)$(if ($_.PSIsContainer) { '\' })" }

Write-Host '== index.html files outside the archive'
Get-ChildItem (Join-Path $app.Dir 'resources') -Recurse -Filter 'index.html' -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch '\\node_modules\\' } | Select-Object -First 15 |
  ForEach-Object { Write-Host "  $($_.FullName)" }

Write-Host '== top folders inside the archive'
$list = [IO.Path]::GetTempFileName()
try {
  $node = Get-Command node -ErrorAction SilentlyContinue
  $script = Join-Path $SkinRoot 'lib/patch-asar.mjs'
  if ($node) { & $node.Source $script $app.Asar x list > $list 2>&1 }
  Get-Content $list | ForEach-Object { ($_ -split '/')[0..([math]::Min(2, ($_ -split '/').Count - 1))] -join '/' } |
    Group-Object | Sort-Object Count -Descending | Select-Object -First 25 |
    ForEach-Object { Write-Host ("  {0,6}  {1}" -f $_.Count, $_.Name) }
  Write-Host '== html files inside the archive'
  Get-Content $list | Where-Object { $_ -match '\.html' } | Select-Object -First 15 | ForEach-Object { Write-Host "  $_" }
} finally { Remove-Item $list -ErrorAction SilentlyContinue }
