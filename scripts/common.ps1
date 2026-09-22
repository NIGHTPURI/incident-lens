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
