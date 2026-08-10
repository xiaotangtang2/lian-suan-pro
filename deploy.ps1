$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

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

Write-Host '3/4 git push...'
git push origin master
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '4/4 deploy ai-proxy...'
if (Test-Path '.\supabase.exe') {
  .\supabase.exe functions deploy ai-proxy --project-ref itzgznnhacwepuxnnuii
} else {
  supabase functions deploy ai-proxy --project-ref itzgznnhacwepuxnnuii
}
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'All done.'
