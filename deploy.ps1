$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Retry-Command {
  param(
    [int]$Attempts = 5,
    [int]$DelaySeconds = 3,
    [scriptblock]$Command
  )
  for ($i = 1; $i -le $Attempts; $i += 1) {
    & $Command
    if ($LASTEXITCODE -eq 0) { return $true }
    Write-Host "attempt $i/$Attempts failed, retrying in $DelaySeconds seconds..."
    Start-Sleep -Seconds $DelaySeconds
  }
  return $false
}

Write-Host '1/4 git add...'
git add -A
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$changes = git status --porcelain
if ($changes) {
  Write-Host '2/4 git commit...'
  git commit -m 'auto: deploy latest changes'
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
  Write-Host '2/4 no changes to commit'
}

Write-Host '3/4 git push (with retry)...'
$pushed = Retry-Command -Attempts 5 -DelaySeconds 3 -Command { git push origin master }
if (-not $pushed) {
  Write-Host ''
  Write-Host 'push still failed. Try switching to SSH:'
  Write-Host '  git remote set-url origin git@github.com:xiaotangtang2/lian-suan-pro.git'
  Write-Host 'or check your network/proxy.'
  exit 1
}

Write-Host '4/4 deploy ai-proxy (with retry)...'
if (Test-Path '.\supabase.exe') {
  $deployCommand = { .\supabase.exe functions deploy ai-proxy --project-ref itzgznnhacwepuxnnuii }
} else {
  $deployCommand = { supabase functions deploy ai-proxy --project-ref itzgznnhacwepuxnnuii }
}
$deployed = Retry-Command -Attempts 3 -DelaySeconds 3 -Command $deployCommand
if (-not $deployed) {
  Write-Host 'ai-proxy deploy still failed. Check Supabase CLI login and network.'
  exit 1
}

Write-Host 'All done.'
