# Windows: re-apply the skin automatically after every T3 Code update.
# Creates a scheduled task for your user that runs auto-apply.ps1 (hidden) at logon and every
# 5 minutes; it also keeps the small updater agent behind the skin's "Codex skin" rail button
# running. No admin rights needed when T3 is installed per user (the default).
#   powershell -ExecutionPolicy Bypass -File .\install-auto-apply.ps1
#   powershell -ExecutionPolicy Bypass -File .\install-auto-apply.ps1 -Uninstall
param([switch]$Uninstall)
. (Join-Path $PSScriptRoot 'lib/windows.ps1')
$name = 'T3 Codex Skin auto-apply'
$user = "$env:USERDOMAIN\$env:USERNAME"

Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue
if ($Uninstall) { Stop-SkinAgent; Write-Host 'Auto-apply removed.'; exit 0 }

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
Start-SkinAgent (Find-T3App)
Start-Sleep -Seconds 2
if (Test-SkinAgent) { Write-Host "Updater agent running on http://127.0.0.1:$AgentPort." }
else { Write-Host "Updater agent did not start; see $(Join-Path $PSScriptRoot 'agent.log.err')." }
Write-Host "Log: $(Join-Path $PSScriptRoot 'auto-apply.log')"
