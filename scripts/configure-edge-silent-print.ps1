param(
  [switch]$Disable
)

$ErrorActionPreference = 'Stop'
$policyPath = 'HKCU:\SOFTWARE\Policies\Microsoft\Edge'
$policyNames = @('SilentPrintingEnabled', 'PrintPreviewUseSystemDefaultPrinter')

if ($Disable) {
  if (Test-Path -LiteralPath $policyPath) {
    foreach ($name in $policyNames) {
      Remove-ItemProperty -LiteralPath $policyPath -Name $name -ErrorAction SilentlyContinue
    }
  }
  Write-Host 'Edge silent printing settings removed for this Windows user.'
  exit 0
}

$edgePaths = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
)
$edgePath = $edgePaths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $edgePath) {
  throw 'Microsoft Edge was not found. Install Edge version 144 or newer first.'
}

$edgeVersion = [version](Get-Item -LiteralPath $edgePath).VersionInfo.ProductVersion
if ($edgeVersion.Major -lt 144) {
  throw "Edge $edgeVersion does not support SilentPrintingEnabled. Update to version 144 or newer."
}

New-Item -Path $policyPath -Force | Out-Null
foreach ($name in $policyNames) {
  New-ItemProperty -LiteralPath $policyPath -Name $name -PropertyType DWord -Value 1 -Force | Out-Null
}

Write-Host 'Silent printing enabled for this Windows user.'
Write-Host 'Set a physical printer as the Windows default, then restart Edge and check edge://policy.'
