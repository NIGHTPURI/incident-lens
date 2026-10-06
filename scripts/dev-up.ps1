param([switch]$Observability)
. "$PSScriptRoot/common.ps1"
Push-Location $script:ProjectRoot
$previousOtel = $env:OTEL_SDK_DISABLED
$previousProfile = $env:INCIDENTLENS_PROFILE
try {
    if (!(Test-Path '.env')) { Copy-Item '.env.example' '.env' }
    New-Item -ItemType Directory -Force artifacts | Out-Null
    if ($Observability) {
        $env:OTEL_SDK_DISABLED = 'false'
        $env:INCIDENTLENS_PROFILE = 'observability'
        Invoke-Checked docker @('compose', '--profile', 'observability', 'up', '--build', '-d', '--wait', '--wait-timeout', '600')
    } else {
        $env:OTEL_SDK_DISABLED = 'true'
        $env:INCIDENTLENS_PROFILE = 'core'
        Invoke-Checked docker @('compose', 'up', '--build', '-d', '--wait', '--wait-timeout', '600')
    }
    Write-Host "IncidentLens: $(Get-WebUrl) | API docs: $(Get-ServiceUrl control-plane 8080)/swagger-ui/index.html"
    if ($Observability) {
        $grafanaBinding = & docker compose port grafana 3000
        Write-Host "Grafana: http://localhost:$($grafanaBinding.Split(':')[-1]) (admin / GRAFANA_ADMIN_PASSWORD in .env)"
    }
} finally {
    $env:OTEL_SDK_DISABLED = $previousOtel
    $env:INCIDENTLENS_PROFILE = $previousProfile
    Pop-Location
}
