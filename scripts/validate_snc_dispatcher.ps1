param(
    [string]$HostCopyPath = "C:\Users\Administrator\Documents\codex_project_1\data\working\openclaw-v2026.4.1-snc-v1",
    [string]$NodeHome = "C:\Users\Administrator\tools\node-v22.14.0-win-x64",
    [int]$HeapMb = 8192,
    [switch]$SkipTests,
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

$NodeExe = Join-Path $NodeHome "node.exe"
$PnpmCmd = Join-Path $NodeHome "pnpm.cmd"
if (-not (Test-Path $NodeExe)) {
    throw "node.exe not found at $NodeExe"
}
if (-not (Test-Path $PnpmCmd)) {
    throw "pnpm.cmd not found at $PnpmCmd"
}

$env:PATH = "$NodeHome;$env:PATH"

Push-Location $HostCopyPath
try {
    Write-Host "[dispatcher] host copy: $HostCopyPath"
    Write-Host "[dispatcher] node home: $NodeHome"
    Write-Host "[dispatcher] heap mb: $HeapMb"

    if (-not $SkipTests) {
        Invoke-Step -Label "Focused SNC Vitest" -Action {
            & $PnpmCmd exec vitest run extensions/snc/src/session-state.test.ts extensions/snc/src/durable-memory.test.ts extensions/snc/src/engine.test.ts extensions/snc/src/hook-scaffold.test.ts extensions/snc/src/task-posture.test.ts extensions/snc/src/worker-policy.test.ts extensions/snc/src/worker-diagnostics.test.ts extensions/snc/src/worker-execution.test.ts extensions/snc/src/worker-launch-intent.test.ts extensions/snc/src/worker-state.test.ts
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
    Write-Host "All dispatcher validation steps completed successfully." -ForegroundColor Green
} finally {
    Pop-Location
}
