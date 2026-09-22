. "$PSScriptRoot/common.ps1"
Push-Location $script:ProjectRoot
try { Invoke-Checked docker @('compose', '--profile', 'observability', '--profile', 'loadtest', 'down') }
finally { Pop-Location }
# Named volumes intentionally survive. Explicitly run docker compose down -v to reset local data.
