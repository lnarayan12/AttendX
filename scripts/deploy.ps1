##############################################################
# AttendX - Deploy Frontend to GitHub Pages
# Usage: powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1
# Run from the project root directory
##############################################################

$Remote   = "https://github.com/lnarayan12/AttendX.git"
$FrontDir = Join-Path $PSScriptRoot "..\frontend"
$BuildDir = Join-Path $FrontDir "build"

Write-Host "`n== Building frontend ==" -ForegroundColor Cyan
Push-Location $FrontDir
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed!"; Pop-Location; exit 1 }
Pop-Location

Write-Host "`n== Deploying to GitHub Pages ==" -ForegroundColor Cyan
$TempGit = Join-Path $BuildDir ".git"
if (Test-Path $TempGit) { Remove-Item $TempGit -Recurse -Force }

git -C $BuildDir init
git -C $BuildDir checkout -b gh-pages
git -C $BuildDir add -A
git -C $BuildDir commit -m "Deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git -C $BuildDir remote add origin $Remote
git -C $BuildDir push --force origin gh-pages

Remove-Item $TempGit -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "`n✅ Done! Live at: https://lnarayan12.github.io/AttendX`n" -ForegroundColor Green
