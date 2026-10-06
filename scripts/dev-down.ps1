. "$PSScriptRoot/common.ps1"
Push-Location $script:ProjectRoot
try { Invoke-Checked docker @('compose', '--profile', 'observability', '--profile', 'loadtest', 'down') }
finally { Pop-Location }
# Named volumes intentionally survive. No data reset is needed to stop/restart.
