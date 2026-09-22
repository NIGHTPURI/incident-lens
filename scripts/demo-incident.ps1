param(
    [ValidateSet('DOWNSTREAM_LATENCY','DATABASE_DEGRADATION','KAFKA_SLOWDOWN','CACHE_DEGRADATION')][string]$Scenario = 'DOWNSTREAM_LATENCY',
    [ValidateRange(0,2000)][int]$Parameter = 400,
    [ValidateRange(1,50)][int]$Vus = 5,
    [ValidateRange(5,300)][int]$DurationSeconds = 20
)
# The incident demo includes recovery so faults are not accidentally left active.
& "$PSScriptRoot/demo-compare.ps1" -Scenario $Scenario -Parameter $Parameter -Vus $Vus -DurationSeconds $DurationSeconds
