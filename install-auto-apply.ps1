# Windows: re-apply the skin automatically after every T3 Code update.
# Creates a scheduled task for your user that runs auto-apply.ps1 (hidden) at logon and every
# 5 minutes. No admin rights needed when T3 is installed per user (the default).
#   powershell -ExecutionPolicy Bypass -File .\install-auto-apply.ps1
#   powershell -ExecutionPolicy Bypass -File .\install-auto-apply.ps1 -Uninstall
param([switch]$Uninstall)
$ErrorActionPreference = 'Stop'
$name = 'T3 Codex Skin auto-apply'
$user = "$env:USERDOMAIN\$env:USERNAME"

Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue
if ($Uninstall) { Write-Host 'Auto-apply removed.'; exit 0 }

$vbs = Join-Path $PSScriptRoot 'lib/auto-apply-hidden.vbs'
$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument ('"' + $vbs + '"')
$atLogon = New-ScheduledTaskTrigger -AtLogOn -User $user
$every5 = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $name -Action $action -Trigger @($atLogon, $every5) `
  -Settings $settings -Principal $principal -Description 'Re-applies the Codex skin after T3 Code updates.' | Out-Null

Write-Host "Auto-apply installed (Task Scheduler: '$name')."
Write-Host "Log: $(Join-Path $PSScriptRoot 'auto-apply.log')"
