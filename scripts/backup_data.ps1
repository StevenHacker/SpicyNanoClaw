param(
    [string]$Destination = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$DataRoot = Join-Path $RepoRoot "data"
if (-not $Destination) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $Destination = Join-Path $RepoRoot "data-backup-$stamp.zip"
}

if (Test-Path $Destination) {
    Remove-Item -LiteralPath $Destination -Force
}

Compress-Archive -Path (Join-Path $DataRoot "*") -DestinationPath $Destination -Force
Write-Host "[backup] created $Destination"

