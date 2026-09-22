param(
    [ValidateSet('DOWNSTREAM_LATENCY','DATABASE_DEGRADATION','KAFKA_SLOWDOWN','CACHE_DEGRADATION')][string]$Scenario = 'DOWNSTREAM_LATENCY',
    [ValidateRange(0,2000)][int]$Parameter = 400,
    [ValidateRange(1,50)][int]$Vus = 5,
    [ValidateRange(5,300)][int]$DurationSeconds = 20,
    [ValidateRange(0,120)][int]$RecoverySeconds = 5,
    [ValidateRange(5,900)][int]$IdleTimeoutSeconds = 300,
    [string]$SessionId,
    [string]$ExperimentId,
    [string]$ControlUrl = 'http://localhost:8080'
)
. "$PSScriptRoot/common.ps1"
$script:ControlUrl = $ControlUrl.TrimEnd('/')
if ([bool]$SessionId -ne [bool]$ExperimentId) { throw 'Supply both SessionId and ExperimentId, or neither.' }
$faultMayBeActive = $false
$runMayBeActive = $false
Push-Location $script:ProjectRoot
try {
    if ($SessionId) {
        $experiment = Invoke-Control GET "/api/experiments/$ExperimentId"
        if ($experiment.sessionId -ne $SessionId) { throw 'Experiment does not belong to the specified session.' }
        if ($experiment.status -ne 'CREATED') { throw 'Only a fresh CREATED experiment can be run. Create a new session after a completed or interrupted run.' }
        $Vus = $experiment.workload.vus
        $DurationSeconds = $experiment.workload.durationSeconds
    }
    Wait-LabIdle -TimeoutSeconds $IdleTimeoutSeconds
    if (!$SessionId) {
        $session = Invoke-Control POST '/api/sessions' @{ name = "$Scenario $(Get-Date -Format s)"; scenario = $Scenario }
        $SessionId = $session.id
        $experiment = Invoke-Control POST "/api/sessions/$SessionId/experiments" @{ vus = $Vus; durationSeconds = $DurationSeconds }
        $ExperimentId = $experiment.id
    }
    $faultMayBeActive = $true
    Invoke-Control PUT "/api/sessions/$SessionId/fault" @{ enabled = $true; parameter = $Parameter } | Out-Null
    $runMayBeActive = $true
    Invoke-Control POST "/api/experiments/$ExperimentId/runs" @{ phase = 'BEFORE' } | Out-Null
    $before = Invoke-Workload $SessionId $ExperimentId 'BEFORE' $Vus $DurationSeconds
    Invoke-Control POST "/api/experiments/$ExperimentId/runs/BEFORE/complete" $before | Out-Null
    $runMayBeActive = $false
    Invoke-Control POST "/api/sessions/$SessionId/rca" | Out-Null
    Invoke-Control PUT "/api/sessions/$SessionId/fault" @{ enabled = $false; parameter = 0 } | Out-Null
    $faultMayBeActive = $false
    # Recovery is a declared part of the protocol, not a claim that Kafka has drained.
    if ($RecoverySeconds -gt 0) { Start-Sleep -Seconds $RecoverySeconds }
    $runMayBeActive = $true
    Invoke-Control POST "/api/experiments/$ExperimentId/runs" @{ phase = 'AFTER' } | Out-Null
    $after = Invoke-Workload $SessionId $ExperimentId 'AFTER' $Vus $DurationSeconds
    Invoke-Control POST "/api/experiments/$ExperimentId/runs/AFTER/complete" $after | Out-Null
    $runMayBeActive = $false
    Write-Host "Session: $SessionId | Experiment: $ExperimentId"
    Write-Host "Open $(Get-WebUrl) and select the session. Raw measured summaries are in artifacts/."
    Invoke-Control GET "/api/experiments/$ExperimentId" | ConvertTo-Json -Depth 20
} finally {
    if (($faultMayBeActive -or $runMayBeActive) -and $SessionId) {
        try { Invoke-Control PUT "/api/sessions/$SessionId/fault" @{ enabled = $false; parameter = 0 } | Out-Null }
        catch { Write-Warning "Could not disable fault: retry PUT /api/sessions/$SessionId/fault with enabled=false." }
    }
    Pop-Location
}
