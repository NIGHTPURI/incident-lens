# Run with: pwsh -NoProfile -File scripts/tests/compare-protocol.tests.ps1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$savedExitCode = Get-Variable LASTEXITCODE -Scope Global -ErrorAction SilentlyContinue
$originalExitCode = if ($null -eq $savedExitCode) { 0 } else { [int]$savedExitCode.Value }
$repo = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$global:Calls = [System.Collections.Generic.List[string]]::new()
$global:FailAfter = $false
$global:MissingLag = $false
$global:ExistingStatus = 'CREATED'
$global:OverviewCount = 0
$global:FirstObservationBusy = $true
$global:FixtureId = "protocol-fixture-$([guid]::NewGuid())"

function Start-Sleep { param($Seconds) }
function Invoke-RestMethod {
    param($Method, $Uri, $TimeoutSec, $ContentType, $Body)
    $path = ([uri]$Uri).AbsolutePath
    $global:Calls.Add("$Method $path $Body")
    if ($path -eq '/api/overview') {
        $global:OverviewCount++
        $lag = if ($global:MissingLag) { $null } else { 0 }
        $pending = if ($global:FirstObservationBusy -and $global:OverviewCount -eq 1) { 2 } else { 0 }
        return [pscustomobject]@{
            services = @([pscustomobject]@{ name = 'demo-api'; status = 'UP' }, [pscustomobject]@{ name = 'demo-worker'; status = 'UP' })
            metrics = [pscustomobject]@{ outboxPending = $pending; kafkaLag = $lag }
        }
    }
    if ($path -eq '/api/sessions') { return [pscustomobject]@{ id = 'protocol-session' } }
    return [pscustomobject]@{ id = $global:FixtureId; sessionId = 'protocol-session'; status = $global:ExistingStatus; workload = @{ vus = 2; durationSeconds = 5 } }
}
function docker {
    $global:LASTEXITCODE = 0
    if ($args -contains 'port') { return '127.0.0.1:13000' }
    $phaseArg = @($args | Where-Object { $_ -like 'PHASE=*' })[0]
    $phase = $phaseArg.Substring(6)
    if ($global:FailAfter -and $phase -eq 'AFTER') { $global:LASTEXITCODE = 17; return }
    Set-Content "$repo/artifacts/$global:FixtureId-$phase.json" '{"requestCount":2,"errorCount":0,"durationSeconds":5,"p50Ms":1,"p95Ms":1,"p99Ms":1,"workload":{"vus":2,"durationSeconds":5}}'
}
function Assert-True { param([bool]$Condition, [string]$Message) if (!$Condition) { throw $Message } }
function Assert-RejectedBeforeMutation {
    $global:Calls.Clear()
    $caught = $false
    try { & "$repo/scripts/demo-compare.ps1" -SessionId 'protocol-session' -ExperimentId $global:FixtureId -RecoverySeconds 0 | Out-Null } catch { $caught = $true }
    Assert-True $caught 'Unsafe baseline/state should be rejected.'
    Assert-True (@($global:Calls | Where-Object { $_ -match '^(PUT|POST) ' }).Count -eq 0) 'Rejected preflight mutated the lab.'
}
try {
    & "$repo/scripts/demo-compare.ps1" -Vus 2 -DurationSeconds 5 -RecoverySeconds 0 | Out-Null
    Assert-True ($global:OverviewCount -eq 4) 'Must observe three consecutive idle samples after the busy sample.'
    Assert-True ($global:Calls[4] -like 'POST /api/sessions *') 'Created resources before the idle gate passed.'
    Assert-True (@($global:Calls | Where-Object { $_ -like '*/complete*' }).Count -eq 2) 'Missing completed phases.'
    Assert-True (@($global:Calls | Where-Object { $_ -like '*"enabled":false*' }).Count -eq 1) 'Normal cleanup incorrect.'

    $global:Calls.Clear()
    $global:FailAfter = $true
    $caught = $false
    try { & "$repo/scripts/demo-compare.ps1" -Vus 2 -DurationSeconds 5 -RecoverySeconds 0 | Out-Null } catch { $caught = $true }
    Assert-True $caught 'Workload failure must propagate.'
    Assert-True ($global:Calls[-1] -like '*"enabled":false*') 'Failed AFTER run was not aborted by cleanup.'
    Assert-True (@($global:Calls | Where-Object { $_ -like '*/complete*' }).Count -eq 1) 'Failed AFTER recorded as success.'

    $global:MissingLag = $true
    Assert-RejectedBeforeMutation
    $global:MissingLag = $false
    $global:ExistingStatus = 'RUNNING_BEFORE'
    Assert-RejectedBeforeMutation
    Write-Host 'PASS: runner idle gate, BEFORE/AFTER protocol, failure cleanup, missing telemetry and existing-run rejection.'
} finally {
    Get-ChildItem "$repo/artifacts/$global:FixtureId-*.json" -ErrorAction SilentlyContinue | Remove-Item
    $global:LASTEXITCODE = $originalExitCode
}
