param([ValidateRange(1,100)][int]$Vus = 5, [ValidateRange(1,600)][int]$DurationSeconds = 20)
. "$PSScriptRoot/common.ps1"
Push-Location $script:ProjectRoot
try {
    $result = Invoke-Workload '' ('baseline-' + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()) 'BASELINE' $Vus $DurationSeconds
    $result | ConvertTo-Json -Depth 10
} finally { Pop-Location }
