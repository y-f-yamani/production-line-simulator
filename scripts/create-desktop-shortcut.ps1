$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$targetPath = Join-Path $projectRoot 'release\Production-Line-Simulator-V1.html'
$iconPath = Join-Path $projectRoot 'assets\Production-Line-Simulator-Icon.ico'
$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath 'Production Line Simulator V1.1.lnk'

if (-not (Test-Path -LiteralPath $targetPath -PathType Leaf)) {
  throw "Simulator file not found: $targetPath"
}
if (-not (Test-Path -LiteralPath $iconPath -PathType Leaf)) {
  throw "Icon file not found: $iconPath"
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.WorkingDirectory = Split-Path -Parent $targetPath
$shortcut.IconLocation = "$iconPath,0"
$shortcut.Description = 'Production Line Simulator V1.1'
$shortcut.Save()

Write-Host "Created $shortcutPath"
