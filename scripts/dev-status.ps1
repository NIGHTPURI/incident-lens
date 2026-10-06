. "$PSScriptRoot/common.ps1"
Push-Location $script:ProjectRoot
try {
    Invoke-Checked docker @('compose','ps')
    foreach ($spec in @(@('web',8080,'/'),@('control-plane',8080,'/actuator/health'),@('demo-api',8081,'/actuator/health'),@('demo-worker',8082,'/actuator/health'))) {
        $url = Get-ServiceUrl $spec[0] $spec[1]
        Write-Host "$($spec[0]): $url"
        Invoke-WebRequest -UseBasicParsing -Uri "$url$($spec[2])" -TimeoutSec 10 | Out-Null
    }
} finally { Pop-Location }
