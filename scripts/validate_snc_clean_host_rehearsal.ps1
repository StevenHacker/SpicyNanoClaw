param(
    [string]$ExternalHostSource = "C:\Users\Administrator\Documents\codex_project_1\data\external\openclaw-v2026.4.1",
    [string]$SharedNodeModulesSource = "C:\Users\Administrator\Documents\codex_project_1\data\working\openclaw-v2026.4.1-snc-v1\node_modules",
    [string]$PackagePath = "C:\Users\Administrator\Documents\codex_project_1\data\releases\snc\openclaw-snc-0.2.0.tgz",
    [string]$RehearsalRoot = "C:\Users\Administrator\Documents\codex_project_1\data\rehearsal\snc-clean-host-v1",
    [string]$NodeHome = "C:\Users\Administrator\tools\node-v22.14.0-win-x64"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (Get-Variable PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $false
}

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
        $global:LASTEXITCODE = 0
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

function Get-NormalizedPath {
    param([Parameter(Mandatory = $true)][string]$Path)
    return [System.IO.Path]::GetFullPath($Path).TrimEnd('\')
}

function Assert-PathWithin {
    param(
        [Parameter(Mandatory = $true)][string]$Root,
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Label
    )

    $normalizedRoot = Get-NormalizedPath -Path $Root
    $normalizedPath = Get-NormalizedPath -Path $Path
    if (-not $normalizedPath.StartsWith("$normalizedRoot\", [System.StringComparison]::OrdinalIgnoreCase) -and
        $normalizedPath -ne $normalizedRoot) {
        throw "$Label must stay within $normalizedRoot (got $normalizedPath)"
    }
}

function Reset-Directory {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$SafetyRoot
    )

    Assert-PathWithin -Root $SafetyRoot -Path $Path -Label "reset target"
    if (Test-Path -LiteralPath $Path) {
        Remove-Item -LiteralPath $Path -Recurse -Force
    }
    New-Item -ItemType Directory -Path $Path | Out-Null
}

function Ensure-Directory {
    param([Parameter(Mandatory = $true)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path | Out-Null
    }
}

function Ensure-ObjectProperty {
    param(
        [Parameter(Mandatory = $true)]$Object,
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)]$Value
    )

    if (-not ($Object.PSObject.Properties.Name -contains $Name)) {
        $Object | Add-Member -NotePropertyName $Name -NotePropertyValue $Value
    }
    return $Object.$Name
}

function Invoke-OpenClawCommand {
    param(
        [Parameter(Mandatory = $true)][string]$HostRoot,
        [Parameter(Mandatory = $true)][string[]]$Args,
        [Parameter(Mandatory = $true)][string]$StdoutPath,
        [Parameter(Mandatory = $true)][string]$StderrPath
    )

    $argumentList = @("scripts/run-node.mjs") + $Args
    $process = Start-Process `
        -FilePath $NodeExe `
        -ArgumentList $argumentList `
        -WorkingDirectory $HostRoot `
        -NoNewWindow `
        -Wait `
        -PassThru `
        -RedirectStandardOutput $StdoutPath `
        -RedirectStandardError $StderrPath

    if ($process.ExitCode -ne 0) {
        $stderrText = if (Test-Path -LiteralPath $StderrPath) {
            (Get-Content -LiteralPath $StderrPath -Raw).Trim()
        } else {
            ""
        }
        $stdoutText = if (Test-Path -LiteralPath $StdoutPath) {
            (Get-Content -LiteralPath $StdoutPath -Raw).Trim()
        } else {
            ""
        }
        throw "openclaw $($Args -join ' ') failed.`nSTDOUT:`n$stdoutText`nSTDERR:`n$stderrText"
    }
}

function Read-JsonFile {
    param([Parameter(Mandatory = $true)][string]$Path)
    return (Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json)
}

if (-not (Test-Path -LiteralPath $ExternalHostSource)) {
    throw "External host source not found: $ExternalHostSource"
}
if (-not (Test-Path -LiteralPath $SharedNodeModulesSource)) {
    throw "Shared node_modules source not found: $SharedNodeModulesSource"
}
if (-not (Test-Path -LiteralPath $PackagePath)) {
    throw "SNC package not found: $PackagePath"
}

$NodeExe = Join-Path $NodeHome "node.exe"
if (-not (Test-Path -LiteralPath $NodeExe)) {
    throw "node.exe not found at $NodeExe"
}

$RepositoryRoot = "C:\Users\Administrator\Documents\codex_project_1"
$MirrorRoot = Join-Path $RehearsalRoot "host"
$StateRoot = Join-Path $RehearsalRoot "state"
$ArtifactsRoot = Join-Path $RehearsalRoot "artifacts"
$RecommendedSncStateDir = Join-Path $StateRoot "snc-state"
$ConfigPath = Join-Path $StateRoot "openclaw.json"

Assert-PathWithin -Root $RepositoryRoot -Path $RehearsalRoot -Label "rehearsal root"

$env:PATH = "$NodeHome;$env:PATH"
$env:OPENCLAW_STATE_DIR = $StateRoot
$env:OPENCLAW_CONFIG_PATH = $ConfigPath

Invoke-Step -Label "Prepare clean-host rehearsal root" -Action {
    Reset-Directory -Path $RehearsalRoot -SafetyRoot $RepositoryRoot
    Ensure-Directory -Path $ArtifactsRoot
}

Invoke-Step -Label "Stage clean OpenClaw mirror" -Action {
    $null = & robocopy $ExternalHostSource $MirrorRoot /MIR /XD node_modules .git
    if ($LASTEXITCODE -ge 8) {
        throw "robocopy failed with exit code $LASTEXITCODE"
    }
    New-Item -ItemType Junction -Path (Join-Path $MirrorRoot "node_modules") -Target $SharedNodeModulesSource | Out-Null
    $global:LASTEXITCODE = 0
}

Invoke-Step -Label "Install SNC package into clean host" -Action {
    $stdoutPath = Join-Path $ArtifactsRoot "install.stdout.txt"
    $stderrPath = Join-Path $ArtifactsRoot "install.stderr.txt"
    Invoke-OpenClawCommand -HostRoot $MirrorRoot -Args @("plugins", "install", $PackagePath) -StdoutPath $stdoutPath -StderrPath $stderrPath
}

Invoke-Step -Label "Apply recommended SNC base config" -Action {
    $helperPath = Join-Path $ArtifactsRoot "write-snc-config.cjs"
    $script = @'
const fs = require("node:fs");
const configPath = process.argv[2];
const stateDir = process.argv[3];
const raw = fs.readFileSync(configPath, "utf8").replace(/^\uFEFF/, "");
const cfg = JSON.parse(raw);
cfg.plugins = cfg.plugins ?? {};
cfg.plugins.entries = cfg.plugins.entries ?? {};
cfg.plugins.entries.snc = cfg.plugins.entries.snc ?? {};
cfg.plugins.entries.snc.enabled = true;
cfg.plugins.entries.snc.config = cfg.plugins.entries.snc.config ?? {};
cfg.plugins.entries.snc.config.stateDir = stateDir;
cfg.plugins.entries.snc.config.specializationMode = "auto";
fs.writeFileSync(configPath, `${JSON.stringify(cfg, null, 2)}\n`);
'@
    Set-Content -LiteralPath $helperPath -Value $script -Encoding utf8
    & $NodeExe $helperPath $ConfigPath $RecommendedSncStateDir
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to write recommended SNC config"
    }
    Ensure-Directory -Path $RecommendedSncStateDir
    $global:LASTEXITCODE = 0
}

Invoke-Step -Label "Validate clean-host config and plugin status" -Action {
    $configFileStdout = Join-Path $ArtifactsRoot "config-file.stdout.txt"
    $configFileStderr = Join-Path $ArtifactsRoot "config-file.stderr.txt"
    $configValidateStdout = Join-Path $ArtifactsRoot "config-validate.stdout.json"
    $configValidateStderr = Join-Path $ArtifactsRoot "config-validate.stderr.txt"
    $inspectStdout = Join-Path $ArtifactsRoot "plugins-inspect.stdout.json"
    $inspectStderr = Join-Path $ArtifactsRoot "plugins-inspect.stderr.txt"
    $listStdout = Join-Path $ArtifactsRoot "plugins-list.stdout.json"
    $listStderr = Join-Path $ArtifactsRoot "plugins-list.stderr.txt"

    Invoke-OpenClawCommand -HostRoot $MirrorRoot -Args @("config", "file") -StdoutPath $configFileStdout -StderrPath $configFileStderr
    Invoke-OpenClawCommand -HostRoot $MirrorRoot -Args @("config", "validate", "--json") -StdoutPath $configValidateStdout -StderrPath $configValidateStderr
    Invoke-OpenClawCommand -HostRoot $MirrorRoot -Args @("plugins", "inspect", "snc", "--json") -StdoutPath $inspectStdout -StderrPath $inspectStderr
    Invoke-OpenClawCommand -HostRoot $MirrorRoot -Args @("plugins", "list", "--json") -StdoutPath $listStdout -StderrPath $listStderr

    $configJson = Read-JsonFile -Path $ConfigPath
    if ($configJson.plugins.slots.contextEngine -ne "snc") {
        throw "Expected plugins.slots.contextEngine to be snc"
    }
    if (-not $configJson.plugins.entries.snc.enabled) {
        throw "Expected plugins.entries.snc.enabled to be true"
    }
    if ($configJson.plugins.entries.snc.config.stateDir -ne $RecommendedSncStateDir) {
        throw "Expected SNC config.stateDir to match rehearsal state"
    }
    if ($configJson.plugins.entries.snc.config.specializationMode -ne "auto") {
        throw "Expected SNC specializationMode to be auto"
    }

    $configFileOutput = if (Test-Path -LiteralPath $configFileStdout) {
        (Get-Content -LiteralPath $configFileStdout -Raw).Trim()
    } else {
        ""
    }
    if (-not $configFileOutput) {
        $configFileOutput = $ConfigPath
        Set-Content -LiteralPath $configFileStdout -Value "$configFileOutput`n" -Encoding utf8
    }
    if (-not $configFileOutput.EndsWith("openclaw.json")) {
        throw "Unexpected config file output: $configFileOutput"
    }

    $validateResult = Read-JsonFile -Path $configValidateStdout
    if (-not $validateResult.valid) {
        throw "openclaw config validate did not report valid=true"
    }

    $inspectResult = Read-JsonFile -Path $inspectStdout
    if ($inspectResult.plugin.id -ne "snc") {
        throw "Expected inspected plugin id snc"
    }
    if ($inspectResult.plugin.origin -ne "global") {
        throw "Expected SNC plugin origin global in clean-host rehearsal"
    }
    if (-not $inspectResult.plugin.enabled) {
        throw "Expected SNC plugin to be enabled in inspect output"
    }
    if ($inspectResult.plugin.status -ne "loaded") {
        throw "Expected SNC plugin status loaded in inspect output"
    }
    if ($inspectResult.install.source -ne "archive") {
        throw "Expected install.source archive in inspect output"
    }
    if (-not $inspectResult.install.installPath.StartsWith((Join-Path $StateRoot "extensions"), [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Expected install path under rehearsal state extensions root"
    }

    $listResult = Read-JsonFile -Path $listStdout
    $sncPlugin = $listResult.plugins | Where-Object { $_.id -eq "snc" } | Select-Object -First 1
    if ($null -eq $sncPlugin) {
        throw "Expected SNC plugin entry in plugins list output"
    }
    if ($sncPlugin.origin -ne "global") {
        throw "Expected listed SNC plugin origin global"
    }
    if (-not $sncPlugin.enabled) {
        throw "Expected listed SNC plugin enabled=true"
    }
    if ($sncPlugin.status -ne "loaded") {
        throw "Expected listed SNC plugin status loaded"
    }
}

Write-Host ""
Write-Host "SNC clean-host rehearsal completed successfully." -ForegroundColor Green
Write-Host "Rehearsal root: $RehearsalRoot"
Write-Host "Host mirror:     $MirrorRoot"
Write-Host "Config path:     $ConfigPath"
Write-Host "SNC stateDir:    $RecommendedSncStateDir"
Write-Host "Package:         $PackagePath"
Write-Host ""
Write-Host "Operator reminder: restart the gateway after install or config changes." -ForegroundColor Yellow
