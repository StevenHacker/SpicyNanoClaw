param(
    [string]$HostCopyPath = "C:\Users\Administrator\Documents\codex_project_1\data\working\openclaw-v2026.4.1-snc-v1",
    [string]$NodeHome = "C:\Users\Administrator\tools\node-v22.14.0-win-x64",
    [int]$HeapMb = 8192,
    [switch]$SkipPack,
    [switch]$SkipTypecheck
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

$PluginPath = Join-Path $HostCopyPath "extensions\snc"
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

$MilestoneTests = @(
    "extensions/snc/src/config.test.ts",
    "extensions/snc/src/session-state.test.ts",
    "extensions/snc/src/engine.test.ts",
    "extensions/snc/src/transcript-shaping.test.ts",
    "extensions/snc/src/replacement-ledger.test.ts",
    "extensions/snc/src/hook-scaffold.test.ts",
    "extensions/snc/src/durable-memory.test.ts",
    "extensions/snc/src/helper-tools.test.ts",
    "extensions/snc/src/worker-policy.test.ts",
    "extensions/snc/src/worker-execution.test.ts",
    "extensions/snc/src/worker-state.test.ts"
)

Push-Location $HostCopyPath
try {
    Write-Host "[milestone1] host copy: $HostCopyPath"
    Write-Host "[milestone1] plugin path: $PluginPath"
    Write-Host "[milestone1] node home: $NodeHome"
    Write-Host "[milestone1] heap mb: $HeapMb"

    Invoke-Step -Label "SNC Milestone 1 Vitest" -Action {
        & $PnpmCmd exec vitest run $MilestoneTests
    }

    if (-not $SkipPack) {
        Invoke-Step -Label "SNC Package Dry Run" -Action {
            Push-Location $PluginPath
            try {
                & $PnpmCmd pack --dry-run --json
            } finally {
                Pop-Location
            }
        }
    }

    if (-not $SkipTypecheck) {
        Invoke-Step -Label "Workspace Typecheck" -Action {
            $previousNodeOptions = $env:NODE_OPTIONS
            try {
                $env:NODE_OPTIONS = "--max-old-space-size=$HeapMb"
                & $PnpmCmd exec tsc -p tsconfig.json --pretty false --noEmit --incremental false
            } finally {
                $env:NODE_OPTIONS = $previousNodeOptions
            }
        }
    }

    Write-Host ""
    Write-Host "SNC Milestone 1 validation completed successfully." -ForegroundColor Green
} finally {
    Pop-Location
}
