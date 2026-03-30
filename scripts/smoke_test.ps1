Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$UvExe = Join-Path $env:APPDATA "Python\Python314\Scripts\uv.exe"
if (-not (Test-Path $UvExe)) {
    $UvExe = Join-Path $env:USERPROFILE "AppData\Roaming\Python\Python314\Scripts\uv.exe"
}

Push-Location $RepoRoot
try {
    & $UvExe run python -m app.tests.smoke_runner
    if ($LASTEXITCODE -ne 0) {
        throw "smoke test failed with exit code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}
