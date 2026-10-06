Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:ProjectRoot = Split-Path $PSScriptRoot -Parent

function Invoke-Checked {
    param([Parameter(Mandatory)][string]$Command, [string[]]$Arguments = @())
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command failed with exit code $LASTEXITCODE" }
}

function Invoke-Control {
    param([string]$Method, [string]$Path, $Body = $null)
    $parameters = @{ Method = $Method; Uri = "$script:ControlUrl$Path"; TimeoutSec = 60 }
    if ($null -ne $Body) {
        $parameters.ContentType = 'application/json'
        $parameters.Body = ConvertTo-Json -InputObject $Body -Depth 10 -Compress
    }
    Invoke-RestMethod @parameters
}

function Get-ServiceUrl {
    param([string]$Service, [int]$InternalPort)
    $binding = & docker compose port $Service $InternalPort 2>$null
    if ($LASTEXITCODE -ne 0 -or "$binding" -notmatch '^127\.0\.0\.1:(\d+)$') { throw "No loopback binding found for $Service. Start this Compose stack first." }
    return "http://127.0.0.1:$($Matches[1])"
}

function Get-WebUrl {
    try {
        $binding = & docker compose port web 8080 2>$null
        if ($LASTEXITCODE -eq 0 -and "$binding" -match ':(\d+)$') { return "http://localhost:$($Matches[1])" }
    } catch { }
    return 'the dashboard port configured by WEB_PORT in .env'
}

function Wait-LabIdle {
    param([ValidateRange(5,900)][int]$TimeoutSeconds = 300)
    $timer = [Diagnostics.Stopwatch]::StartNew()
    $consecutive = 0
    Write-Host 'Waiting for three idle observations: outbox pending=0 and Kafka lag=0.'
    while ($timer.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
        $remaining = [Math]::Max(1, [Math]::Min(10, [Math]::Ceiling($TimeoutSeconds - $timer.Elapsed.TotalSeconds)))
        $overview = Invoke-RestMethod -Method GET -Uri "$script:ControlUrl/api/overview" -TimeoutSec $remaining
        if (@($overview.services | Where-Object { $_.status -ne 'UP' }).Count -gt 0) {
            throw 'The lab reports an unavailable service; restore service health before comparing workloads.'
        }
        foreach ($service in @('demo-api','demo-worker')) {
            if (@($overview.services | Where-Object { $_.name -eq $service -and $_.status -eq 'UP' }).Count -ne 1) {
                throw "Missing healthy $service telemetry; refusing an unverified experiment baseline."
            }
        }
        $pendingProperty = $overview.metrics.PSObject.Properties['outboxPending']
        $lagProperty = $overview.metrics.PSObject.Properties['kafkaLag']
        if ($null -eq $pendingProperty -or $null -eq $lagProperty -or $null -eq $pendingProperty.Value -or $null -eq $lagProperty.Value) {
            throw 'Outbox or Kafka lag is unavailable; refusing to treat missing telemetry as an idle lab.'
        }
        $pending = [double]$pendingProperty.Value
        $lag = [double]$lagProperty.Value
        if ([double]::IsNaN($pending) -or [double]::IsInfinity($pending) -or $pending -lt 0 -or [double]::IsNaN($lag) -or [double]::IsInfinity($lag) -or $lag -lt 0) {
            throw 'Outbox or Kafka lag is invalid; refusing an unverified experiment baseline.'
        }
        if ($pending -eq 0 -and $lag -eq 0) { $consecutive++ } else { $consecutive = 0 }
        if ($consecutive -eq 3) { return }
        Write-Host "Preflight: outbox=$pending, Kafka lag=$lag, idle observations=$consecutive/3."
        Start-Sleep -Seconds 2
    }
    throw "The lab did not drain within $TimeoutSeconds seconds. No new fault/run was started. Inspect outbox/consumer health or increase IdleTimeoutSeconds."
}

function Invoke-Workload {
    param([string]$SessionId, [string]$ExperimentId, [string]$Phase, [int]$Vus, [int]$DurationSeconds)
    $fileName = "$ExperimentId-$Phase.json"
    New-Item -ItemType Directory -Force -Path "$script:ProjectRoot/artifacts" | Out-Null
    Invoke-Checked docker @('compose', 'run', '--rm', '-e', "SESSION_ID=$SessionId", '-e', "RUN_ID=$ExperimentId", '-e', "PHASE=$Phase", '-e', "VUS=$Vus", '-e', "DURATION_SECONDS=$DurationSeconds", '-e', "SUMMARY_PATH=/results/$fileName", 'k6', 'run', '/scripts/baseline.js') | Out-Host
    $summary = Get-Content -Raw "$script:ProjectRoot/artifacts/$fileName" | ConvertFrom-Json
    if ($summary.requestCount -lt 1) { throw 'The workload produced no requests; refusing an empty benchmark.' }
    return $summary
}

function Get-LocalExecution {
    param([string]$RequestedControlUrl = $env:CONTROL_URL)
    function Fail-Target([string]$Reason) { throw "Local target check: $Reason This check performed no session, fault or workload writes." }
    $endpoint = $env:DOCKER_HOST
    if (!$endpoint) { $context = (& docker context show); $endpoint = (& docker context inspect $context --format '{{.Endpoints.docker.Host}}') }
    if ($LASTEXITCODE -ne 0 -or $endpoint -notmatch '^(unix|npipe):///') { Fail-Target 'Remote Docker contexts are unsupported.' }
    $config = (Invoke-Checked docker @('compose','--profile','observability','--profile','loadtest','config','--format','json')) | ConvertFrom-Json
    $cpEnv = $config.services.'control-plane'.environment
    if ($cpEnv.DEMO_API_URL -ne 'http://demo-api:8081' -or $cpEnv.DEMO_WORKER_URL -ne 'http://demo-worker:8082' -or $config.services.k6.environment.BASE_URL -ne 'http://demo-api:8081') { Fail-Target 'Control and k6 must use the canonical demo services.' }
    if (@($config.services.k6.networks.PSObject.Properties.Name).Count -ne 1 -or @($config.services.k6.networks.PSObject.Properties.Name)[0] -ne 'default' -or ($config.networks.default.PSObject.Properties['external'] -and $config.networks.default.external)) { Fail-Target 'Only the local Compose default network is supported.' }
    $url = Get-ServiceUrl 'control-plane' 8080
    if ($RequestedControlUrl) {
        $requested = $RequestedControlUrl.TrimEnd('/')
        $localAlias = $url.Replace('127.0.0.1','localhost')
        if ($requested -ne $url -and $requested -ne $localAlias) { Fail-Target 'CONTROL_URL must match this Compose binding; changing only CONTROL_URL cannot retarget k6.' }
    }
    $ids = @()
    foreach ($service in @('mysql','redis','kafka','control-plane','demo-api','demo-worker','web')) {
        $serviceIds = @(Invoke-Checked docker @('compose','ps','-q',$service))
        if ($serviceIds.Count -ne 1 -or !$serviceIds[0]) { Fail-Target "Exactly one running $service container is required." }
        $ids += $serviceIds[0]
    }
    $containers = (Invoke-Checked docker (@('inspect') + $ids)) | ConvertFrom-Json
    $network = $null
    foreach ($container in $containers) {
        $service = $container.Config.Labels.'com.docker.compose.service'
        if (!$container.State.Running -or $container.State.Health.Status -ne 'healthy' -or $container.Config.Labels.'com.docker.compose.project' -ne $config.name -or $container.HostConfig.Memory -ne $config.services.PSObject.Properties[$service].Value.mem_limit) { Fail-Target 'Unhealthy, foreign or stale configuration; reapply the chosen .env first.' }
        $names = @($container.NetworkSettings.Networks.PSObject.Properties.Name)
        if ($names.Count -ne 1 -or ($network -and $network -ne $names[0])) { Fail-Target 'Services must share one Compose network.' }
        $network = $names[0]
    }
    $cp = $containers | Where-Object { $_.Config.Labels.'com.docker.compose.service' -eq 'control-plane' }
    if ($cp.Config.Env -notcontains 'DEMO_API_URL=http://demo-api:8081' -or $cp.Config.Env -notcontains 'DEMO_WORKER_URL=http://demo-worker:8082') { Fail-Target 'Running control-plane points to other services.' }
    $profile = 'core'
    if ($cp.Config.Env -contains 'OTEL_SDK_DISABLED=false') { $profile = 'observability' }
    foreach ($service in @('prometheus','grafana','loki','tempo','otel-collector')) {
        $extraIds = @(Invoke-Checked docker @('compose','ps','-q',$service))
        if ($extraIds.Count -eq 0 -and $profile -eq 'core') { continue }
        if ($extraIds.Count -ne 1 -or !$extraIds[0]) { Fail-Target "Observability service missing or ambiguous: $service" }
        $extra = ((Invoke-Checked docker @('inspect',$extraIds[0])) | ConvertFrom-Json)[0]
        $unhealthy = $extra.State.PSObject.Properties['Health'] -and $extra.State.Health.Status -ne 'healthy'
        if (!$extra.State.Running -or $unhealthy -or $extra.Config.Labels.'com.docker.compose.project' -ne $config.name -or $extra.HostConfig.Memory -ne $config.services.PSObject.Properties[$service].Value.mem_limit) { Fail-Target "Observability service unavailable/stale: $service" }
        $containers += $extra
    }
    $ports = [ordered]@{ controlPlane = [int]$config.services.'control-plane'.ports[0].published; demoApi = [int]$config.services.'demo-api'.ports[0].published; demoWorker = [int]$config.services.'demo-worker'.ports[0].published; web = [int]$config.services.web.ports[0].published; prometheus = [int]$config.services.prometheus.ports[0].published; grafana = [int]$config.services.grafana.ports[0].published }
    foreach ($spec in @(@('control-plane',8080,'controlPlane'),@('demo-api',8081,'demoApi'),@('demo-worker',8082,'demoWorker'),@('web',8080,'web'),@('prometheus',9090,'prometheus'),@('grafana',3000,'grafana'))) {
        if (!($containers | Where-Object { $_.Config.Labels.'com.docker.compose.service' -eq $spec[0] })) { continue }
        if ((Get-ServiceUrl $spec[0] $spec[1]) -ne "http://127.0.0.1:$($ports[$spec[2]])") { Fail-Target 'Running host ports differ from the selected Compose configuration.' }
    }
    $otel = if ($profile -eq 'observability') { 'false' } else { 'true' }
    foreach ($app in @('control-plane','demo-api','demo-worker')) {
        $container = $containers | Where-Object { $_.Config.Labels.'com.docker.compose.service' -eq $app }
        if ($container.Config.Env -notcontains "OTEL_SDK_DISABLED=$otel") { Fail-Target 'App telemetry profiles differ; reapply the profile.' }
    }
    $runtime = Invoke-RestMethod "$url/api/runtime" -TimeoutSec 10
    if ($runtime.instanceId -ne $cp.Config.Hostname -or $runtime.profile -ne $profile -or $runtime.workloadTarget -ne 'http://demo-api:8081') { Fail-Target 'Responding control-plane identity differs; update the matching local stack first.' }
    foreach ($key in $ports.Keys) { if ($runtime.hostPorts.PSObject.Properties[$key].Value -ne $ports[$key]) { Fail-Target 'Declared ports differ from Compose; reapply .env.' } }
    $memory = [ordered]@{}; $images = [ordered]@{}
    foreach ($container in ($containers | Sort-Object { $_.Config.Labels.'com.docker.compose.service' })) {
        $name = $container.Config.Labels.'com.docker.compose.service'
        $memory[$name] = [long][Math]::Floor($container.HostConfig.Memory / 1MB); $images[$name] = $container.Image
    }
    $sortedPorts = [ordered]@{}
    foreach ($key in ($ports.Keys | Sort-Object)) { $sortedPorts[$key] = $ports[$key] }
    $fingerprint = [ordered]@{ images=$images; memory=$memory; ports=$sortedPorts; profile=$profile } | ConvertTo-Json -Depth 10 -Compress
    $sha = [Security.Cryptography.SHA256]::Create()
    try { $hash = ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($fingerprint)))).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose() }
    $label = $env:PC_LABEL
    if (!$label) { $label = '' }
    if ($label.Length -gt 120) { Fail-Target 'PC_LABEL must be at most 120 characters.' }
    return [ordered]@{ configurationHash=$hash; labInstanceId=$cp.Config.Hostname; profile=$profile; pcLabel=$label; controlTarget=$url; workloadTarget='http://demo-api:8081'; hostPorts=$ports; memoryLimitsMiB=$memory }
}
