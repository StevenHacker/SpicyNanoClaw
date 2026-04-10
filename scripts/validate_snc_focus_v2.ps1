param(
    [string]$HostCopyPath = "C:\Users\Administrator\Documents\codex_project_1\data\working\openclaw-v2026.4.1-snc-v1",
    [string]$NodeHome = "C:\Users\Administrator\tools\node-v22.14.0-win-x64",
    [switch]$SkipCore,
    [switch]$SkipFocus
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

function Invoke-VitestSuite {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Label,
        [Parameter(Mandatory = $true)]
        [string[]]$RelativeTests,
        [switch]$Required
    )

    $existingTests = @()
    $missingTests = @()

    foreach ($testPath in $RelativeTests) {
        $fullPath = Join-Path $HostCopyPath $testPath
        if (Test-Path $fullPath) {
            $existingTests += $testPath
        } else {
            $missingTests += $testPath
        }
    }

    if ($existingTests.Count -eq 0) {
        if ($Required) {
            throw "$Label has no available test files."
        }

        Write-Host "[focus] skipping $Label because none of the requested tests exist."
        return
    }

    if ($missingTests.Count -gt 0) {
        Write-Host "[focus] $Label missing tests:" -ForegroundColor Yellow
        $missingTests | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    }

    Invoke-Step -Label $Label -Action {
        & $PnpmCmd exec vitest run $existingTests
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

$CoreTests = @(
    "extensions/snc/src/session-state.test.ts",
    "extensions/snc/src/engine.test.ts"
)

$FocusTests = @(
    "extensions/snc/src/config.test.ts",
    "extensions/snc/src/durable-memory.test.ts",
    "extensions/snc/src/hook-scaffold.test.ts",
    "extensions/snc/src/task-posture.test.ts",
    "extensions/snc/src/transcript-shaping.test.ts",
    "extensions/snc/src/replacement-ledger.test.ts",
    "extensions/snc/src/worker-policy.test.ts",
    "extensions/snc/src/worker-diagnostics.test.ts",
    "extensions/snc/src/worker-execution.test.ts",
    "extensions/snc/src/worker-launch-intent.test.ts",
    "extensions/snc/src/worker-state.test.ts"
)

Push-Location $HostCopyPath
try {
    Write-Host "[focus] host copy: $HostCopyPath"
    Write-Host "[focus] node home: $NodeHome"
    Write-Host "[focus] scope: hook shaping, worker scaffolds, state continuity, and no-regression basics"

    if (-not $SkipFocus) {
        Invoke-VitestSuite -Label "SNC Shaping Focus" -RelativeTests $FocusTests
    }

    if (-not $SkipCore) {
        Invoke-VitestSuite -Label "SNC Continuity Baseline" -RelativeTests $CoreTests -Required
    }

    Write-Host ""
    Write-Host "Focused SNC validation completed successfully." -ForegroundColor Green
} finally {
    Pop-Location
}
