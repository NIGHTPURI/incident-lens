param([ValidateRange(1,50)][int]$Vus = 2, [ValidateRange(5,300)][int]$DurationSeconds = 10)
. "$PSScriptRoot/common.ps1"
Push-Location $script:ProjectRoot
try {
    $configuration = Get-LocalExecution
    New-Item -ItemType Directory -Force artifacts | Out-Null
    $runId = 'baseline-' + [guid]::NewGuid().ToString('N')
    $configuration | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 "artifacts/$runId.configuration.json"
    $result = Invoke-Workload '' $runId 'BASELINE' $Vus $DurationSeconds
    $result | ConvertTo-Json -Depth 10
} finally { Pop-Location }
