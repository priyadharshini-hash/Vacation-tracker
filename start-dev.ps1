# Starts everything needed to run Numrah Leaves Tracker locally:
#   Docker Desktop -> database container -> migrations -> API (port 4000) -> client (port 5173)
# Usage (PowerShell, from the project folder):  .\start-dev.ps1
# Leave the two server windows open while you use the app; close them to stop.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dockerExe = "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe"
if (-not (Test-Path $dockerExe)) { $dockerExe = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe" }

function Test-Docker {
  $job = Start-Job { docker info 2>&1 | Out-Null; $LASTEXITCODE }
  $done = Wait-Job $job -Timeout 8
  $ok = $done -and ((Receive-Job $job) -eq 0)
  if (-not $done) { Stop-Job $job }
  Remove-Job $job -Force -ErrorAction SilentlyContinue
  return [bool]$ok
}

if (-not (Test-Docker)) {
  Write-Host 'Starting Docker Desktop...'
  # If Docker was force-closed earlier, Windows can leave unreadable socket files behind that make
  # Docker crash on start ("The file cannot be accessed by the system"). Moving those folders aside is safe.
  Get-Process | Where-Object { $_.Name -in 'Docker Desktop', 'com.docker.backend' } | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
  $stamp = Get-Date -Format 'MMddHHmmss'
  foreach ($dir in @("$env:LOCALAPPDATA\docker-secrets-engine", "$env:LOCALAPPDATA\Docker\run")) {
    if (Test-Path -LiteralPath $dir) {
      Rename-Item -LiteralPath $dir -NewName ((Split-Path $dir -Leaf) + ".stale-$stamp") -ErrorAction SilentlyContinue
    }
  }
  Start-Process $dockerExe
  $deadline = (Get-Date).AddSeconds(150)
  while (-not (Test-Docker)) {
    if ((Get-Date) -gt $deadline) { throw 'Docker did not start. Open Docker Desktop manually, wait for "Engine running", then run this script again.' }
    Start-Sleep -Seconds 3
  }
}

Write-Host 'Starting database...'
docker start vacation-tracker-db | Out-Null
Start-Sleep -Seconds 4

Write-Host 'Running migrations...'
Push-Location "$root\server"
npm run migrate
Pop-Location

Write-Host 'Starting API and client in new windows...'
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root\server'; npm run dev"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root\client'; npm run dev"

Write-Host ''
Write-Host 'Ready in a few seconds:  http://localhost:5173'
