Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command,
        [Parameter(Mandatory = $true)]
        [string]$Description
    )

    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Description failed with exit code $LASTEXITCODE"
    }
}

$RepoRoot = Split-Path -Parent $PSScriptRoot
$UvExe = Join-Path $env:APPDATA "Python\Python314\Scripts\uv.exe"
if (-not (Test-Path $UvExe)) {
    $UvExe = Join-Path $env:USERPROFILE "AppData\Roaming\Python\Python314\Scripts\uv.exe"
}
if (-not (Test-Path $UvExe)) {
    throw "uv.exe not found. Install it first with: python -m pip install --user uv"
}

Write-Host "[bootstrap] repo root: $RepoRoot"

$folders = @(
    "app",
    "app\providers",
    "app\tools",
    "app\memory",
    "app\tests",
    "data",
    "data\lancedb",
    "data\cache",
    "data\logs",
    "data\samples",
    "data\samples\generated"
)
foreach ($folder in $folders) {
    $path = Join-Path $RepoRoot $folder
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path | Out-Null
        Write-Host "[bootstrap] created $folder"
    }
}

$envFile = Join-Path $RepoRoot ".env"
$exampleFile = Join-Path $RepoRoot ".env.example"
if (-not (Test-Path $envFile)) {
    Copy-Item -Path $exampleFile -Destination $envFile
    Write-Host "[bootstrap] created .env from .env.example"
}

Push-Location $RepoRoot
try {
    $venvPath = Join-Path $RepoRoot ".venv"
    if (-not (Test-Path $venvPath)) {
        Write-Host "[bootstrap] creating virtual environment"
        Invoke-Step -Description "uv venv" -Command { & $UvExe venv --seed --python 3.11 .venv }
    } else {
        Write-Host "[bootstrap] virtual environment already exists"
    }
    Write-Host "[bootstrap] syncing dependencies"
    Invoke-Step -Description "uv sync" -Command { & $UvExe sync }
    Write-Host "[bootstrap] validating imports"
    Invoke-Step -Description "import check" -Command { & $UvExe run python -m app.tests.import_check }
    Write-Host "[bootstrap] ensuring sample files"
    Invoke-Step -Description "sample generation" -Command { & $UvExe run python -m app.tests.generate_samples }
    Write-Host "[bootstrap] bootstrap complete"
} finally {
    Pop-Location
}
