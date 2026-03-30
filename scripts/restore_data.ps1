param(
    [Parameter(Mandatory = $true)]
    [string]$ArchivePath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$DataRoot = Join-Path $RepoRoot "data"

if (-not (Test-Path $ArchivePath)) {
    throw "Archive not found: $ArchivePath"
}

Expand-Archive -Path $ArchivePath -DestinationPath $DataRoot -Force
Write-Host "[restore] restored into $DataRoot"

