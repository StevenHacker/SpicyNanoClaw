param(
    [string]$HostCopyPath = "C:\Users\Administrator\Documents\codex_project_1\data\working\openclaw-v2026.4.1-snc-v1",
    [string]$NodeHome = "C:\Users\Administrator\tools\node-v22.14.0-win-x64",
    [int]$HeapMb = 8192,
    [switch]$SkipFocus,
    [switch]$SkipDispatcher,
    [switch]$SkipPack,
    [switch]$SkipCleanHost
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Label,
        [Parameter(Mandatory = $true)]
        [scriptblock]$Action
    )

    Write-Host ""
    Write-Host "==> $Label" -ForegroundColor Cyan
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        & $Action
        if ($LASTEXITCODE -ne 0) {
            throw "$Label failed with exit code $LASTEXITCODE"
        }
        $sw.Stop()
        Write-Host "<== $Label completed in $([int]$sw.Elapsed.TotalSeconds)s" -ForegroundColor Green
    } catch {
        $sw.Stop()
        Write-Host "<== $Label failed after $([int]$sw.Elapsed.TotalSeconds)s" -ForegroundColor Red
        throw
    }
}

if (-not (Test-Path $HostCopyPath)) {
    throw "Host copy not found: $HostCopyPath"
}

$RepositoryRoot = "C:\Users\Administrator\Documents\codex_project_1"
$PluginPath = Join-Path $HostCopyPath "extensions\snc"
$ReleaseRoot = Join-Path $RepositoryRoot "data\releases\snc"
$PackagePath = Join-Path $ReleaseRoot "openclaw-snc-0.1.1.tgz"
$NodeExe = Join-Path $NodeHome "node.exe"
$PnpmCmd = Join-Path $NodeHome "pnpm.cmd"

if (-not (Test-Path $NodeExe)) {
    throw "node.exe not found at $NodeExe"
}
if (-not (Test-Path $PnpmCmd)) {
    throw "pnpm.cmd not found at $PnpmCmd"
}
if (-not (Test-Path $PluginPath)) {
    throw "SNC plugin path not found: $PluginPath"
}

$env:PATH = "$NodeHome;$env:PATH"

Push-Location $RepositoryRoot
try {
    Write-Host "[milestone2] host copy: $HostCopyPath"
    Write-Host "[milestone2] plugin path: $PluginPath"
    Write-Host "[milestone2] node home: $NodeHome"
    Write-Host "[milestone2] heap mb: $HeapMb"

    if (-not $SkipFocus) {
        Invoke-Step -Label "Focused SNC Validation" -Action {
            powershell -ExecutionPolicy Bypass -File (Join-Path $RepositoryRoot "scripts\validate_snc_focus_v2.ps1") -HostCopyPath $HostCopyPath -NodeHome $NodeHome
        }
    }

    if (-not $SkipDispatcher) {
        Invoke-Step -Label "Dispatcher SNC Validation" -Action {
            powershell -ExecutionPolicy Bypass -File (Join-Path $RepositoryRoot "scripts\validate_snc_dispatcher.ps1") -HostCopyPath $HostCopyPath -NodeHome $NodeHome -HeapMb $HeapMb
        }
    }

    if (-not $SkipPack) {
        Invoke-Step -Label "Build SNC Package Artifact" -Action {
            if (-not (Test-Path $ReleaseRoot)) {
                New-Item -ItemType Directory -Path $ReleaseRoot | Out-Null
            }
            if (Test-Path $PackagePath) {
                Remove-Item -LiteralPath $PackagePath -Force
            }

            Push-Location $PluginPath
            try {
                & $PnpmCmd pack --pack-destination $ReleaseRoot
            } finally {
                Pop-Location
            }

            if (-not (Test-Path $PackagePath)) {
                throw "Expected package artifact was not created at $PackagePath"
            }
        }
    }

    if (-not $SkipCleanHost) {
        Invoke-Step -Label "Clean-Host Rehearsal" -Action {
            powershell -ExecutionPolicy Bypass -File (Join-Path $RepositoryRoot "scripts\validate_snc_clean_host_rehearsal.ps1") -PackagePath $PackagePath -NodeHome $NodeHome
        }
    }

    Write-Host ""
    Write-Host "SNC Milestone 2 validation completed successfully." -ForegroundColor Green
} finally {
    Pop-Location
}
