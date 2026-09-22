param([switch]$Integration)
. "$PSScriptRoot/common.ps1"
$gradleCommand = if ($env:OS -eq 'Windows_NT') { './gradlew.bat' } else { './gradlew' }
$npmCommand = if ($env:OS -eq 'Windows_NT') { 'npm.cmd' } else { 'npm' }
Push-Location $script:ProjectRoot
try {
    $required = @('README.md','ARCHITECTURE.md','SESSION_STATE.md','docker-compose.yml','.env.example','gradle/wrapper/gradle-wrapper.jar','apps/web/package-lock.json','docs/INTERVIEW_GUIDE.md','docs/PROJECT_STORY.md','docs/AI_ENGINEERING.md','docs/AWS_DEPLOYMENT.md')
    foreach ($file in $required) { if (!(Test-Path $file)) { throw "Missing required file: $file" } }
    & "$PSScriptRoot/tests/compare-protocol.tests.ps1"
    Invoke-Checked $gradleCommand @('build', '--no-daemon')
    if ($Integration) { Invoke-Checked $gradleCommand @('integrationTest', '--no-daemon') }
    Push-Location apps/web
    try {
        Invoke-Checked $npmCommand @('ci')
        Invoke-Checked $npmCommand @('test', '--', '--run')
        Invoke-Checked $npmCommand @('run', 'build')
    } finally { Pop-Location }
    Invoke-Checked docker @('compose', '--profile', 'observability', '--profile', 'loadtest', 'config', '--quiet')
    Write-Host 'Verification passed. Integration tests run only with -Integration and require a working Docker daemon.'
} finally { Pop-Location }
