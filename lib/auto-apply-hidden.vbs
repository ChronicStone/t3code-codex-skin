' Starts auto-apply.ps1 with no console window (a scheduled task running powershell.exe
' directly flashes one every 5 minutes).
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
CreateObject("WScript.Shell").Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & root & "\auto-apply.ps1""", 0, True
