# Focused guard test. Fake Docker/runtime responses; creates no containers, sessions or traffic.
. "$PSScriptRoot/common.ps1"
$script:Case = 'valid'
$script:Requests = 0
$script:Calls = @()
$script:Services = @('mysql','redis','kafka','control-plane','demo-api','demo-worker','web')
$script:Limits = @{ mysql=805306368;redis=134217728;kafka=939524096;'control-plane'=671088640;'demo-api'=671088640;'demo-worker'=671088640;web=134217728 }
$script:ServicePorts = @{ 'control-plane'=18080;'demo-api'=18081;'demo-worker'=18082;web=13000;prometheus=19090;grafana=13001 }
function docker {
    $global:LASTEXITCODE = 0
    $command = $args -join ' '
    $script:Calls += $command
    if ($command -eq 'context show') { return 'test-local' }
    if ($command -like 'context inspect*') { if ($script:Case -eq 'remote-context') { return 'ssh://example.invalid' };return 'npipe:////./pipe/docker_engine' }
    if ($command -like '*config --format json') {
        $services = [ordered]@{}
        foreach ($service in $script:Services) { $services[$service] = @{ mem_limit=$script:Limits[$service];ports=@(@{published=$script:ServicePorts[$service]}) } }
        $services['control-plane']['environment']=@{ DEMO_API_URL='http://demo-api:8081';DEMO_WORKER_URL='http://demo-worker:8082' }
        $services['k6']=@{environment=@{BASE_URL='http://demo-api:8081'};networks=@{default=@{}}}
        $services['prometheus']=@{ports=@(@{published=19090})};$services['grafana']=@{ports=@(@{published=13001})}
        if ($script:Case -eq 'split-target') { $services['k6']['environment']['BASE_URL']='http://other-app:8081' }
        return (@{name='incidentlens-test';services=$services;networks=@{default=@{external=$false}}}|ConvertTo-Json -Depth 12 -Compress)
    }
    if ($command -like 'compose port*') { return "127.0.0.1:$($script:ServicePorts[$args[2]])" }
    if ($command -like 'compose ps -q*') { if ($script:Services -contains $args[3]) { return $args[3] };return }
    if ($command -like 'inspect*') {
        $containers=@()
        foreach ($service in @($args | Select-Object -Skip 1)) {
            $containers+=@{ State=@{Running=$true;Health=@{Status='healthy'}};HostConfig=@{Memory=$script:Limits[$service]};Image="sha256:$service";Config=@{Hostname=$service;Labels=@{'com.docker.compose.project'='incidentlens-test';'com.docker.compose.service'=$service};Env=@('DEMO_API_URL=http://demo-api:8081','DEMO_WORKER_URL=http://demo-worker:8082','OTEL_SDK_DISABLED=true')};NetworkSettings=@{Networks=@{'incidentlens-test_default'=@{}}} }
        }
        return (ConvertTo-Json -InputObject $containers -Depth 12 -Compress)
    }
    throw "Unexpected fake Docker call: $command"
}
function Invoke-RestMethod {
    $script:Requests++
    return [pscustomobject]@{ instanceId=$(if ($script:Case -eq 'identity-mismatch') {'other'}else{'control-plane'});profile='core';workloadTarget='http://demo-api:8081';hostPorts=[pscustomobject]@{controlPlane=18080;demoApi=18081;demoWorker=18082;web=13000;prometheus=19090;grafana=13001} }
}
$previousHost=$env:DOCKER_HOST;$previousLabel=$env:PC_LABEL
try {
    $env:DOCKER_HOST=$null;$env:PC_LABEL='guard-test'
    foreach ($case in @('valid','remote-context','split-target','wrong-origin','identity-mismatch')) {
        $script:Case=$case;$script:Requests=0;$script:Calls=@()
        $origin=if($case -eq 'wrong-origin'){'http://127.0.0.1:8080'}else{'http://localhost:18080'}
        $failed=$false
        try { $config=Get-LocalExecution $origin }catch { $failed=$true; if($case -eq "valid") { Write-Host $_.Exception.Message; Write-Host $_.ScriptStackTrace } }
        if($case -eq 'valid') { if($failed -or $config.controlTarget -ne 'http://127.0.0.1:18080' -or $config.configurationHash.Length -ne 64) { throw 'Matched nondefault ports were rejected.' } }
        else { if(!$failed) { throw "$case was not blocked" };if($case -ne 'identity-mismatch' -and $script:Requests -ne 0) { throw "$case reached a remote/control request before rejection" } }
        if(@($script:Calls | Where-Object { $_ -match 'compose (up|run)|PUT|POST' }).Count) { throw 'Guard performed a write.' }
        Write-Host "PASS: $case"
    }
}finally { $env:DOCKER_HOST=$previousHost;$env:PC_LABEL=$previousLabel }
