param(
  [Parameter(Mandatory=$true)]
  [string]$ProfileId,

  [string]$Root = "",
  [string]$HandoffOutput = "",
  [string]$FinalizedBy = "",
  [switch]$Force,
  [switch]$FullJson
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$BackendDir = Split-Path -Parent $PSCommandPath
$Python = Join-Path $BackendDir ".venv\Scripts\python.exe"

if (-not (Test-Path $Python)) {
  throw "Backend virtualenv Python not found: $Python"
}

function Invoke-ExecIntelCli {
  param([string[]]$CliArgs)

  $allArgs = @("-m", "executive_intel.cli") + $CliArgs
  & $Python @allArgs
  if ($LASTEXITCODE -ne 0) {
    throw "executive_intel.cli failed with exit code $LASTEXITCODE for args: $($CliArgs -join ' ')"
  }
}

$rootArgs = @()
if ($Root.Trim()) {
  $rootArgs = @("--root", $Root)
}

Write-Host "`n=== Executive Signal Scout: Search Plan ===" -ForegroundColor Cyan
Invoke-ExecIntelCli (@("search-plan", $ProfileId) + $rootArgs)

Write-Host "`n=== Executive Signal Scout: Portfolio Readiness ===" -ForegroundColor Cyan
Invoke-ExecIntelCli (@("portfolio", $ProfileId) + $rootArgs)

Write-Host "`n=== Executive Signal Scout: Handoff Preview ===" -ForegroundColor Cyan
$handoffArgs = @("handoff", $ProfileId) + $rootArgs
if ($FinalizedBy.Trim()) {
  $handoffArgs += @("--finalized-by", $FinalizedBy)
} else {
  $handoffArgs += "--draft"
}
if ($FullJson) {
  $handoffArgs += "--json"
}
if ($HandoffOutput.Trim()) {
  $handoffArgs += @("--output", $HandoffOutput)
}
if ($Force) {
  $handoffArgs += "--force"
}
Invoke-ExecIntelCli $handoffArgs

Write-Host "`nDone. No SQLite writes, scheduling, publication, or outbound delivery were performed." -ForegroundColor Green
