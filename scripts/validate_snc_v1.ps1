param(
    [string]$HostCopyPath = "C:\Users\Administrator\Documents\codex_project_1\data\working\openclaw-v2026.4.1-snc-v1",
    [string]$NodeHome = "C:\Users\Administrator\tools\node-v22.14.0-win-x64",
    [int]$HeapMb = 8192,
    [switch]$SkipFocus,
    [switch]$SkipDispatcher,
    [switch]$SkipPack,
    [switch]$SkipCleanHost
)

$params = @{
    HostCopyPath = $HostCopyPath
    NodeHome = $NodeHome
    HeapMb = $HeapMb
}
if ($SkipFocus) { $params.SkipFocus = $true }
if ($SkipDispatcher) { $params.SkipDispatcher = $true }
if ($SkipPack) { $params.SkipPack = $true }
if ($SkipCleanHost) { $params.SkipCleanHost = $true }

& "C:\Users\Administrator\Documents\codex_project_1\scripts\validate_snc_milestone3.ps1" @params
