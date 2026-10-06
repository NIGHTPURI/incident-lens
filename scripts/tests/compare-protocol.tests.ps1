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
    param($Uri, $Method, $TimeoutSec, $ContentType, $Body)
    $path = ([uri]$Uri).AbsolutePath
    $global:Calls.Add("$Method $path $Body")
    if ($path -eq '/api/runtime') { return [pscustomobject]@{ instanceId='control-plane';profile='core';workloadTarget='http://demo-api:8081';hostPorts=[pscustomobject]@{controlPlane=18080;demoApi=18081;demoWorker=18082;web=13000;prometheus=19090;grafana=13001} } }
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
$global:Case = 'valid'
$global:DockerCalls = @()
$global:Services = @('mysql','redis','kafka','control-plane','demo-api','demo-worker','web')
$global:Limits = @{ mysql=805306368;redis=134217728;kafka=939524096;'control-plane'=671088640;'demo-api'=671088640;'demo-worker'=671088640;web=134217728 }
$global:ServicePorts = @{ 'control-plane'=18080;'demo-api'=18081;'demo-worker'=18082;web=13000;prometheus=19090;grafana=13001 }
function docker {
    $global:LASTEXITCODE = 0
    $command = $args -join ' '
    $global:DockerCalls += $command
    if ($command -eq 'context show') { return 'test-local' }
    if ($command -like 'context inspect*') { if ($global:Case -eq 'remote-context') { return 'ssh://example.invalid' };return 'npipe:////./pipe/docker_engine' }
    if ($command -like '*config --format json') {
        $services = [ordered]@{}
        foreach ($service in $global:Services) { $services[$service] = @{ mem_limit=$global:Limits[$service];ports=@(@{published=$global:ServicePorts[$service]}) } }
        $services['control-plane']['environment']=@{ DEMO_API_URL='http://demo-api:8081';DEMO_WORKER_URL='http://demo-worker:8082' }
        $services['k6']=@{environment=@{BASE_URL='http://demo-api:8081'};networks=@{default=@{}}}
        $services['prometheus']=@{ports=@(@{published=19090})};$services['grafana']=@{ports=@(@{published=13001})}
        if ($global:Case -eq 'split-target') { $services['k6']['environment']['BASE_URL']='http://other-app:8081' }
        return (@{name='incidentlens-test';services=$services;networks=@{default=@{external=$false}}}|ConvertTo-Json -Depth 12 -Compress)
    }
    if ($command -like 'compose port*') { return "127.0.0.1:$($global:ServicePorts[$args[2]])" }
    if ($command -like 'compose ps -q*') { if ($global:Services -contains $args[3]) { return $args[3] };return }
    if ($command -like 'inspect*') {
        $containers=@()
        foreach ($service in @($args | Select-Object -Skip 1)) {
            $containers+=@{ State=@{Running=$true;Health=@{Status='healthy'}};HostConfig=@{Memory=$global:Limits[$service]};Image="sha256:$service";Config=@{Hostname=$service;Labels=@{'com.docker.compose.project'='incidentlens-test';'com.docker.compose.service'=$service};Env=@('DEMO_API_URL=http://demo-api:8081','DEMO_WORKER_URL=http://demo-worker:8082','OTEL_SDK_DISABLED=true')};NetworkSettings=@{Networks=@{'incidentlens-test_default'=@{}}} }
        }
        return (ConvertTo-Json -InputObject $containers -Depth 12 -Compress)
    }
    if ($command -like 'compose run*') {
      $phaseArg = @($args | Where-Object { $_ -like 'PHASE=*' })[0]; $phase = $phaseArg.Substring(6)
      if ($global:FailAfter -and $phase -eq 'AFTER') { $global:LASTEXITCODE = 17; return }
      Set-Content "$repo/artifacts/$global:FixtureId-$phase.json" '{"requestCount":2,"errorCount":0,"durationSeconds":5,"p50Ms":1,"p95Ms":1,"p99Ms":1,"workload":{"vus":2,"durationSeconds":5}}'
      return
    }
    throw "Unexpected fake Docker call: $command"
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
    Assert-True ((@($global:Calls | Where-Object { $_ -match '^(PUT|POST) ' }))[0] -like 'POST /api/sessions *') 'Created resources before the idle gate passed.'
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
